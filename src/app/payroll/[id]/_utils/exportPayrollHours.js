import {
    C_NAVY, C_WHITE, C_ROW_EVEN, C_ROW_ALT, C_NAME_COL, C_TOTALS,
    thinSide, medSide, solidFill,
    addHeader, addFooter, lockSheet, downloadWorkbook,
} from "./excelHelpers";
import { buildNoteItems, formatNoteText } from "../../_components/tableHelpers";

// ============================================================
// SECTION: exportPayrollHoursToExcel
// ------------------------------------------------------------
// Purpose:
//   Generates the "Payroll Hours" Excel file — one row per caregiver
//   with a dynamic column for each calendar day in the pay period,
//   plus a Regular summary column and a Total column.
//
// Columns:
//   Staff Name | <M/D> | … | <M/D> | Regular | Total | Notes
//   (day columns are derived from staff[0].daily)
//
// API field mapping:
//   Day columns ← daily[n].hours  (requires { detail: "daily" } query param)
//   Regular     ← hours.regular
//   Total       ← totalHours
//
// Relationship:
//   Called from PayrollDetailPage (payroll/[id]/page.js) when the
//   user clicks "Export Payroll Hour" on the Daily tab.
//   Requires coverSheet.staff with .daily arrays populated — the
//   cover-sheet query must have been made with { detail: "daily" }.
//
// Flow:
//   Derive day list from staff[0].daily
//        ↓
//   Build workbook → title + info card (logo) → dynamic column headers
//        ↓
//   Data rows (one per caregiver, active day cells highlighted)
//        ↓
//   Totals row → footer → lock sheet (NVCH_READONLY) → browser download
// ============================================================

/**
 * Exports the payroll daily-hours breakdown as a read-only Excel file.
 *
 * @param {string}   params.homeName      - Home display name.
 * @param {number}   params.payYear
 * @param {number}   params.periodNumber
 * @param {string}   params.periodStart   - ISO timestamp from coverSheet.payPeriod.
 * @param {string}   params.periodEnd     - ISO timestamp from coverSheet.payPeriod.
 * @param {Object[]} params.staff         - From coverSheet.staff (must include .daily array).
 * @param {string}   [params.logoUrl]     - Next.js static image .src string.
 */
export async function exportPayrollHoursToExcel({ homeName, payYear, periodNumber, periodStart, periodEnd, staff, logoUrl }) {
    const ExcelJS = (await import("exceljs")).default;

    // Derive day list from the first staff member's daily array.
    // All caregivers in a period share the same set of dates.
    const days = staff[0]?.daily?.map((d) => d.date) ?? [];

    // Name col + one col per day + Regular + Total + Notes
    const totalCols = 1 + days.length + 3;

    // ── Workbook & worksheet ───────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "NVCH Admin";
    wb.created = new Date();

    const ws = wb.addWorksheet("Payroll Hours", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 },
    });

    ws.columns = [
        { width: 22 },                    // Staff Name
        ...days.map(() => ({ width: 7 })), // one narrow col per day
        { width: 10 },                    // Regular
        { width: 10 },                    // Total
        { width: 36 },                    // Notes (wider to fit multiple fields)
    ];

    // ── Header section (title + info card with logo) ───────────────────────────
    await addHeader(ws, wb, {
        title: `Payroll Hours — ${homeName || "—"}`,
        homeName, payYear, periodNumber, periodStart, periodEnd, logoUrl, totalCols,
    });

    ws.addRow([]).height = 10;

    // ── Column header row — dynamic M/D day headers ────────────────────────────
    const dayHeaders = days.map((d) => {
        const dt = new Date(d);
        return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
    });
    const headerRow  = ws.addRow(["Staff Name", ...dayHeaders, "Regular", "Total", "Notes"]);
    headerRow.height = 28;
    headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum > totalCols) return;
        cell.font      = { bold: true, size: 10, color: { argb: C_WHITE }, name: "Calibri" };
        cell.fill      = solidFill(C_NAVY);
        cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle", indent: colNum === 1 ? 1 : 0 };
        cell.border    = {
            top:    medSide(),
            bottom: medSide(),
            left:   colNum === 1         ? medSide() : thinSide(),
            right:  colNum === totalCols ? medSide() : thinSide(),
        };
    });

    ws.views = [{ state: "frozen", ySplit: headerRow.number }];

    // ── Data rows ──────────────────────────────────────────────────────────────
    if (!staff || staff.length === 0) {
        const r = ws.addRow(["No staff found for this period."]);
        r.getCell(1).font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
    } else {
        staff.forEach((s, idx) => {
            const isLast  = idx === staff.length - 1;
            const rowBg   = idx % 2 === 1 ? C_ROW_ALT : C_ROW_EVEN;

            const dayCells = days.map((date) => {
                const entry = s.daily?.find((d) => d.date === date);
                return entry?.hours ?? 0;
            });

            // Build notes text — non-zero supplemental hours/dollar fields
            const noteItems = buildNoteItems(s);
            const notesText = noteItems.length > 0 ? formatNoteText(noteItems) : "";

            const row = ws.addRow([
                `${s.caregiver?.firstName ?? ""} ${s.caregiver?.lastName ?? ""}`.trim(),
                ...dayCells,
                s.hours?.regular ?? 0,
                s.totalHours     ?? 0,
                notesText,
            ]);
            row.height = 20;

            row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                if (colNum > totalCols) return;
                const isNameCol = colNum === 1;
                // Columns 2…(days.length+1) are the per-day columns
                const isDayCol  = colNum > 1 && colNum <= days.length + 1;
                const cellVal   = isDayCol ? (dayCells[colNum - 2] ?? 0) : 0;

                const isNotesCol = colNum === totalCols;
                cell.alignment = {
                    horizontal: (isNameCol || isNotesCol) ? "left" : "center",
                    vertical:   "middle",
                    wrapText:   isNotesCol,
                    indent:     (isNameCol || isNotesCol) ? 1 : 0,
                };
                cell.border    = {
                    top:    thinSide(),
                    bottom: isLast ? medSide() : thinSide(),
                    left:   colNum === 1         ? medSide() : thinSide(),
                    right:  colNum === totalCols ? medSide() : thinSide(),
                };
                // Day cells with hours get a light-blue highlight; empty days use row alternation
                cell.fill = solidFill(
                    isNameCol                ? C_NAME_COL
                    : isDayCol && cellVal > 0 ? "FFB8D8F8"  // active day — light blue
                    : rowBg
                );
                cell.font = (isNameCol)
                    ? { bold: true, size: 10, color: { argb: C_NAVY },    name: "Calibri" }
                    : { size: 9,              color: { argb: "FF475569" }, name: "Calibri" };
            });
        });

        // ── Totals row ─────────────────────────────────────────────────────────
        const dayTotals = days.map((date) =>
            staff.reduce((acc, s) => {
                const entry = s.daily?.find((d) => d.date === date);
                return acc + (entry?.hours ?? 0);
            }, 0)
        );

        const totalsRow = ws.addRow([
            "Total",
            ...dayTotals,
            staff.reduce((acc, s) => acc + (s.hours?.regular ?? 0), 0),
            staff.reduce((acc, s) => acc + (s.totalHours     ?? 0), 0),
            "", // Notes column — no total
        ]);
        totalsRow.height = 22;
        totalsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            if (colNum > totalCols) return;
            cell.fill      = solidFill(C_TOTALS);
            cell.font      = { bold: true, size: 10, color: { argb: C_NAVY }, name: "Calibri" };
            cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle", indent: colNum === 1 ? 1 : 0 };
            cell.border    = {
                top:    medSide(),
                bottom: medSide(),
                left:   colNum === 1         ? medSide() : thinSide(),
                right:  colNum === totalCols ? medSide() : thinSide(),
            };
        });
    }

    // ── Footer, lock, download ─────────────────────────────────────────────────
    addFooter(ws, totalCols);
    await lockSheet(ws);
    await downloadWorkbook(wb, `payroll_hours_${homeName || "home"}_${payYear}_period${periodNumber}.xlsx`);
}
