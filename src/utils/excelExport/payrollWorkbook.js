import { buildCoverSheetSheet }   from "./coverSheetSheet";
import { buildPayrollHoursSheet } from "./payrollHoursSheet";
import { buildScheduleSheet }     from "./scheduleSheet";
import { lockSheet, downloadWorkbook } from "./helpers";

// ============================================================
// SECTION: exportPayrollWorkbook
// ------------------------------------------------------------
// Purpose:
//   Builds ONE workbook containing all three payroll export tabs —
//   Cover Sheet, Hour Sheet, Schedule — and downloads it as a single
//   .xlsx file. Replaces having to export each sheet separately from
//   the Payroll detail page.
//
// Requirements on the caller:
//   `staff` must include each caregiver's `daily` array (i.e. the
//   cover-sheet data must have been fetched with { detail: "daily" }),
//   since buildPayrollHoursSheet reads from it. `shifts` must already
//   be scoped to the same home + pay-period date range as `staff`.
//
// Relationship:
//   Called from PayrollDetailPage (payroll/[id]/page.js) when the
//   user clicks "Export Payroll Package". Reuses the same three sheet
//   builders that also back the standalone single-sheet exports
//   (exportCoverSheetToExcel, exportPayrollHoursToExcel,
//   exportScheduleToExcel) so every export — combined or individual —
//   stays visually identical.
//
// Flow:
//   Create one workbook
//        ↓
//   buildCoverSheetSheet → buildPayrollHoursSheet → buildScheduleSheet
//        ↓
//   Lock every sheet read-only → trigger one browser download
// ============================================================

/**
 * Exports a combined, read-only payroll package (Cover Sheet + Hour Sheet +
 * Schedule) as a single Excel workbook with three tabs.
 *
 * @param {string}   params.homeName      - Home display name.
 * @param {string}   [params.homeId]      - Restricts the Schedule tab to this home's shifts.
 * @param {number}   params.payYear
 * @param {number}   params.periodNumber
 * @param {string}   params.periodStart   - ISO timestamp from coverSheet.payPeriod.
 * @param {string}   params.periodEnd     - ISO timestamp from coverSheet.payPeriod.
 * @param {Object[]} params.staff         - From coverSheet.staff, fetched with { detail: "daily" }.
 * @param {Object[]} params.shifts        - Shifts covering the same home + period, for the Schedule tab.
 * @param {string}   [params.logoUrl]     - Next.js static image .src string.
 */
export async function exportPayrollWorkbook({ homeName, homeId, payYear, periodNumber, periodStart, periodEnd, staff, shifts, logoUrl }) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "NVCH Admin";
    wb.created = new Date();

    await buildCoverSheetSheet(wb, { homeName, payYear, periodNumber, periodStart, periodEnd, staff, logoUrl });
    await buildPayrollHoursSheet(wb, { homeName, payYear, periodNumber, periodStart, periodEnd, staff, logoUrl });
    await buildScheduleSheet(wb, {
        homeName, homeId,
        payPeriodStart: new Date(periodStart),
        payPeriodEnd:   new Date(periodEnd),
        payYear, periodNumber, shifts, logoUrl,
    });

    // Every tab in the combined package is read-only — recipients can view
    // and print but not edit any of the three sheets.
    for (const ws of wb.worksheets) {
        await lockSheet(ws);
    }

    await downloadWorkbook(wb, `payroll_package_${homeName || "home"}_${payYear}_period${periodNumber}.xlsx`);
}
