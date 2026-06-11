import { format, addDays } from "date-fns";
import { utcToZonedDateObject } from "@/utils/timeHandling";
import { formatPayPeriodLabel } from "@/utils/payPeriod";

const HALIFAX_TZ = "America/Halifax";
const INCLUDED_STATUSES = new Set(["scheduled", "completed", "in_progress"]);

// ARGB color constants
const C_NAVY     = "FF1C4A6E"; // app primary — table header background
const C_WHITE    = "FFFFFFFF";
const C_ROW_ALT  = "FFF0F5FA"; // light blue-gray for alternating data rows
const C_NAME_COL = "FFE8EFF6"; // tinted background for the Name column
const C_BORDER   = "FFD1D9E6"; // light gray border color

function allBorders() {
	const side = { style: "thin", color: { argb: C_BORDER } };
	return { top: side, left: side, bottom: side, right: side };
}

/**
 * Exports a roster-style Excel schedule for a 14-day pay period.
 *
 * homeId: when provided, only shifts belonging to that home are included.
 *         When null/empty, all shifts in the period are shown (All Homes).
 * payYear / periodNumber: the period's identity as resolved by the backend
 *         (GET /api/hours/pay-periods) — not recomputed here.
 */
export async function exportScheduleToExcel({ homeName, homeId, payPeriodStart, payPeriodEnd, payYear, periodNumber, shifts }) {
	// Dynamic import keeps ExcelJS out of the SSR bundle
	const ExcelJS = (await import("exceljs")).default;

	// Build the list of dates spanning the pay period
	const dates = [];
	let cursor = new Date(payPeriodStart);
	while (cursor <= payPeriodEnd) {
		dates.push(new Date(cursor));
		cursor = addDays(cursor, 1);
	}

	// Filter by status.
	// If a homeId is selected, also filter by home — the API already does this,
	// but we do it here too as an explicit safety net.
	const filtered = (shifts || []).filter((s) => {
		if (!INCLUDED_STATUSES.has(s.status)) return false;
		if (homeId) {
			const shiftHomeId = s.home?._id || s.home?.id;
			return shiftHomeId === homeId;
		}
		return true; // no home selected → include all shifts
	});

	// Build caregiver name map and shift-time map keyed by [caregiverId][dateStr]
	const caregiverNames = {};
	const shiftMap = {};

	filtered.forEach((shift) => {
		const cgId = shift.caregiver?._id || shift.caregiver?.id;
		if (!cgId) return;

		caregiverNames[cgId] = [shift.caregiver?.firstName, shift.caregiver?.lastName]
			.filter(Boolean).join(" ") || "Unknown";

		const startLocal = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
		const endLocal   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
		const dateStr    = format(startLocal, "yyyy-MM-dd");
		const timeRange  = `${format(startLocal, "H:mm")}-${format(endLocal, "H:mm")}`;

		if (!shiftMap[cgId]) shiftMap[cgId] = {};
		if (!shiftMap[cgId][dateStr]) shiftMap[cgId][dateStr] = [];
		shiftMap[cgId][dateStr].push(timeRange);
	});

	const sortedCgIds = Object.keys(caregiverNames).sort((a, b) =>
		caregiverNames[a].localeCompare(caregiverNames[b])
	);

	// ── Build workbook ────────────────────────────────────────────────────────
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Schedule");

	ws.columns = [
		{ width: 22 },                      // Name column
		...dates.map(() => ({ width: 13 })), // one column per day
	];

	// ── Info block (above the table, plain bold text, no borders) ────────────
	[
		`House: ${homeName || "All Homes"}`,
		`Start Date: ${format(payPeriodStart, "MMM d, yyyy")}`,
		`End Date: ${format(payPeriodEnd, "MMM d, yyyy")}`,
		`Pay Period: ${formatPayPeriodLabel({ payYear, periodNumber })}`,
	].forEach((label) => {
		const row = ws.addRow([label]);
		row.getCell(1).font = { bold: true, size: 11, color: { argb: C_NAVY } };
	});

	ws.addRow([]); // blank spacer row between info and table

	// ── Table header row ─────────────────────────────────────────────────────
	const headerRow = ws.addRow([
		"Name",
		...dates.map((d) => `${format(d, "EEE")}\n${format(d, "MMM d")}`),
	]);
	headerRow.height = 36; // tall enough for two-line date headers

	headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
		if (colNum > dates.length + 1) return;
		cell.font      = { bold: true, size: 11, color: { argb: C_WHITE } };
		cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: C_NAVY } };
		cell.border    = allBorders();
		cell.alignment = {
			horizontal: colNum === 1 ? "left" : "center",
			vertical:   "middle",
			wrapText:   true,
		};
	});

	// ── Data rows ─────────────────────────────────────────────────────────────
	if (sortedCgIds.length === 0) {
		const r = ws.addRow(["No shifts found for this period."]);
		r.getCell(1).font = { italic: true, size: 11, color: { argb: "FF6B7280" } };
	} else {
		sortedCgIds.forEach((cgId, idx) => {
			const rowBg = idx % 2 === 1 ? C_ROW_ALT : C_WHITE;

			const cells = [
				caregiverNames[cgId],
				...dates.map((d) => {
					const times = shiftMap[cgId]?.[format(d, "yyyy-MM-dd")];
					return times ? times.join(", ") : "";
				}),
			];

			const row = ws.addRow(cells);
			row.height = 20;

			row.eachCell({ includeEmpty: true }, (cell, colNum) => {
				if (colNum > dates.length + 1) return;
				cell.border    = allBorders();
				cell.alignment = {
					horizontal: colNum === 1 ? "left" : "center",
					vertical:   "middle",
				};
				if (colNum === 1) {
					// Name column: tinted background + bold
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C_NAME_COL } };
					cell.font = { bold: true, size: 11 };
				} else {
					// Date columns: alternating row tint
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
					cell.font = { size: 11 };
				}
			});
		});
	}

	// ── Trigger browser download ──────────────────────────────────────────────
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
