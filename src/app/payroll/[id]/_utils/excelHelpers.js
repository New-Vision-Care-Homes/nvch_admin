import { format } from "date-fns";
import { formatPayPeriodLabel } from "@/utils/payPeriod";

// ============================================================
// SECTION: Palette & Style Constants
// ------------------------------------------------------------
// Purpose:
//   Centralise all colours used by both payroll export functions
//   so brand/palette changes only need to happen in one place.
//
// Naming convention: C_ prefix = colour ARGB string.
//
// Relationship:
//   Mirrors the palette in the scheduling export (exportSchedule.js)
//   so all exported documents share a consistent visual identity.
// ============================================================

export const C_NAVY     = "FF1C4A6E"; // header rows, name column text, outer borders
export const C_WHITE    = "FFFFFFFF";
export const C_INFO_BG  = "FFEEF5FF"; // info card background
export const C_ROW_EVEN = "FFFFFFFF"; // white (even) data rows
export const C_ROW_ALT  = "FFEDF5FF"; // light-blue (odd) data rows
export const C_NAME_COL = "FFD5EAF7"; // name column tint
export const C_BORDER   = "FFD0DCE8"; // thin inner grid border
export const C_TOTALS   = "FFD6EAF8"; // totals row — slightly darker blue
export const C_FOOTER   = "FF8BA0B5"; // muted footer text


// ============================================================
// SECTION: Border & Fill Factories
// ------------------------------------------------------------
// Purpose:
//   Thin wrappers that produce ExcelJS border and fill objects.
//   Avoids repeating the verbose ExcelJS border/fill syntax
//   everywhere a cell is styled.
// ============================================================

/** Returns an ExcelJS thin-border descriptor using the inner grid colour. */
export const thinSide = () => ({ style: "thin",   color: { argb: C_BORDER } });

/** Returns an ExcelJS medium-border descriptor using the navy brand colour. */
export const medSide  = () => ({ style: "medium", color: { argb: C_NAVY   } });

/**
 * Returns an ExcelJS solid-fill descriptor for the given ARGB colour.
 * @param {string} argb - 8-character ARGB hex string (e.g. "FFFFFFFF").
 */
export const solidFill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });


// ============================================================
// SECTION: addHeader
// ------------------------------------------------------------
// Purpose:
//   Writes a title row followed by a two-row info card (logo +
//   metadata) at the current position of the worksheet. Called
//   by both export functions so the document header is consistent.
//
// Layout:
//   Row 1: Title row — full-width navy bar with white text
//   Row 2: Info card row 1 — House name + Pay Period (logo beside it)
//   Row 3: Info card row 2 — Period date range
//
// Relationship:
//   Mirrors the header in the scheduling export (exportSchedule.js).
// ============================================================

/**
 * Writes the title bar and two-row info card to the worksheet.
 * Fetches and embeds the logo if `logoUrl` is provided.
 *
 * @param {import("exceljs").Worksheet} ws
 * @param {import("exceljs").Workbook}  wb
 * @param {Object} opts
 * @param {string} opts.title         - Bold title text in the navy header bar.
 * @param {string} opts.homeName      - Home display name for the info card.
 * @param {number} opts.payYear
 * @param {number} opts.periodNumber
 * @param {string} opts.periodStart   - ISO timestamp from coverSheet.payPeriod.
 * @param {string} opts.periodEnd     - ISO timestamp from coverSheet.payPeriod.
 * @param {string} [opts.logoUrl]     - Next.js static image .src string.
 * @param {number} opts.totalCols     - Total column count (used for row merges).
 */
export async function addHeader(ws, wb, { title, homeName, payYear, periodNumber, periodStart, periodEnd, logoUrl, totalCols }) {
    // ── Title row ─────────────────────────────────────────────────────────────
    const titleRow    = ws.addRow([title]);
    titleRow.height   = 32;
    ws.mergeCells(titleRow.number, 1, titleRow.number, totalCols);
    const titleCell     = titleRow.getCell(1);
    titleCell.font      = { bold: true, size: 14, color: { argb: C_WHITE }, name: "Calibri" };
    titleCell.fill      = solidFill(C_NAVY);
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // ── Info card ─────────────────────────────────────────────────────────────
    // Layout: padLeft | LOGO_COLS | TEXT_COLS | padRight
    const LOGO_COLS = 1;
    const TEXT_COLS = 7;
    const padLeft   = Math.max(1, Math.floor((totalCols - LOGO_COLS - TEXT_COLS) / 2));
    const logoStart = padLeft + 1;                                     // 1-indexed
    const textStart = logoStart + LOGO_COLS;                           // 1-indexed
    const textEnd   = Math.min(textStart + TEXT_COLS - 1, totalCols);  // 1-indexed
    const INFO_ROW_H = 24;

    const periodLabel = formatPayPeriodLabel({ payYear, periodNumber });
    const startStr    = format(new Date(periodStart), "MMM d, yyyy");
    const endStr      = format(new Date(periodEnd),   "MMM d, yyyy");

    const infoRowData = [
        [
            { label: "House",      value: homeName || "—" },
            { label: "Pay Period", value: periodLabel     },
        ],
        [
            { label: "Period Dates", value: `${startStr}  –  ${endStr}` },
        ],
    ];

    const infoStartRow = ws.rowCount + 1; // used to anchor the logo image below

    infoRowData.forEach((pairs, rowIdx) => {
        const isFirst = rowIdx === 0;
        const isLast  = rowIdx === infoRowData.length - 1;
        const row     = ws.addRow([]);
        row.height    = INFO_ROW_H;

        // Background + outer border on every cell
        for (let c = 1; c <= totalCols; c++) {
            const cell  = row.getCell(c);
            cell.fill   = solidFill(C_INFO_BG);
            cell.border = {
                left:   c === 1         ? thinSide() : undefined,
                right:  c === totalCols ? thinSide() : undefined,
                top:    isFirst         ? thinSide() : undefined,
                bottom: isLast          ? thinSide() : undefined,
            };
        }

        // Merge text region and write rich-text label: value pairs
        ws.mergeCells(row.number, textStart, row.number, textEnd);
        const textCell     = row.getCell(textStart);
        textCell.fill      = solidFill(C_INFO_BG);
        textCell.alignment = { horizontal: "center", vertical: "middle" };
        textCell.border    = {
            top:    isFirst ? thinSide() : undefined,
            bottom: isLast  ? thinSide() : undefined,
        };
        textCell.value = {
            richText: pairs.flatMap((p, i) => [
                ...(i > 0 ? [{ text: "     " }] : []),
                { text: `${p.label}:  `, font: { bold: true, size: 10, color: { argb: C_NAVY } } },
                { text: p.value,         font: { size: 10,              color: { argb: C_NAVY } } },
            ]),
        };
    });

    // Logo: fetch → embed → anchor beside the info card text
    if (logoUrl) {
        try {
            const resp     = await fetch(logoUrl);
            const buffer   = await resp.arrayBuffer();
            const imgId    = wb.addImage({ buffer, extension: "png" });
            const logoH_px = Math.round(INFO_ROW_H * infoRowData.length * 96 / 72) - 12;
            const logoW_px = Math.round(logoH_px * 1.7);
            ws.addImage(imgId, {
                tl:  { col: logoStart - 1, row: infoStartRow - 1 + 0.15 },
                ext: { width: logoW_px, height: logoH_px },
            });
        } catch { /* logo fetch failed — info card still renders without it */ }
    }
}


// ============================================================
// SECTION: addFooter
// ============================================================

/**
 * Appends a spacer and a "Generated on…" footer row merged across
 * all columns at the bottom of the worksheet.
 *
 * @param {import("exceljs").Worksheet} ws
 * @param {number} totalCols
 */
export function addFooter(ws, totalCols) {
    ws.addRow([]).height = 8;
    const row  = ws.addRow([`Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}  ·  New Vision Care Homes`]);
    row.height = 14;
    ws.mergeCells(row.number, 1, row.number, totalCols);
    const cell     = row.getCell(1);
    cell.font      = { size: 9, italic: true, color: { argb: C_FOOTER } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
}


// ============================================================
// SECTION: lockSheet
// ============================================================

/**
 * Applies worksheet protection so the sheet is read-only when opened.
 * All cells are locked by default in Excel; this enforces that lock.
 * Users can scroll and select cells but cannot edit, format, or insert rows.
 *
 * A random UUID is generated per export and immediately discarded — it is
 * never stored or logged anywhere. This means each sheet has a unique,
 * non-recoverable password, so recipients cannot unprotect it from within Excel.
 *
 * @param {import("exceljs").Worksheet} ws
 */
export async function lockSheet(ws) {
    await ws.protect(crypto.randomUUID(), {
        selectLockedCells:   true,   // allow scrolling/reading
        selectUnlockedCells: false,
        formatCells:         false,
        formatColumns:       false,
        formatRows:          false,
        insertRows:          false,
        insertColumns:       false,
        insertHyperlinks:    false,
        deleteRows:          false,
        deleteColumns:       false,
        sort:                false,
        autoFilter:          false,
        pivotTables:         false,
    });
}


// ============================================================
// SECTION: downloadWorkbook
// ============================================================

/**
 * Converts an ExcelJS workbook to a browser download.
 * Creates a temporary object URL, clicks a hidden `<a>`, then revokes it.
 *
 * @param {import("exceljs").Workbook} wb
 * @param {string} filename - Suggested filename for the download dialog.
 */
export async function downloadWorkbook(wb, filename) {
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
