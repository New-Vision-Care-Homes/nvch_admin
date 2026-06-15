import { format, addDays } from "date-fns";
import { utcToZonedDateObject } from "@/utils/timeHandling";
import { formatPayPeriodLabel } from "@/utils/payPeriod";

const HALIFAX_TZ       = "America/Halifax";
const INCLUDED_STATUSES = new Set(["scheduled", "completed", "in_progress"]);

// ─── Palette ──────────────────────────────────────────────────────────────────
const C_NAVY        = "FF1C4A6E"; // deep navy — header, title, borders
const C_WHITE       = "FFFFFFFF";
const C_INFO_BG     = "FFEEF5FF"; // info card background
const C_ROW_EVEN    = "FFFFFFFF"; // white rows
const C_ROW_ALT     = "FFEDF5FF"; // very-light-blue alternating rows
const C_NAME_COL    = "FFD5EAF7"; // name column tint
const C_BORDER      = "FFD0DCE8"; // thin border color
const C_OVERNIGHT   = "FFB8D8F8"; // light blue — overnight shift cells
const C_DAY         = "FFFFD3A0"; // warm orange — day shift cells
const C_FOOTER      = "FF8BA0B5"; // muted footer text

// ─── Border helpers ────────────────────────────────────────────────────────────
const thinSide  = () => ({ style: "thin",   color: { argb: C_BORDER } });
const medSide   = () => ({ style: "medium", color: { argb: C_NAVY   } });

const allThin   = () => ({ top: thinSide(), left: thinSide(), bottom: thinSide(), right: thinSide() });

// ─── Fill helpers ──────────────────────────────────────────────────────────────
const solidFill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

/**
 * Exports a roster-style Excel schedule for a 14-day pay period.
 *
 * homeId: when provided, only shifts belonging to that home are included.
 *         When null/empty, all shifts in the period are shown (All Homes).
 * payYear / periodNumber: the period's identity as resolved by the backend
 *         (GET /api/hours/pay-periods) — not recomputed here.
 * logoUrl: fetched and embedded at the top of the sheet, horizontally centered.
 */
export async function exportScheduleToExcel({ homeName, homeId, payPeriodStart, payPeriodEnd, payYear, periodNumber, shifts, logoUrl }) {
	// Dynamic import keeps ExcelJS out of the SSR bundle
	const ExcelJS = (await import("exceljs")).default;

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

		const startLocal  = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
		const endLocal    = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
		const dateStr     = format(startLocal, "yyyy-MM-dd");
		const timeRange   = `${format(startLocal, "H:mm")}–${format(endLocal, "H:mm")}`;
		const isOvernight = format(startLocal, "yyyy-MM-dd") !== format(endLocal, "yyyy-MM-dd");

		if (!shiftMap[cgId]) shiftMap[cgId] = {};
		if (!shiftMap[cgId][dateStr]) shiftMap[cgId][dateStr] = [];
		shiftMap[cgId][dateStr].push({ timeRange, isOvernight });
	});

	const sortedCgIds = Object.keys(caregiverNames).sort((a, b) =>
		caregiverNames[a].localeCompare(caregiverNames[b])
	);

	// ── Workbook & worksheet ───────────────────────────────────────────────────
	const wb = new ExcelJS.Workbook();
	wb.creator = "NVCH Admin";
	wb.created = new Date();

	const ws = wb.addWorksheet("Schedule", {
		pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 },
	});

	ws.columns = [
		{ width: 24 },
		...dates.map(() => ({ width: 13 })),
	];

	// ── Helper: merge a single-value row across all columns ───────────────────
	const addMergedRow = (value, height, styleCell) => {
		const row  = ws.addRow([value]);
		row.height = height;
		ws.mergeCells(row.number, 1, row.number, totalCols);
		const cell = row.getCell(1);
		styleCell(cell);
		return row;
	};

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 1 — INFO CARD (light-blue, [logo | text] block centered)
	// ═══════════════════════════════════════════════════════════════════════════
	// Layout: padLeft cols | LOGO_COLS | TEXT_COLS | padRight cols
	// LOGO_COLS=1 keeps the logo immediately beside the text (no dead-air gap).
	// With totalCols=15: padLeft=3 → left ≈50u, right ≈52u (nearly symmetric).
	const LOGO_COLS    = 1;
	const TEXT_COLS    = 7;
	const padLeft      = Math.max(1, Math.floor((totalCols - LOGO_COLS - TEXT_COLS) / 2));
	const logoStart    = padLeft + 1;                          // 1-indexed
	const textStart    = logoStart + LOGO_COLS;                // 1-indexed
	const textEnd      = Math.min(textStart + TEXT_COLS - 1, totalCols); // 1-indexed
	const INFO_ROW_H   = 24; // points per info row

	const payPeriodLabel = formatPayPeriodLabel({ payYear, periodNumber });

	const infoRowData = [
		[
			{ label: "House",        value: homeName || "All Homes" },
			{ label: "Pay Period",   value: payPeriodLabel           },
		],
		[
			{ label: "Period Dates", value: `${format(payPeriodStart, "MMM d, yyyy")}  –  ${format(payPeriodEnd, "MMM d, yyyy")}` },
		],
	];

	const infoStartRow = ws.rowCount + 1; // 1-indexed, for image anchor

	infoRowData.forEach((pairs, rowIdx) => {
		const isFirst = rowIdx === 0;
		const isLast  = rowIdx === infoRowData.length - 1;
		const row     = ws.addRow([]);
		row.height    = INFO_ROW_H;

		// All cells: light-blue bg + outer border only
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

		// Merge text columns and center the rich-text content
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

	// Logo: fixed pixel size so it stays proportional regardless of column widths.
	// Height fills both info rows with a small margin; width is slightly wider than tall.
	if (logoUrl) {
		try {
			const resp      = await fetch(logoUrl);
			const buffer    = await resp.arrayBuffer();
			const imgId     = wb.addImage({ buffer, extension: "png" });
			const logoH_px  = Math.round(INFO_ROW_H * infoRowData.length * 96 / 72) - 12; // px, ≈52px — 6px top+bottom margin
			const logoW_px  = Math.round(logoH_px * 1.7); // ≈88px landscape, fits within one 13-unit date column (~97px)
			ws.addImage(imgId, {
				tl:  { col: logoStart - 1, row: infoStartRow - 1 + 0.15 }, // 0-indexed; 0.15 row ≈ 4px top margin
				ext: { width: logoW_px, height: logoH_px },
			});
		} catch { /* logo fetch failed — info card still visible */ }
	}

	// ── Spacer ────────────────────────────────────────────────────────────────
	ws.addRow([]).height = 10;

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 4 — LEGEND
	// ═══════════════════════════════════════════════════════════════════════════
	const legendRow = ws.addRow(["Color key:", "  Day Shift  ", "", "  Overnight Shift  "]);
	legendRow.height = 20;

	legendRow.getCell(1).font      = { bold: true, size: 10, color: { argb: C_NAVY } };
	legendRow.getCell(1).alignment = { vertical: "middle" };

	const styleChip = (cell, argb) => {
		cell.fill      = solidFill(argb);
		cell.font      = { bold: true, size: 10, color: { argb: C_NAVY } };
		cell.border    = allThin();
		cell.alignment = { horizontal: "center", vertical: "middle" };
	};
	styleChip(legendRow.getCell(2), C_DAY);
	styleChip(legendRow.getCell(4), C_OVERNIGHT);

	// ── Spacer ────────────────────────────────────────────────────────────────
	ws.addRow([]).height = 8;

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 5 — TABLE HEADER
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
	// SECTION 6 — DATA ROWS
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

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 7 — FOOTER
	// ═══════════════════════════════════════════════════════════════════════════
	ws.addRow([]).height = 8;

	addMergedRow(
		`Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}  ·  New Vision Care Homes`,
		14,
		(cell) => {
			cell.font      = { size: 9, italic: true, color: { argb: C_FOOTER } };
			cell.alignment = { horizontal: "center", vertical: "middle" };
		},
	);

	// ── Trigger browser download ───────────────────────────────────────────────
	const buffer = await wb.xlsx.writeBuffer();
	const blob   = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a   = document.createElement("a");
	a.href     = url;
	a.download = `schedule_${format(payPeriodStart, "yyyy-MM-dd")}_to_${format(payPeriodEnd, "yyyy-MM-dd")}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}
