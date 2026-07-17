import {
    C_NAVY, C_WHITE, C_ROW_EVEN, C_ROW_ALT, C_NAME_COL, C_TOTALS,
    thinSide, medSide, solidFill,
    addHeader, addFooter, lockSheet, downloadWorkbook,
} from "./excelHelpers";

// ============================================================
// SECTION: exportCoverSheetToExcel
// ------------------------------------------------------------
// Purpose:
//   Generates the "Payroll Cover Sheet" Excel file — one row per
//   caregiver showing period totals across all hour types, plus
//   a totals row. Matches the columns in the printed payroll template.
//
// Columns:
//   Staff Name | Regular | Other | Holiday | Training |
//   Staff Meeting | Sick | Bereavement | Banked Hours Paid |
//   Vacation $$ | Hours Banked | Total
//
// API field mapping:
//   Holiday          ← hours.stat_pay
//   Banked Hours Paid ← hours.banked_hours_paid
//   Vacation $$      ← dollars.vacation_pay
//   Hours Banked     ← hours.hours_banked
//   Total            ← totalHours
//
// Relationship:
//   Called from PayrollDetailPage (payroll/[id]/page.js) when the
//   user clicks "Export Payroll Cover Sheet" on the Summary tab.
//   Requires coverSheet.staff from useCoverSheet.
//
// Flow:
//   Receive staff + period metadata
//        ↓
//   Build workbook → title + info card (logo) → column headers
//        ↓
//   Data rows (one per caregiver) → totals row
//        ↓
//   Footer → lock sheet (NVCH_READONLY) → trigger browser download
// ============================================================

/**
 * Exports the payroll cover-sheet summary as a read-only Excel file.
 *
 * @param {string}   params.homeName      - Home display name.
 * @param {number}   params.payYear
 * @param {number}   params.periodNumber
 * @param {string}   params.periodStart   - ISO timestamp from coverSheet.payPeriod.
 * @param {string}   params.periodEnd     - ISO timestamp from coverSheet.payPeriod.
 * @param {Object[]} params.staff         - From coverSheet.staff.
 * @param {string}   [params.logoUrl]     - Next.js static image .src string.
 */
export async function exportCoverSheetToExcel({ homeName, payYear, periodNumber, periodStart, periodEnd, staff, logoUrl }) {
    const ExcelJS = (await import("exceljs")).default;

    // Column definitions — order matches SummaryTable and the printed template
    const HEADERS = [
        "Staff Name", "Regular", "Other", "Holiday", "Training",
        "Staff Meeting", "Sick", "Bereavement", "Banked Hours Paid",
        "Vacation $$", "Hours Banked", "Total",
    ];
    const totalCols = HEADERS.length; // 12

    // ── Workbook & worksheet ───────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "NVCH Admin";
    wb.created = new Date();

    const ws = wb.addWorksheet("Payroll Cover Sheet", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 },
    });

    ws.columns = [
        { width: 22 }, // Staff Name
        { width: 10 }, // Regular
        { width: 10 }, // Other
        { width: 10 }, // Holiday
        { width: 10 }, // Training
        { width: 14 }, // Staff Meeting
        { width: 10 }, // Sick
        { width: 13 }, // Bereavement
        { width: 17 }, // Banked Hours Paid
        { width: 13 }, // Vacation $$
        { width: 13 }, // Hours Banked
        { width: 10 }, // Total
    ];

    // ── Header section (title + info card with logo) ───────────────────────────
    await addHeader(ws, wb, {
        title: `Payroll Cover Sheet — ${homeName || "—"}`,
        homeName, payYear, periodNumber, periodStart, periodEnd, logoUrl, totalCols,
    });

    ws.addRow([]).height = 10;

    // ── Column header row ──────────────────────────────────────────────────────
    const headerRow  = ws.addRow(HEADERS);
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

    // Freeze header so column labels stay visible when scrolling
    ws.views = [{ state: "frozen", ySplit: headerRow.number }];

    // ── Data rows ──────────────────────────────────────────────────────────────
    if (!staff || staff.length === 0) {
        const r = ws.addRow(["No staff found for this period."]);
        r.getCell(1).font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
    } else {
        staff.forEach((s, idx) => {
            const isLast = idx === staff.length - 1;
            const rowBg  = idx % 2 === 1 ? C_ROW_ALT : C_ROW_EVEN;

            const row = ws.addRow([
                `${s.caregiver?.firstName ?? ""} ${s.caregiver?.lastName ?? ""}`.trim(),
                s.hours?.regular           ?? 0,
                s.hours?.other             ?? 0,
                s.hours?.stat_pay          ?? 0,  // "Holiday" on the sheet
                s.hours?.training          ?? 0,
                s.hours?.staff_meeting     ?? 0,
                s.hours?.sick              ?? 0,
                s.hours?.bereavement       ?? 0,
                s.hours?.banked_hours_paid ?? 0,
                s.dollars?.vacation_pay    ?? 0,
                s.hours?.hours_banked      ?? 0,
                s.totalHours               ?? 0,
            ]);
            row.height = 20;

            row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                if (colNum > totalCols) return;
                cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle", indent: colNum === 1 ? 1 : 0 };
                cell.border    = {
                    top:    thinSide(),
                    bottom: isLast ? medSide() : thinSide(),
                    left:   colNum === 1         ? medSide() : thinSide(),
                    right:  colNum === totalCols ? medSide() : thinSide(),
                };
                cell.fill = solidFill(colNum === 1 ? C_NAME_COL : rowBg);
                cell.font = colNum === 1
                    ? { bold: true, size: 10, color: { argb: C_NAVY }, name: "Calibri" }
                    : { size: 10,              color: { argb: C_NAVY }, name: "Calibri" };
            });
        });

        // ── Totals row ─────────────────────────────────────────────────────────
        const sumH = (key) => staff.reduce((acc, s) => acc + (s.hours?.[key]   ?? 0), 0);
        const sumD = (key) => staff.reduce((acc, s) => acc + (s.dollars?.[key] ?? 0), 0);

        const totalsRow = ws.addRow([
            "Totals:",
            sumH("regular"), sumH("other"), sumH("stat_pay"), sumH("training"),
            sumH("staff_meeting"), sumH("sick"), sumH("bereavement"),
            sumH("banked_hours_paid"),
            sumD("vacation_pay"),
            sumH("hours_banked"),
            staff.reduce((acc, s) => acc + (s.totalHours ?? 0), 0),
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
    await downloadWorkbook(wb, `payroll_cover_sheet_${homeName || "home"}_${payYear}_period${periodNumber}.xlsx`);
}
