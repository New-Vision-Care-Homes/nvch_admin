import { format, addDays } from "date-fns";
import { utcToZonedDateObject } from "@/utils/timeHandling";

const HALIFAX_TZ       = "America/Halifax";
const INCLUDED_STATUSES = new Set(["scheduled", "completed", "in_progress"]);
const PAYROLL_ANCHOR   = new Date(2026, 0, 1);
const PERIOD_DAYS      = 14;

function calcPayPeriodNumber(periodStart) {
	const msPerPeriod = PERIOD_DAYS * 24 * 60 * 60 * 1000;
	const diff = Math.max(0, periodStart.getTime() - PAYROLL_ANCHOR.getTime());
	return Math.floor(diff / msPerPeriod) + 1;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C_NAVY        = "FF1C4A6E"; // deep navy — header, title, borders
const C_BLUE_MED    = "FF2D7FC1"; // medium blue — subtitle, accents
const C_WHITE       = "FFFFFFFF";
const C_ROW_EVEN    = "FFFFFFFF"; // white rows
const C_ROW_ALT     = "FFEDF5FF"; // very-light-blue alternating rows
const C_NAME_COL    = "FFD5EAF7"; // name column tint
const C_BORDER      = "FFD0DCE8"; // thin border color
const C_OVERNIGHT   = "FFB8D8F8"; // light blue — overnight shift cells
const C_DAY         = "FFFFD3A0"; // warm orange — day shift cells
const C_INFO_BG     = "FFEEF5FF"; // info card background
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
 * logoUrl: fetched and embedded at the top of the sheet, horizontally centered.
 * homeId:  when provided, filters to that home only (safety net — API already filters).
 */
export async function exportScheduleToExcel({ homeName, homeId, payPeriodStart, payPeriodEnd, shifts, logoUrl }) {
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
	// SECTION 1 — LOGO
	// ═══════════════════════════════════════════════════════════════════════════
	// Use a tl+br two-cell anchor spanning a fixed number of date columns.
	// This avoids nativeColOff (sub-column pixel offsets are unreliable in ExcelJS)
	// and lets Excel position the image exactly at integer column boundaries.
	// Spanning 4 date columns (≈380 px) centers the logo within ~9 px of sheet center.
	const LOGO_ROWS = 6;
	const LOGO_SPAN = 4; // date columns the image spans

	for (let i = 0; i < LOGO_ROWS; i++) ws.addRow([]).height = 22;

	if (logoUrl) {
		try {
			const resp   = await fetch(logoUrl);
			const buffer = await resp.arrayBuffer();
			const imgId  = wb.addImage({ buffer, extension: "png" });

			// Pixel widths: Truncate(((width*7+5)/7)*7) for Calibri 11pt
			const nameColPx = 172; // col 0 (width=24)
			const dateColPx = 95;  // cols 1–N (width=13)
			const sheetPx   = nameColPx + dates.length * dateColPx;
			const spanPx    = LOGO_SPAN * dateColPx;

			// Find the column whose left edge is closest to the ideal center-left of the logo
			const idealLeft = (sheetPx - spanPx) / 2;
			let tlCol = 0;
			if (idealLeft >= nameColPx) {
				tlCol = 1 + Math.round((idealLeft - nameColPx) / dateColPx);
			}
			tlCol = Math.max(0, Math.min(tlCol, totalCols - LOGO_SPAN));

			ws.addImage(imgId, {
				tl: { col: tlCol,             row: 0          },
				br: { col: tlCol + LOGO_SPAN, row: LOGO_ROWS  },
			});
		} catch { /* logo fetch failed — blank rows still reserve the space */ }
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 2 — TITLE & SUBTITLE
	// ═══════════════════════════════════════════════════════════════════════════
	addMergedRow("NEW VISION CARE HOMES", 28, (cell) => {
		cell.font      = { bold: true, size: 16, color: { argb: C_NAVY }, name: "Calibri" };
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	addMergedRow("Staff Schedule", 18, (cell) => {
		cell.font      = { size: 11, color: { argb: C_BLUE_MED }, italic: true, name: "Calibri" };
		cell.alignment = { horizontal: "center", vertical: "middle" };
	});

	// ── Spacer ────────────────────────────────────────────────────────────────
	ws.addRow([]).height = 8;

	// ═══════════════════════════════════════════════════════════════════════════
	// SECTION 3 — INFO CARD
	// ═══════════════════════════════════════════════════════════════════════════
	const ppNumber   = calcPayPeriodNumber(payPeriodStart);
	const infoLines  = [
		[
			{ label: "House", value: homeName || "All Homes" },
			{ label: "Pay Period", value: `#${ppNumber}` },
		],
		[
			{ label: "Period Dates", value: `${format(payPeriodStart, "MMM d, yyyy")}  –  ${format(payPeriodEnd, "MMM d, yyyy")}` },
		],
	];

	infoLines.forEach((pairs, rowIdx) => {
		const isFirst = rowIdx === 0;
		const isLast  = rowIdx === infoLines.length - 1;

		// Build cell text: "Label:  Value    Label:  Value"
		const text = pairs.map((p) => `${p.label}:   ${p.value}`).join("        ");
		const row  = ws.addRow([text]);
		row.height = 20;
		ws.mergeCells(row.number, 1, row.number, totalCols);

		const cell = row.getCell(1);
		cell.fill      = solidFill(C_INFO_BG);
		cell.font      = { size: 10, color: { argb: C_NAVY }, name: "Calibri" };
		cell.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
		cell.border    = {
			left:   medSide(),
			right:  thinSide(),
			top:    isFirst ? thinSide() : { style: "hair", color: { argb: C_BORDER } },
			bottom: isLast  ? thinSide() : undefined,
		};

		// Bold the label portions — ExcelJS rich text
		const richText = pairs.flatMap((p, i) => [
			...(i > 0 ? [{ text: "        " }] : []),
			{ text: `${p.label}:  `, font: { bold: true, size: 10, color: { argb: C_NAVY } } },
			{ text: p.value,          font: { size: 10,  color: { argb: C_NAVY } } },
		]);
		cell.value = { richText };
	});

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
