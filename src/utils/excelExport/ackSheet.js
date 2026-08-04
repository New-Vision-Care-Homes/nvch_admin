import { format } from "date-fns";
import {
    C_NAVY, C_WHITE, C_INFO_BG, C_ROW_EVEN, C_ROW_ALT,
    C_TOTALS,
    thinSide, medSide, solidFill,
    addFooter, downloadWorkbook, lockSheet,
} from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// BULK EXPORT — table layout (one row per record)
// ─────────────────────────────────────────────────────────────────────────────

const BULK_COLS = [
    { header: "Employee ID",  width: 14 },
    { header: "First Name",   width: 14 },
    { header: "Last Name",    width: 15 },
    { header: "Shift Start",  width: 22 },
    { header: "Shift End",    width: 22 },
    { header: "Shift Status", width: 14 },
    { header: "Designation",  width: 14 },
    { header: "Overage Hrs",  width: 13 },
    { header: "Bank / Pay",   width: 13 },
    { header: "Stmt Version", width: 13 },
    { header: "Requested At", width: 22 },
    { header: "Decided At",   width: 22 },
    { header: "Statement",    width: 58 },
];
const BULK_TOTAL = BULK_COLS.length;

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE EXPORT — vertical form layout
// ─────────────────────────────────────────────────────────────────────────────

// 3-column layout: label | value | right buffer (logo anchor in header)
const SINGLE_TOTAL = 3;
const SINGLE_COL_WIDTHS = [30, 56, 16]; // A=label, B=value, C=logo buffer

// Statement section colours — warm cream box, amber border, feels "signed"
const C_STMT_BG     = "FFFFFCE8";
const C_STMT_BORDER = "FFD97706";

// ─────────────────────────────────────────────────────────────────────────────
// Shared header — works for both bulk (13 cols) and single (3 cols)
// ─────────────────────────────────────────────────────────────────────────────

async function addAckHeader(ws, wb, { logoUrl, totalCols, infoRow2 }) {
    const titleText = totalCols === SINGLE_TOTAL
        ? "Overtime Acknowledgment — Detail Record"
        : "Overtime Acknowledgment Report — Acknowledged";

    // ── Title row ─────────────────────────────────────────────────────────────
    const titleRow      = ws.addRow([titleText]);
    titleRow.height     = 30;
    ws.mergeCells(titleRow.number, 1, titleRow.number, totalCols);
    const titleCell     = titleRow.getCell(1);
    titleCell.font      = { bold: true, size: 14, color: { argb: C_WHITE }, name: "Calibri" };
    titleCell.fill      = solidFill(C_NAVY);
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // ── Info card (2 rows) ────────────────────────────────────────────────────
    // Merge each info row across the full width so text centres on actual pixels,
    // not column count (which breaks when columns have very different widths).
    // The logo is a floating overlay on the left edge.
    const INFO_ROW_H = 24;

    const infoPairs = [
        [{ label: "Organization", value: "New Vision Care Homes" }],
        [{ label: infoRow2.label, value: infoRow2.value }],
    ];

    const infoStartRow = ws.rowCount + 1;

    infoPairs.forEach((pairs, rowIdx) => {
        const isFirst = rowIdx === 0;
        const isLast  = rowIdx === infoPairs.length - 1;
        const row     = ws.addRow([]);
        row.height    = INFO_ROW_H;

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

        // Full-width merge — text centres across real pixel width
        ws.mergeCells(row.number, 1, row.number, totalCols);
        const textCell     = row.getCell(1);
        textCell.fill      = solidFill(C_INFO_BG);
        textCell.alignment = { horizontal: "center", vertical: "middle" };
        textCell.border    = {
            left:   thinSide(),
            right:  thinSide(),
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

    // Logo — floating overlay on the left side of the info card
    if (logoUrl) {
        try {
            const resp     = await fetch(logoUrl);
            const buffer   = await resp.arrayBuffer();
            const imgId    = wb.addImage({ buffer, extension: "png" });
            const logoH_px = Math.round(INFO_ROW_H * infoPairs.length * 96 / 72) - 12;
            const logoW_px = Math.round(logoH_px * 1.7);
            ws.addImage(imgId, {
                tl:  { col: 0.3, row: infoStartRow - 1 + 0.1 },
                ext: { width: logoW_px, height: logoH_px },
            });
        } catch { /* logo unavailable — header still renders */ }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK: buildAckSheet + exportAckWorkbook
// ─────────────────────────────────────────────────────────────────────────────

export async function buildAckSheet(wb, { acknowledgments, logoUrl, filters }) {
    const ws = wb.addWorksheet("Acknowledged", {
        views:     [{ state: "frozen", xSplit: 0, ySplit: 4 }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    BULK_COLS.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });

    let infoRow2;
    if (filters?.dateMode === "period" && filters.payYear && filters.periodNumber) {
        infoRow2 = { label: "Pay Period", value: `${filters.payYear}  ·  Period ${filters.periodNumber}` };
    } else if (filters?.dateMode === "date" && (filters.from || filters.to)) {
        const fromStr = filters.from ? format(new Date(filters.from), "MMM d, yyyy") : "—";
        const toStr   = filters.to   ? format(new Date(filters.to),   "MMM d, yyyy") : "—";
        infoRow2 = { label: "Date Range", value: `${fromStr}  –  ${toStr}` };
    } else {
        infoRow2 = { label: "Records", value: "All" };
    }

    await addAckHeader(ws, wb, { logoUrl, totalCols: BULK_TOTAL, infoRow2 });

    // Column header row
    const headerRow = ws.addRow(BULK_COLS.map((c) => c.header));
    headerRow.height = 22;
    for (let c = 1; c <= BULK_TOTAL; c++) {
        const cell     = headerRow.getCell(c);
        cell.font      = { bold: true, size: 10, color: { argb: C_WHITE }, name: "Calibri" };
        cell.fill      = solidFill(C_NAVY);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = {
            left:   c === 1          ? medSide() : thinSide(),
            right:  c === BULK_TOTAL ? medSide() : thinSide(),
            top:    medSide(),
            bottom: medSide(),
        };
    }

    const dt = (iso) => iso ? format(new Date(iso), "yyyy-MM-dd HH:mm") : "—";

    acknowledgments.forEach((ack, idx) => {
        const bg    = idx % 2 === 1 ? C_ROW_ALT : C_ROW_EVEN;
        const cg    = ack.caregiver ?? {};
        const shift = ack.shift     ?? {};
        const bankPay = ack.bankRequested === true ? "Bank Hours" : ack.bankRequested === false ? "Pay Out" : "—";

        const row = ws.addRow([
            cg.employeeId ?? "—", cg.firstName ?? "—", cg.lastName ?? "—",
            dt(shift.startTime), dt(shift.endTime),
            shift.status ?? "—", shift.designation ?? "—",
            ack.plannedOverageHours ?? "—", bankPay,
            ack.statementVersion ?? "—",
            dt(ack.requestedAt), dt(ack.decidedAt),
            ack.statement ?? "—",
        ]);
        row.height = ack.statement?.length > 120 ? 42 : 18;

        for (let c = 1; c <= BULK_TOTAL; c++) {
            const cell     = row.getCell(c);
            cell.fill      = solidFill(bg);
            cell.font      = { size: 10, name: "Calibri" };
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.border    = {
                left:   c === 1          ? medSide() : thinSide(),
                right:  c === BULK_TOTAL ? medSide() : thinSide(),
                top:    thinSide(),
                bottom: thinSide(),
            };
        }
        row.getCell(8).alignment  = { vertical: "middle", horizontal: "center" };
        row.getCell(10).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(BULK_TOTAL).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    });

    const countRow  = ws.addRow([`${acknowledgments.length} record${acknowledgments.length !== 1 ? "s" : ""}`]);
    countRow.height = 20;
    ws.mergeCells(countRow.number, 1, countRow.number, BULK_TOTAL);
    const countCell = countRow.getCell(1);
    countCell.fill  = solidFill(C_TOTALS);
    countCell.font  = { bold: true, size: 10, color: { argb: C_NAVY }, name: "Calibri" };
    countCell.alignment = { horizontal: "right", vertical: "middle", indent: 2 };
    countCell.border    = { left: medSide(), right: medSide(), top: medSide(), bottom: medSide() };

    addFooter(ws, BULK_TOTAL);
}

export async function exportAckWorkbook({ acknowledgments, logoUrl, filters }) {
    const ExcelJS = (await import("exceljs")).default;
    const wb      = new ExcelJS.Workbook();
    wb.creator    = "NVCH Admin";
    wb.created    = new Date();

    await buildAckSheet(wb, { acknowledgments, logoUrl, filters });
    await lockSheet(wb.worksheets[0]);

    const datestamp = format(new Date(), "yyyy-MM-dd");
    await downloadWorkbook(wb, `overtime_acknowledgments_${datestamp}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE: buildSingleAckSheet + exportSingleAckWorkbook
// Vertical document layout — section headers + label/value pairs + large
// signed-statement box at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

async function buildSingleAckSheet(wb, { ack, logoUrl }) {
    const ws = wb.addWorksheet("Acknowledgment Detail", {
        views:     [{ state: "normal" }],
        pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    SINGLE_COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const cg    = ack.caregiver ?? {};
    const shift = ack.shift     ?? {};

    const caregiverLabel = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "—";
    const infoRow2 = {
        label: "Caregiver",
        value: cg.employeeId ? `${caregiverLabel}  ·  ${cg.employeeId}` : caregiverLabel,
    };
    await addAckHeader(ws, wb, { logoUrl, totalCols: SINGLE_TOTAL, infoRow2 });

    const dt = (iso) => iso ? format(new Date(iso), "yyyy-MM-dd  HH:mm") : "—";

    // ── Helpers ───────────────────────────────────────────────────────────────

    const gap = (h = 6) => {
        const r = ws.addRow([]);
        r.height = h;
    };

    const sectionHeader = (title) => {
        gap(10);
        const row = ws.addRow([title]);
        row.height = 22;
        ws.mergeCells(row.number, 1, row.number, SINGLE_TOTAL);
        const cell     = row.getCell(1);
        cell.font      = { bold: true, size: 11, color: { argb: C_WHITE }, name: "Calibri" };
        cell.fill      = solidFill(C_NAVY);
        cell.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
    };

    const field = (label, value) => {
        const row = ws.addRow([label, value ?? "—", ""]);
        row.height = 20;

        // Col A: label
        const a     = row.getCell(1);
        a.fill      = solidFill(C_INFO_BG);
        a.font      = { bold: true, size: 10, color: { argb: C_NAVY }, name: "Calibri" };
        a.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
        a.border    = {
            left:   medSide(),
            right:  thinSide(),
            top:    thinSide(),
            bottom: thinSide(),
        };

        // Cols B–C: value (merged)
        ws.mergeCells(row.number, 2, row.number, SINGLE_TOTAL);
        const b     = row.getCell(2);
        b.fill      = solidFill(C_ROW_EVEN);
        b.font      = { size: 10, name: "Calibri" };
        b.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
        b.border    = {
            right:  medSide(),
            top:    thinSide(),
            bottom: thinSide(),
        };
    };

    // ── Signed statement — large box ─────────────────────────────────────────

    const signedStatement = (text, version) => {
        gap(10);

        // Header bar for statement section
        const hRow = ws.addRow(["Signed Statement"]);
        hRow.height = 24;
        ws.mergeCells(hRow.number, 1, hRow.number, SINGLE_TOTAL);
        const hCell     = hRow.getCell(1);
        hCell.font      = { bold: true, size: 12, color: { argb: C_WHITE }, name: "Calibri" };
        hCell.fill      = solidFill(C_NAVY);
        hCell.alignment = { horizontal: "left", vertical: "middle", indent: 2 };

        // Version sub-header
        const vRow = ws.addRow([`Statement Version: ${version ?? "—"}`]);
        vRow.height = 18;
        ws.mergeCells(vRow.number, 1, vRow.number, SINGLE_TOTAL);
        const vCell     = vRow.getCell(1);
        vCell.fill      = solidFill(C_INFO_BG);
        vCell.font      = { size: 10, color: { argb: C_NAVY }, name: "Calibri" };
        vCell.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
        vCell.border    = { left: medSide(), right: medSide(), bottom: thinSide() };

        // Statement text — large cream box
        const tRow = ws.addRow([text ?? "—", "", ""]);
        tRow.height = 200; // generous height; Excel will display scrollbar if needed
        ws.mergeCells(tRow.number, 1, tRow.number, SINGLE_TOTAL);
        const tCell     = tRow.getCell(1);
        tCell.value     = text ?? "—";
        tCell.fill      = solidFill(C_STMT_BG);
        tCell.font      = { size: 12, italic: true, name: "Calibri" };
        tCell.alignment = { horizontal: "left", vertical: "top", wrapText: true, indent: 2 };
        tCell.border    = {
            left:   { style: "medium", color: { argb: C_STMT_BORDER } },
            right:  { style: "medium", color: { argb: C_STMT_BORDER } },
            top:    { style: "thin",   color: { argb: C_STMT_BORDER } },
            bottom: { style: "medium", color: { argb: C_STMT_BORDER } },
        };
    };

    // ── Content ───────────────────────────────────────────────────────────────

    const bankPay = ack.bankRequested === true  ? "Bank Hours"
                  : ack.bankRequested === false ? "Pay Out"
                  : "—";

    sectionHeader("Caregiver Information");
    field("Employee ID",    cg.employeeId);
    field("First Name",     cg.firstName);
    field("Last Name",      cg.lastName);

    sectionHeader("Shift Details");
    field("Shift Start",    dt(shift.startTime));
    field("Shift End",      dt(shift.endTime));
    field("Shift Status",   shift.status);
    field("Designation",    shift.designation);
    field("Overage Hours",  ack.plannedOverageHours != null ? `${ack.plannedOverageHours} h` : "—");

    sectionHeader("Acknowledgment Details");
    field("Status",         "Acknowledged");
    field("Bank / Pay",     bankPay);
    field("Requested At",   dt(ack.requestedAt));
    field("Decided At",     dt(ack.decidedAt));

    signedStatement(ack.statement, ack.statementVersion);

    gap(14);
    addFooter(ws, SINGLE_TOTAL);
}

export async function exportSingleAckWorkbook({ ack, logoUrl }) {
    const ExcelJS = (await import("exceljs")).default;
    const wb      = new ExcelJS.Workbook();
    wb.creator    = "NVCH Admin";
    wb.created    = new Date();

    await buildSingleAckSheet(wb, { ack, logoUrl });
    await lockSheet(wb.worksheets[0]);

    const cg   = ack.caregiver ?? {};
    const name = [cg.firstName, cg.lastName].filter(Boolean).join("_").toLowerCase() || "caregiver";
    const date = ack.shift?.startTime
        ? format(new Date(ack.shift.startTime), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

    await downloadWorkbook(wb, `ack_${name}_${date}.xlsx`);
}
