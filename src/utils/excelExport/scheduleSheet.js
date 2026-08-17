import { format, addDays } from "date-fns";
import { utcToZonedDateObject, expandShiftDays } from "@/utils/timeHandling";
import {
    C_NAVY, C_WHITE, C_ROW_EVEN, C_ROW_ALT, C_NAME_COL,
    thinSide, medSide, solidFill,
    addHeader, addFooter, downloadWorkbook,
} from "./helpers";

const HALIFAX_TZ        = "America/Halifax";
const INCLUDED_STATUSES = new Set(["scheduled", "completed", "in_progress"]);

// Shift-type colours are specific to this sheet (not part of the shared
// payroll palette in helpers.js), so they stay local to this file.
const C_OVERNIGHT = "FFB8D8F8"; // light blue — overnight shift cells
const C_DAY       = "FFFFD3A0"; // warm orange — day shift cells

// ============================================================
// SECTION: buildScheduleSheet
// ------------------------------------------------------------
// Purpose:
//   Adds a roster-style "Schedule" worksheet — one row per
//   caregiver, one column per day in the pay period — to an
//   ALREADY-CREATED workbook.
//
// homeId: when provided, only shifts belonging to that home are
//         included. When null/empty, all shifts in the period are
//         shown (All Homes).
// payYear / periodNumber: the period's identity as resolved by the
//         backend (GET /api/hours/pay-periods) — not recomputed here.
//
// Relationship:
//   Called both by exportScheduleToExcel (standalone, single-sheet
//   download — used by the Scheduling calendar page's "Export
//   Schedule" button) and by exportPayrollWorkbook (combined 3-tab
//   payroll package) in payrollWorkbook.js.
// ============================================================

/**
 * Builds the "Schedule" worksheet inside the given workbook.
 *
 * @param {import("exceljs").Workbook} wb - Workbook to add the sheet to.
 * @param {Object}   params
 * @param {string}   [params.homeName]
 * @param {string}   [params.homeId]
 * @param {Date}     params.payPeriodStart
 * @param {Date}     params.payPeriodEnd
 * @param {number}   params.payYear
 * @param {number}   params.periodNumber
 * @param {Object[]} params.shifts
 * @param {string}   [params.logoUrl]     - Fetched and embedded at the top of the sheet.
 * @returns {Promise<import("exceljs").Worksheet>} The worksheet that was added.
 */
export async function buildScheduleSheet(wb, { homeName, homeId, payPeriodStart, payPeriodEnd, payYear, periodNumber, shifts, logoUrl }) {
    // ── Date list for the period ───────────────────────────────────────────────
    const dates = [];
    let cursor = new Date(payPeriodStart);
    while (cursor <= payPeriodEnd) {
        dates.push(new Date(cursor));
        cursor = addDays(cursor, 1);
    }
    const totalCols = dates.length + 1; // name col + date cols

    // ── Filter shifts ──────────────────────────────────────────────────────────
    const filtered = (shifts || []).filter((s) => {
        if (!INCLUDED_STATUSES.has(s.status)) return false;
        if (homeId) return (s.home?._id || s.home?.id) === homeId;
        return true;
    });

    // ── Build caregiver → shift maps ───────────────────────────────────────────
    const caregiverNames = {};
    const shiftMap       = {}; // [cgId][dateStr] → [{ timeRange, isOvernight }, …]

    filtered.forEach((shift) => {
        const cgId = shift.caregiver?._id || shift.caregiver?.id;
        if (!cgId) return;

        caregiverNames[cgId] = [shift.caregiver?.firstName, shift.caregiver?.lastName]
            .filter(Boolean).join(" ") || "Unknown";

        const startLocal = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
        const endLocal   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
        const fullRange  = `${format(startLocal, "H:mm")}–${format(endLocal, "H:mm")}`;

        // A multi-day shift occupies every day it spans. Show the full range on a
        // single-day shift; on a span, use arrows so each day's cell reads clearly.
        expandShiftDays(shift.startTime, shift.endTime, HALIFAX_TZ).forEach((seg) => {
            const multiDay    = seg.spanDays > 1;
            const isOvernight = multiDay;
            const timeRange   = !multiDay
                ? fullRange
                : seg.isFirst ? `${format(startLocal, "H:mm")}→`
                : seg.isLast  ? `→${format(endLocal, "H:mm")}`
                :               "24h";

            if (!shiftMap[cgId]) shiftMap[cgId] = {};
            if (!shiftMap[cgId][seg.dateStr]) shiftMap[cgId][seg.dateStr] = [];
            shiftMap[cgId][seg.dateStr].push({ timeRange, isOvernight });
        });
    });

    const sortedCgIds = Object.keys(caregiverNames).sort((a, b) =>
        caregiverNames[a].localeCompare(caregiverNames[b])
    );

    // ── Worksheet ──────────────────────────────────────────────────────────────
    const ws = wb.addWorksheet("Schedule", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 },
    });

    ws.columns = [
        { width: 24 },
        ...dates.map(() => ({ width: 13 })),
    ];

    // ── Header section (title + info card with logo) ───────────────────────────
    await addHeader(ws, wb, {
        title: `Schedule — ${homeName || "All Homes"}`,
        homeName, payYear, periodNumber,
        periodStart: payPeriodStart, periodEnd: payPeriodEnd,
        logoUrl, totalCols,
    });

    ws.addRow([]).height = 10;

    // ═══════════════════════════════════════════════════════════════════════════
    // LEGEND
    // ═══════════════════════════════════════════════════════════════════════════
    const legendRow = ws.addRow(["Color key:", "  Day Shift  ", "", "  Overnight Shift  "]);
    legendRow.height = 20;

    legendRow.getCell(1).font      = { bold: true, size: 10, color: { argb: C_NAVY } };
    legendRow.getCell(1).alignment = { vertical: "middle" };

    const styleChip = (cell, argb) => {
        cell.fill      = solidFill(argb);
        cell.font      = { bold: true, size: 10, color: { argb: C_NAVY } };
        cell.border    = { top: thinSide(), left: thinSide(), bottom: thinSide(), right: thinSide() };
        cell.alignment = { horizontal: "center", vertical: "middle" };
    };
    styleChip(legendRow.getCell(2), C_DAY);
    styleChip(legendRow.getCell(4), C_OVERNIGHT);

    ws.addRow([]).height = 8;

    // ═══════════════════════════════════════════════════════════════════════════
    // TABLE HEADER
    // ═══════════════════════════════════════════════════════════════════════════
    const headerRow = ws.addRow([
        "Caregiver Name",
        ...dates.map((d) => `${format(d, "EEE")}\n${format(d, "MMM d")}`),
    ]);
    headerRow.height = 42;

    headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum > totalCols) return;
        cell.font      = { bold: true, size: 11, color: { argb: C_WHITE }, name: "Calibri" };
        cell.fill      = solidFill(C_NAVY);
        cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle", wrapText: true, indent: colNum === 1 ? 1 : 0 };
        cell.border    = {
            top:    medSide(),
            bottom: medSide(),
            left:   colNum === 1         ? medSide() : thinSide(),
            right:  colNum === totalCols ? medSide() : thinSide(),
        };
    });

    // Freeze the header row so date labels stay visible when scrolling down
    ws.views = [{ state: "frozen", ySplit: headerRow.number }];

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA ROWS
    // ═══════════════════════════════════════════════════════════════════════════
    if (sortedCgIds.length === 0) {
        const r = ws.addRow(["No shifts found for this period."]);
        r.getCell(1).font = { italic: true, size: 11, color: { argb: "FF6B7280" } };
    } else {
        sortedCgIds.forEach((cgId, idx) => {
            const isLastRow = idx === sortedCgIds.length - 1;
            const rowBg     = idx % 2 === 1 ? C_ROW_ALT : C_ROW_EVEN;

            const row = ws.addRow([
                caregiverNames[cgId],
                ...dates.map((d) => {
                    const entries = shiftMap[cgId]?.[format(d, "yyyy-MM-dd")];
                    return entries ? entries.map((e) => e.timeRange).join(", ") : "";
                }),
            ]);
            row.height = 22;

            row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                if (colNum > totalCols) return;

                cell.alignment = {
                    horizontal: colNum === 1 ? "left" : "center",
                    vertical:   "middle",
                    indent:     colNum === 1 ? 1 : 0,
                };
                cell.border = {
                    top:    thinSide(),
                    bottom: isLastRow ? medSide() : thinSide(),
                    left:   colNum === 1         ? medSide() : thinSide(),
                    right:  colNum === totalCols ? medSide() : thinSide(),
                };

                if (colNum === 1) {
                    cell.fill = solidFill(C_NAME_COL);
                    cell.font = { bold: true, size: 11, color: { argb: C_NAVY }, name: "Calibri" };
                } else {
                    const dateIdx = colNum - 2;
                    const entries = shiftMap[cgId]?.[format(dates[dateIdx], "yyyy-MM-dd")];
                    let   bgColor = rowBg;
                    if (entries?.length > 0) {
                        bgColor = entries.some((e) => e.isOvernight) ? C_OVERNIGHT : C_DAY;
                    }
                    cell.fill = solidFill(bgColor);
                    cell.font = { size: 10, color: { argb: C_NAVY }, name: "Calibri" };
                }
            });
        });
    }

    addFooter(ws, totalCols);
    return ws;
}


// ============================================================
// SECTION: exportScheduleToExcel
// ------------------------------------------------------------
// Purpose:
//   Standalone single-sheet download — builds its own workbook
//   around buildScheduleSheet and triggers the browser download.
//   This is what the Scheduling calendar page's "Export Schedule"
//   button calls; it stays unlocked (no lockSheet call) exactly as
//   before. The combined payroll package uses buildScheduleSheet
//   directly and locks all three tabs — see payrollWorkbook.js.
// ============================================================

/**
 * Exports a roster-style Excel schedule for a 14-day pay period.
 * See buildScheduleSheet for the param shapes.
 */
export async function exportScheduleToExcel(params) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "NVCH Admin";
    wb.created = new Date();

    await buildScheduleSheet(wb, params);
    await downloadWorkbook(wb, `schedule_${format(params.payPeriodStart, "yyyy-MM-dd")}_to_${format(params.payPeriodEnd, "yyyy-MM-dd")}.xlsx`);
}
