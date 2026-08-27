"use client";

import { useMemo } from "react";
import { format, addDays } from "date-fns";
import { DateTime } from "luxon";
import { Download, Moon, Sun, User } from "lucide-react";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import { utcToZonedDateObject, expandShiftDays } from "@/utils/timeHandling";
import { exportScheduleToExcel } from "@/utils/excelExport/scheduleSheet";
import logoImg from "@/assets/logo/nv.png";
import styles from "../scheduling.module.css";

const HALIFAX_TZ = "America/Halifax";

// Rank order for the # badge: first match wins (missed is worst, completed is best)
const STATUS_PRIORITY = ["missed", "cancelled", "in_progress", "scheduled", "completed"];
const STATUS_BADGE_COLORS = {
	missed:      { background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" },
	cancelled:   { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
	in_progress: { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
	scheduled:   { background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" },
	completed:   { background: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" },
};

/**
 * Caregivers × dates table for the current pay period, matching the Excel
 * export layout. Status-coloured chips per cell; click any chip to open the
 * shift detail.
 */
export default function OverviewView({
	payrollShifts,
	payrollPeriod,
	payPeriodError,
	payrollError,
	isPayrollLoading,
	refetchPayroll,
	homes,
	selectedHomeId,
	getCaregiverColor,
	router,
}) {
	const dates = useMemo(() => {
		if (!payrollPeriod) return [];
		const arr = [];
		let cursor = new Date(payrollPeriod.start);
		while (cursor <= payrollPeriod.end) {
			arr.push(new Date(cursor));
			cursor = addDays(cursor, 1);
		}
		return arr;
	}, [payrollPeriod]);

	const todayStr = useMemo(() => {
		const dt = DateTime.now().setZone(HALIFAX_TZ);
		return format(new Date(dt.year, dt.month - 1, dt.day), "yyyy-MM-dd");
	}, []);

	const { cgNames, shiftMap, sortedCgIds, stats } = useMemo(() => {
		const filtered = payrollShifts || [];
		const names = {};
		const map   = {};

		filtered.forEach((shift) => {
			const cgId = shift.caregiver?._id || shift.caregiver?.id;
			if (!cgId) return;
			names[cgId] = [shift.caregiver?.firstName, shift.caregiver?.lastName]
				.filter(Boolean).join(" ") || "Unknown";

			const startLocal = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
			const endLocal   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
			const id         = shift._id || shift.id;
			const startTime  = format(startLocal, "H:mm");
			const endTime    = format(endLocal, "H:mm");
			const fullRange  = `${startTime}–${endTime}`;

			// A multi-day shift must appear on every day it spans, not just its
			// start day. expandShiftDays yields one entry per Halifax calendar day.
			expandShiftDays(shift.startTime, shift.endTime, HALIFAX_TZ).forEach((seg) => {
				const multiDay = seg.spanDays > 1;
				// Any shift that crosses midnight reads as a "night"/overnight chip.
				const isNight  = multiDay || startLocal.getHours() >= 18;

				if (!map[cgId])              map[cgId]              = {};
				if (!map[cgId][seg.dateStr]) map[cgId][seg.dateStr] = [];
				map[cgId][seg.dateStr].push({
					fullRange,
					startTime,
					endTime,
					status: shift.status,
					id,
					isNight,
					spanDays: seg.spanDays,
					isFirst: seg.isFirst,
					isLast: seg.isLast,
					sortKey: seg.segStart.getTime(),
				});
			});
		});

		// Two different shifts can land on the same caregiver/day (e.g. one
		// overnight shift ends at 7am and another starts at 7pm). Sort by
		// time so they read left-to-right in one row instead of whatever
		// order the shifts happened to come back from the API in.
		Object.values(map).forEach((byDate) => {
			Object.values(byDate).forEach((dayEntries) => dayEntries.sort((a, b) => a.sortKey - b.sortKey));
		});

		const ids = Object.keys(names).sort((a, b) => names[a].localeCompare(names[b]));

		const scheduledHrs = filtered.reduce(
			(sum, s) => sum + (new Date(s.endTime) - new Date(s.startTime)) / 3_600_000, 0
		);
		const workedHrs = filtered.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
		const cgSet = new Set(filtered.map((s) => s.caregiver?._id || s.caregiver?.id).filter(Boolean));

		return {
			cgNames:     names,
			shiftMap:    map,
			sortedCgIds: ids,
			stats: {
				total:      filtered.length,
				scheduled:  scheduledHrs.toFixed(1),
				worked:     workedHrs.toFixed(1),
				caregivers: cgSet.size,
			},
		};
	}, [payrollShifts]);

	if (isPayrollLoading || (!payrollPeriod && !payPeriodError)) return <ErrorState isLoading />;
	if (payPeriodError)   return <ErrorState errorMessage={payPeriodError} />;
	if (payrollError)     return <ErrorState errorMessage={payrollError} onRetry={refetchPayroll} />;

	return (
		<div className={styles.overviewView}>
			{/* Stats */}
			<div className={styles.payrollStats}>
				{[
					{ value: stats.total,            label: "Shifts"     },
					{ value: `${stats.scheduled} h`, label: "Scheduled"  },
					{ value: `${stats.worked} h`,    label: "Worked"     },
					{ value: stats.caregivers,       label: "Caregivers" },
				].map(({ value, label }) => (
					<div key={label} className={styles.payrollStatCard}>
						<span className={styles.payrollStatValue}>{value}</span>
						<span className={styles.payrollStatLabel}>{label}</span>
					</div>
				))}
			</div>

			{sortedCgIds.length === 0 ? (
				<div className={styles.overviewEmpty}>No shifts scheduled for this pay period.</div>
			) : (
				<>
					{/* Status legend + export */}
					<div className={styles.overviewLegend}>
						<span className={styles.overviewLegendLabel}>Status:</span>
						{[
							{ key: "completed",   label: "Completed"   },
							{ key: "scheduled",   label: "Scheduled"   },
							{ key: "in_progress", label: "In Progress" },
							{ key: "cancelled",   label: "Cancelled"   },
							{ key: "missed",      label: "Missed"      },
						].map(({ key, label }) => (
							<span
								key={key}
								className={`${styles.overviewChip} ${styles[`overviewChip_${key}`]} ${styles.overviewChipStatic}`}
							>
								{label}
							</span>
						))}
						<div style={{ marginLeft: "auto" }}>
							<Button
								variant="excel"
								size="sm"
								icon={<Download size={14} />}
								disabled={!payrollPeriod}
								onClick={async () => {
									if (!payrollPeriod) return;
									const selectedHome = homes.find((h) => (h._id || h.id) === selectedHomeId);
									const homeName = selectedHome
										? (selectedHome.name || selectedHome.homeName)
										: "All Homes";
									await exportScheduleToExcel({
										homeName,
										homeId:         selectedHomeId || null,
										payPeriodStart: payrollPeriod.start,
										payPeriodEnd:   payrollPeriod.end,
										payYear:        payrollPeriod.payYear,
										periodNumber:   payrollPeriod.periodNumber,
										shifts:         payrollShifts,
										logoUrl:        logoImg.src,
									});
								}}
							>
								Export Schedule
							</Button>
						</div>
					</div>

					{/* Roster grid */}
					<div className={styles.overviewTableWrap}>
						<table className={styles.overviewTable}>
							<thead>
								<tr>
									<th className={styles.overviewNameHeader}>Caregiver</th>
									{dates.map((d) => {
										const ds      = format(d, "yyyy-MM-dd");
										const isToday = ds === todayStr;
										return (
											<th
												key={ds}
												className={`${styles.overviewDayHeader}${isToday ? ` ${styles.overviewDayHeaderToday}` : ""}`}
											>
												<span className={styles.overviewDayName}>{format(d, "EEE")}</span>
												<span className={styles.overviewDayNum}>{format(d, "d")}</span>
												<span className={styles.overviewDayMon}>{format(d, "MMM")}</span>
												{isToday && <span className={styles.overviewTodayPill}>today</span>}
											</th>
										);
									})}
									<th className={styles.overviewTotalHeader}>#</th>
								</tr>
							</thead>
							<tbody>
								{sortedCgIds.map((cgId, idx) => {
									// Registers cgId with the shared color assigner (used by the
									// week/day/agenda views too, so caregiver colors stay
									// consistent across views within this page visit).
									getCaregiverColor(cgId);
									const allEntries  = Object.values(shiftMap[cgId] || {}).flat();
									// Count distinct shifts — a multi-day shift spans several cells
									// but is still one shift, so dedupe on id for the badge.
									const totalShifts = new Set(allEntries.map((e) => e.id)).size;
									const statusSet   = new Set(allEntries.map((e) => e.status));
									const dominant    = STATUS_PRIORITY.find((s) => statusSet.has(s)) || "completed";
									const badgeStyle  = STATUS_BADGE_COLORS[dominant];
									return (
										<tr
											key={cgId}
											className={`${styles.overviewRow}${idx % 2 === 0 ? ` ${styles.overviewRowEven}` : ""}`}
										>
											<td
												className={styles.overviewNameCell}
												style={{ borderLeft: `4px solid ${badgeStyle.borderColor}` }}
											>
												<div className={styles.overviewNameInner}>
													<User size={13} style={{ color: badgeStyle.borderColor, flexShrink: 0 }} />
													{cgNames[cgId]}
												</div>
											</td>
											{dates.map((d) => {
												const ds      = format(d, "yyyy-MM-dd");
												const entries = shiftMap[cgId]?.[ds] || [];
												const isToday = ds === todayStr;
												// Entries are sorted left-to-right by start time (see above), so
												// only the leftmost/rightmost entry can be touching a neighbouring
												// day cell. If it's a segment that continues onto that neighbour,
												// drop this cell's own padding/border on that side so the chip
												// inside can butt flush against it (see .overviewCellBlend* /
												// .overviewChipSpan*). Entries sharing this cell with each other
												// (e.g. one shift ending 7am, another starting 7pm) stay separated
												// by the normal gap between them — only the outer edges blend.
												const leftEntry  = entries[0];
												const rightEntry = entries[entries.length - 1];
												const blendLeft  = leftEntry  && leftEntry.spanDays  > 1 && !leftEntry.isFirst;
												const blendRight = rightEntry && rightEntry.spanDays > 1 && !rightEntry.isLast;
												const cellSpanClass = [
													blendLeft  ? styles.overviewCellBlendLeft  : "",
													blendRight ? styles.overviewCellBlendRight : "",
												].filter(Boolean).join(" ");
												return (
													<td
														key={ds}
														className={`${styles.overviewCell}${isToday ? ` ${styles.overviewCellToday}` : ""}${cellSpanClass ? ` ${cellSpanClass}` : ""}`}
													>
														<div className={styles.overviewCellRow}>
														{entries.map((entry, i) => {
															const isMultiDay = entry.spanDays > 1;
															// Overnight shifts get a "span" modifier so the chip bleeds into
															// the next/previous day cell, reading as one continuous bar
															// across the days it covers instead of separate disjoint chips.
															const spanClass = !isMultiDay
																? ""
																: entry.isFirst ? styles.overviewChipSpanStart
																: entry.isLast  ? styles.overviewChipSpanEnd
																:                 styles.overviewChipSpanMiddle;
															// An overnight shift only needs one icon and one arrow, both on the
															// start day. The arrow is pushed to the bar's far (right) edge so it
															// sits right on the day boundary instead of repeating on the end day.
															// The end day just shows the end time; any full days in between stay
															// blank — just the continuous bar.
															let content = null;
															if (!isMultiDay) {
																content = (
																	<>
																		{entry.isNight
																			? <Moon size={9} style={{ flexShrink: 0 }} />
																			: <Sun  size={9} style={{ flexShrink: 0 }} />}
																		{entry.fullRange}
																	</>
																);
															} else if (entry.isFirst) {
																content = (
																	<>
																		{entry.isNight
																			? <Moon size={9} style={{ flexShrink: 0 }} />
																			: <Sun  size={9} style={{ flexShrink: 0 }} />}
																		{entry.startTime}
																		<span style={{ marginLeft: "auto" }}>→</span>
																	</>
																);
															} else if (entry.isLast) {
																content = entry.endTime;
															} else {
																// A full middle day of a 3+ day shift: no label, but a
																// non-breaking space (not empty) keeps this chip's line
																// height identical to its labelled neighbours so the whole
																// bar sits flush on the same line across the row.
																content = " ";
															}
															return (
																<span
																	key={i}
																	className={`${styles.overviewChip} ${styles[`overviewChip_${entry.status}`] || styles.overviewChip_scheduled} ${spanClass}`}
																	onClick={() => entry.id && router.push(`/scheduling/${entry.id}`)}
																	title={`${cgNames[cgId]} · ${entry.fullRange}${entry.spanDays > 1 ? ` · ${entry.spanDays}-day shift${!entry.isFirst ? " (continues)" : ""}` : ""} · ${entry.isNight ? "Night" : "Day"} · ${entry.status}`}
																>
																	{content}
																</span>
															);
														})}
														</div>
													</td>
												);
											})}
											<td className={styles.overviewTotalCell}>
												{totalShifts > 0 && (
													<span
														className={styles.overviewTotalBadge}
														style={badgeStyle}
													>
														{totalShifts}
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</>
			)}
		</div>
	);
}
