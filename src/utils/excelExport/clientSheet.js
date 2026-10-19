import { format } from "date-fns";
import {
    C_NAVY, C_WHITE, C_INFO_BG, C_ROW_EVEN, C_ROW_ALT,
    C_TOTALS,
    thinSide, medSide, solidFill,
    addFooter, downloadWorkbook,
} from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// BULK EXPORT — table layout (one row per client)
// Mirrors homeSheet.js's layout/styling so every bulk export in the app looks
// and behaves the same way (same header banner, zebra striping, totals row).
// ─────────────────────────────────────────────────────────────────────────────

const BULK_COLS = [
    { header: "Client Name",     width: 26 },
    { header: "Client ID",       width: 16 },
    { header: "Region",          width: 14 },
    { header: "Status",          width: 12 },
    { header: "Phone",           width: 16 },
    { header: "Email",           width: 28 },
];
const BULK_TOTAL = BULK_COLS.length;

async function addClientHeader(ws, wb, { logoUrl, infoRow2 }) {
    const titleRow  = ws.addRow(["Clients Report"]);
    titleRow.height = 30;
    ws.mergeCells(titleRow.number, 1, titleRow.number, BULK_TOTAL);
    const titleCell     = titleRow.getCell(1);
    titleCell.font      = { bold: true, size: 14, color: { argb: C_WHITE }, name: "Calibri" };
    titleCell.fill      = solidFill(C_NAVY);
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

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

        for (let c = 1; c <= BULK_TOTAL; c++) {
            const cell  = row.getCell(c);
            cell.fill   = solidFill(C_INFO_BG);
            cell.border = {
                left:   c === 1          ? thinSide() : undefined,
                right:  c === BULK_TOTAL ? thinSide() : undefined,
                top:    isFirst          ? thinSide() : undefined,
                bottom: isLast           ? thinSide() : undefined,
            };
        }

        ws.mergeCells(row.number, 1, row.number, BULK_TOTAL);
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

export async function buildClientSheet(wb, { clients, logoUrl, filters }) {
    const ws = wb.addWorksheet("Clients", {
        views:     [{ state: "frozen", xSplit: 0, ySplit: 4 }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    BULK_COLS.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });

    const activeFilters = [];
    if (filters?.search)   activeFilters.push(`Search: "${filters.search}"`);
    if (filters?.homeName) activeFilters.push(`Home: ${filters.homeName}`);
    if (filters?.isActive !== undefined && filters?.isActive !== "") {
        activeFilters.push(`Status: ${filters.isActive === "true" || filters.isActive === true ? "Active" : "Inactive"}`);
    }
    const infoRow2 = { label: "Filters", value: activeFilters.length ? activeFilters.join("  ·  ") : "All Clients" };

    await addClientHeader(ws, wb, { logoUrl, infoRow2 });

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

    clients.forEach((client, idx) => {
        const bg       = idx % 2 === 1 ? C_ROW_ALT : C_ROW_EVEN;
        const fullName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "—";

        const row = ws.addRow([
            fullName,
            client.clientId ?? "—",
            client.region ?? "—",
            client.isActive ? "Active" : "Inactive",
            client.phone ?? "—",
            client.email ?? "—",
        ]);
        row.height = 18;

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
    });

    const countRow  = ws.addRow([`${clients.length} client${clients.length !== 1 ? "s" : ""}`]);
    countRow.height = 20;
    ws.mergeCells(countRow.number, 1, countRow.number, BULK_TOTAL);
    const countCell = countRow.getCell(1);
    countCell.fill  = solidFill(C_TOTALS);
    countCell.font  = { bold: true, size: 10, color: { argb: C_NAVY }, name: "Calibri" };
    countCell.alignment = { horizontal: "right", vertical: "middle", indent: 2 };
    countCell.border    = { left: medSide(), right: medSide(), top: medSide(), bottom: medSide() };

    addFooter(ws, BULK_TOTAL);
}

export async function exportClientWorkbook({ clients, logoUrl, filters }) {
    const ExcelJS = (await import("exceljs")).default;
    const wb      = new ExcelJS.Workbook();
    wb.creator    = "NVCH Admin";
    wb.created    = new Date();

    await buildClientSheet(wb, { clients, logoUrl, filters });
    // Non-payroll export: left unlocked (editable). Only payroll exports are
    // protected — see lockSheet() in helpers.js for the payroll-only locking rule.

    const datestamp = format(new Date(), "yyyy-MM-dd");
    await downloadWorkbook(wb, `clients_${datestamp}.xlsx`);
}
