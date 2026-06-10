"use client";

/**
 * Shift Builder — /scheduling/shift_builder
 *
 * Lets admins bulk-create shifts for all caregivers in a home over a date range.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Pick a home → the table fills with that home's caregivers as rows
 *    and the selected date range as columns.
 * 2. Click any empty cell to assign a Day shift (D).
 *    Click again → Night (N) → Custom (C) → clear (back to empty).
 * 3. For Custom shifts, pick start/end times directly inside the cell.
 * 4. Hit "Publish" → sends one bulk API call, then shows a success/failure summary.
 *
 * SHIFT TYPES
 * ───────────
 * D (Day)    — times come from the "Day Shift" pickers in the controls bar.
 * N (Night)  — times come from the "Night Shift" pickers.
 * C (Custom) — inline time dropdowns rendered inside the cell itself.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
	Building2,
	CalendarRange,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	XCircle,
	AlertCircle,
	LayoutGrid,
	Moon,
	RotateCcw,
	Sun,
	Zap,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { DateTime } from "luxon";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import { useHomes } from "@/hooks/useHomes";
import { useShifts } from "@/hooks/useShifts";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

import styles from "./shift_builder.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const HALIFAX_TZ = "America/Halifax";

// Cap the grid at 42 days to prevent runaway renders on very wide date ranges.
const MAX_DAYS = 42;


// Every 30-minute slot from 00:00 to 23:30, used in the Custom cell dropdowns.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
	const hour   = Math.floor(i / 2);
	const minute = i % 2 === 0 ? "00" : "30";
	return `${String(hour).padStart(2, "0")}:${minute}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Luxon DateTime in the Halifax timezone. */
function getHalifaxNow() {
	return DateTime.now().setZone(HALIFAX_TZ);
}

/** Returns today's date as "yyyy-MM-dd" in the Halifax timezone. */
function getTodayInHalifax() {
	const now = getHalifaxNow();
	return format(new Date(now.year, now.month - 1, now.day), "yyyy-MM-dd");
}


// ─── Sub-component: ShiftCell ─────────────────────────────────────────────────

/**
 * A single clickable cell in the schedule grid.
 *
 * Props:
 *   assignment        — the current value for this cell, or undefined when empty.
 *                       Shape: { type: 'day'|'night'|'custom', customStart: '', customEnd: '' }
 *   dayStart/dayEnd   — the global day-shift hours (shown as a hint on Day cells).
 *   nightStart/nightEnd — the global night-shift hours (shown on Night cells).
 *   onCycle           — called when the cell is clicked to advance to the next state.
 *   onSetCustomTime   — called when a custom time dropdown changes.
 *                       Signature: (field: 'customStart'|'customEnd', value: string) => void
 */
function ShiftCell({ assignment, dayStart, dayEnd, nightStart, nightEnd, onCycle, onSetCustomTime }) {
	const type = assignment?.type;

	// Empty — shows an invisible clickable area with a dashed hover outline
	if (!type) {
		return (
			<button
				className={styles.cellEmpty}
				onClick={onCycle}
				title="Click to assign a Day shift"
			/>
		);
	}

	// Day shift
	if (type === "day") {
		return (
			<button
				className={styles.cellDay}
				onClick={onCycle}
				title={`Day · ${dayStart}–${dayEnd}\nClick to change to Night`}
			>
				<Sun size={11} className={styles.cellIcon} />
				<span className={styles.cellLetter}>D</span>
				<span className={styles.cellHint}>{dayStart}–{dayEnd}</span>
			</button>
		);
	}

	// Night shift
	if (type === "night") {
		return (
			<button
				className={styles.cellNight}
				onClick={onCycle}
				title={`Night · ${nightStart}–${nightEnd}\nClick to change to Custom`}
			>
				<Moon size={11} className={styles.cellIcon} />
				<span className={styles.cellLetter}>N</span>
				<span className={styles.cellHint}>{nightStart}–{nightEnd}</span>
			</button>
		);
	}

	// Custom shift — shows a "C" badge + inline time dropdowns
	return (
		<div className={styles.cellCustom}>
			<button
				className={styles.cellCustomBadge}
				onClick={onCycle}
				title="Custom shift · click to remove"
			>
				C
			</button>

			{/*
			 * stopPropagation prevents a click on the selects from also
			 * triggering onCycle (which would remove the custom assignment).
			 */}
			<div className={styles.cellCustomRange} onClick={(e) => e.stopPropagation()}>
				<select
					className={styles.cellTimeSelect}
					value={assignment.customStart || ""}
					onChange={(e) => { e.stopPropagation(); onSetCustomTime("customStart", e.target.value); }}
					onClick={(e) => e.stopPropagation()}
				>
					<option value="">--</option>
					{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
				</select>

				<span className={styles.cellRangeDash}>–</span>

				<select
					className={styles.cellTimeSelect}
					value={assignment.customEnd || ""}
					onChange={(e) => { e.stopPropagation(); onSetCustomTime("customEnd", e.target.value); }}
					onClick={(e) => e.stopPropagation()}
				>
					<option value="">--</option>
					{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
				</select>
			</div>
		</div>
	);
}

// ─── Sub-component: BulkResultBanner ─────────────────────────────────────────

/**
 * Shows the outcome after "Publish" is clicked:
 * — a green "X created" badge for successes
 * — a red "Y failed" badge + expandable list for errors
 *
 * Props:
 *   result — the API response object, or null when nothing has been submitted yet.
 */
function BulkResultBanner({ result }) {
	const [showFailed, setShowFailed] = useState(false);

	if (!result) return null;

	const createdCount = result.summary?.created ?? 0;
	const failedCount  = result.summary?.failed  ?? 0;

	return (
		<div className={styles.resultCard}>
			<div className={styles.resultSummaryRow}>
				<CheckCircle2 size={18} className={styles.resultOkIcon} />
				<span className={styles.resultTitle}>Bulk publish complete</span>
				<span className={styles.resultCreatedBadge}>{createdCount} created</span>
				{failedCount > 0 && (
					<span className={styles.resultFailedBadge}>{failedCount} failed</span>
				)}
			</div>

			{result.failed?.length > 0 && (
				<div className={styles.resultFailSection}>
					<button
						className={styles.resultToggle}
						onClick={() => setShowFailed((prev) => !prev)}
					>
						{showFailed ? "Hide" : "Show"} failed assignments
						{showFailed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</button>

					{showFailed && (
						<div className={styles.failList}>
							{result.failed.map((failure, i) => (
								<div key={i} className={styles.failItem}>
									<XCircle size={12} className={styles.failIcon} />
									<span className={styles.failDate}>{failure.date}</span>
									<span className={styles.failType}>{failure.type}</span>
									<span className={styles.failCode}>{failure.code}</span>
									{failure.error && (
										<span className={styles.failMsg}>— {failure.error}</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShiftBuilderPage() {
	const [mobileOpen, setMobileOpen] = useState(false);

	// ── User-controlled filters ───────────────────────────────────────────────

	const [selectedHomeId, setSelectedHomeId] = useState("");

	// Default date range: today through today + 13 days (14 days total)
	const [startDate, setStartDate] = useState(() => getTodayInHalifax());
	const [endDate,   setEndDate]   = useState(() => {
		const now = getHalifaxNow();
		return format(addDays(new Date(now.year, now.month - 1, now.day), 13), "yyyy-MM-dd");
	});

	// Global shift hours — apply to all Day / Night cells unless a cell is set to Custom
	const [dayStart,   setDayStart]   = useState("07:00");
	const [dayEnd,     setDayEnd]     = useState("19:00");
	const [nightStart, setNightStart] = useState("19:00");
	const [nightEnd,   setNightEnd]   = useState("07:00");

	// ── Grid assignments ──────────────────────────────────────────────────────
	/*
	 * Nested map:  caregiverId  →  dateStr  →  { type, customStart, customEnd }
	 *
	 * Example:
	 *   {
	 *     "cg-001": {
	 *       "2026-06-10": { type: "day",    customStart: "",      customEnd: ""      },
	 *       "2026-06-11": { type: "custom", customStart: "08:00", customEnd: "16:00" },
	 *     }
	 *   }
	 */
	const [assignments, setAssignments] = useState({});

	// ── Submission feedback ───────────────────────────────────────────────────

	const [bulkResult,  setBulkResult]  = useState(null);
	const [submitError, setSubmitError] = useState(null);

	// ── Data fetching ─────────────────────────────────────────────────────────

	// All homes for the dropdown
	const { homes, isLoading: homesLoading } = useHomes({ limit: 100 });

	// The selected home's full record — includes its caregivers list
	const { homeDetail, isLoading: homeDetailLoading } = useHomes(selectedHomeId);

	const { createBulkShifts, isBulkPending, bulkShiftError } = useShifts();

	// Auto-select the first home once the list finishes loading
	useEffect(() => {
		if (homes?.length && !selectedHomeId) {
			setSelectedHomeId(homes[0]._id || homes[0].id);
		}
	}, [homes, selectedHomeId]);

	// ── Derived data ──────────────────────────────────────────────────────────

	// Caregivers that belong to the selected home
	const caregivers = homeDetail?.caregivers ?? [];

	// Array of "yyyy-MM-dd" strings for every day in the selected range
	const dates = useMemo(() => {
		if (!startDate || !endDate) return [];
		try {
			const start   = parseISO(startDate);
			const end     = parseISO(endDate);
			if (start > end) return [];

			const result  = [];
			let   current = start;
			while (current <= end && result.length < MAX_DAYS) {
				result.push(format(current, "yyyy-MM-dd"));
				current = addDays(current, 1);
			}
			return result;
		} catch {
			return [];
		}
	}, [startDate, endDate]);

	const todayStr = useMemo(() => getTodayInHalifax(), []);

	// Set for O(1) "is this date in range?" look-ups.
	// Used to exclude stale assignments when the date range changes after cells are filled.
	const dateSet = useMemo(() => new Set(dates), [dates]);

	// Total assigned cells that fall within the current date range
	const assignmentCount = useMemo(() => {
		return Object.values(assignments).reduce((total, caregiverDateMap) => {
			const inRange = Object.keys(caregiverDateMap).filter((d) => dateSet.has(d)).length;
			return total + inRange;
		}, 0);
	}, [assignments, dateSet]);

	// ── Cell & grid handlers ──────────────────────────────────────────────────

	/**
	 * Advances a cell through the cycle: empty → day → night → custom → empty.
	 * Uses a functional update to avoid stale closures inside the state updater.
	 */
	const cycleCell = useCallback((caregiverId, dateStr) => {
		setAssignments((prev) => {
			const caregiverMap = { ...(prev[caregiverId] || {}) };
			const current      = caregiverMap[dateStr];

			if (!current) {
				caregiverMap[dateStr] = { type: "day", customStart: "", customEnd: "" };
			} else if (current.type === "day") {
				caregiverMap[dateStr] = { type: "night", customStart: "", customEnd: "" };
			} else if (current.type === "night") {
				caregiverMap[dateStr] = { type: "custom", customStart: "", customEnd: "" };
			} else {
				// custom → remove the assignment entirely
				delete caregiverMap[dateStr];
			}

			return { ...prev, [caregiverId]: caregiverMap };
		});
	}, []);

	/** Updates one time field (customStart or customEnd) on a Custom cell. */
	const setCustomTime = useCallback((caregiverId, dateStr, field, value) => {
		setAssignments((prev) => ({
			...prev,
			[caregiverId]: {
				...(prev[caregiverId] || {}),
				[dateStr]: {
					...(prev[caregiverId]?.[dateStr] || {}),
					[field]: value,
				},
			},
		}));
	}, []);

	/** Removes all assignments for one caregiver row. */
	const clearRow = useCallback((caregiverId) => {
		setAssignments((prev) => {
			const next = { ...prev };
			delete next[caregiverId];
			return next;
		});
	}, []);

	/** Resets the entire grid and any submission feedback. */
	const clearAll = useCallback(() => {
		setAssignments({});
		setBulkResult(null);
		setSubmitError(null);
	}, []);

	/** Switches to a different home and clears grid data from the previous home. */
	const handleHomeChange = useCallback((homeId) => {
		setSelectedHomeId(homeId);
		clearAll();
	}, [clearAll]);

	// ── Submit ────────────────────────────────────────────────────────────────

	/**
	 * Sends all current assignments to the backend as one bulk API call.
	 *
	 * Only assignments inside the current date range are included — this
	 * prevents stale data from a previous date range from sneaking into the
	 * payload if the user changed the range after filling cells.
	 */
	const handleSubmit = async () => {
		if (!selectedHomeId || assignmentCount === 0 || isBulkPending) return;

		setBulkResult(null);
		setSubmitError(null);

		// Build payload: one entry per caregiver, each listing their date assignments
		const caregiverPayload = [];

		for (const [caregiverId, dateMap] of Object.entries(assignments)) {
			const inRangeAssignments = Object.entries(dateMap)
				.filter(([dateStr, value]) => dateSet.has(dateStr) && !!value?.type)
				.map(([dateStr, value]) => {
					const entry = { date: dateStr, type: value.type };
					// Custom shifts carry their own start/end times
					if (value.type === "custom") {
						entry.customTime = { start: value.customStart, end: value.customEnd };
					}
					return entry;
				});

			if (inRangeAssignments.length > 0) {
				caregiverPayload.push({ caregiverId, assignments: inRangeAssignments });
			}
		}

		if (caregiverPayload.length === 0) return;

		try {
			const result = await createBulkShifts({
				startDate,
				endDate,
				homeId:     selectedHomeId,
				timezone:   HALIFAX_TZ,
				dayShift:   { start: dayStart,   end: dayEnd   },
				nightShift: { start: nightStart, end: nightEnd },
				caregivers: caregiverPayload,
			});
			setBulkResult(result);
		} catch (err) {
			setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	const isLoading = homesLoading || (!!selectedHomeId && homeDetailLoading);

	return (
		<div className={styles.page}>
			<Navbar onMenuClick={() => setMobileOpen(true)} />
			<div className={styles.container}>
				<Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

				<main className={styles.body}>

					{/* ── Page header ───────────────────────────────────────── */}
					<div className={styles.header}>
						<div>
							<div className={styles.titleRow}>
								<LayoutGrid size={26} className={styles.titleIcon} />
								<h1 className={styles.heading}>Shift Builder</h1>
							</div>
							<p className={styles.subtitle}>
								Click any cell to cycle&nbsp;
								<span className={styles.cycleHint}>D</span>&nbsp;→&nbsp;
								<span className={styles.cycleHint}>N</span>&nbsp;→&nbsp;
								<span className={styles.cycleHint}>C</span>&nbsp;→ clear, then publish
							</p>
						</div>

						<div className={styles.headerActions}>
							{assignmentCount > 0 && (
								<button className={styles.clearBtn} onClick={clearAll}>
									<RotateCcw size={13} />
									Clear all
								</button>
							)}
							<Button
								icon={<Zap size={15} />}
								onClick={handleSubmit}
								disabled={!selectedHomeId || assignmentCount === 0 || isBulkPending}
							>
								{isBulkPending
									? "Publishing…"
									: `Publish ${assignmentCount > 0 ? assignmentCount : ""} Shift${assignmentCount !== 1 ? "s" : ""}`}
							</Button>
						</div>
					</div>

					{/* ── Controls bar ──────────────────────────────────────── */}
					<div className={styles.controlsBar}>

						{/* Home picker */}
						<div className={styles.controlGroup}>
							<label className={styles.controlLabel}>
								<Building2 size={13} /> Home
							</label>
							<select
								className={styles.controlSelect}
								value={selectedHomeId}
								onChange={(e) => handleHomeChange(e.target.value)}
								disabled={homesLoading}
							>
								<option value="">Select a home…</option>
								{homes?.map((home) => {
									const id = home._id || home.id;
									return (
										<option key={id} value={id}>
											{home.name || home.homeName || `Home ${id}`}
										</option>
									);
								})}
							</select>
						</div>

						{/* Date range pickers */}
						<div className={styles.controlGroup}>
							<label className={styles.controlLabel}>
								<CalendarRange size={13} /> Date Range
							</label>
							<div className={styles.controlRow}>
								<input
									className={styles.controlInput}
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
								<span className={styles.controlSep}>–</span>
								<input
									className={styles.controlInput}
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>

						{/* Day shift hours */}
						<div className={styles.controlGroup}>
							<label className={styles.controlLabel}>
								<Sun size={13} /> Day Shift
							</label>
							<div className={styles.controlRow}>
								<input
									className={styles.controlInput}
									type="time"
									value={dayStart}
									onChange={(e) => setDayStart(e.target.value)}
								/>
								<span className={styles.controlSep}>–</span>
								<input
									className={styles.controlInput}
									type="time"
									value={dayEnd}
									onChange={(e) => setDayEnd(e.target.value)}
								/>
							</div>
						</div>

						{/* Night shift hours */}
						<div className={styles.controlGroup}>
							<label className={styles.controlLabel}>
								<Moon size={13} /> Night Shift
							</label>
							<div className={styles.controlRow}>
								<input
									className={styles.controlInput}
									type="time"
									value={nightStart}
									onChange={(e) => setNightStart(e.target.value)}
								/>
								<span className={styles.controlSep}>–</span>
								<input
									className={styles.controlInput}
									type="time"
									value={nightEnd}
									onChange={(e) => setNightEnd(e.target.value)}
								/>
							</div>
						</div>

					</div>

					{/* ── Error banner ───────────────────────────────────────── */}
					{(submitError || bulkShiftError) && (
						<div className={styles.errorBanner}>
							<AlertCircle size={15} />
							<span>{submitError || bulkShiftError}</span>
						</div>
					)}

					{/* ── Success / failure summary after publishing ─────────── */}
					<BulkResultBanner result={bulkResult} />

					{/* ── Schedule grid ─────────────────────────────────────── */}
					{!selectedHomeId ? (
						<div className={styles.emptyState}>
							<Building2 size={32} className={styles.emptyIcon} />
							<p>Select a home to start building shifts</p>
						</div>
					) : isLoading ? (
						<div className={styles.tableCard}>
							<ErrorState isLoading />
						</div>
					) : caregivers.length === 0 ? (
						<div className={styles.emptyState}>
							No active caregivers found for this home.
						</div>
					) : dates.length === 0 ? (
						<div className={styles.emptyState}>
							Enter a valid date range to start.
						</div>
					) : (
						<div className={styles.tableCard}>
							<div className={styles.tableWrap}>
								<table className={styles.table}>

									{/* Column headers — one per date */}
									<thead>
										<tr>
											<th className={styles.thName}>Caregiver</th>
											{dates.map((dateStr) => {
												const date    = parseISO(dateStr);
												const isToday = dateStr === todayStr;
												return (
													<th
														key={dateStr}
														className={`${styles.thDate}${isToday ? ` ${styles.thDateToday}` : ""}`}
													>
														<span className={styles.thDayName}>{format(date, "EEE")}</span>
														<span className={styles.thDayNum}>{format(date, "d")}</span>
														<span className={styles.thMonth}>{format(date, "MMM")}</span>
														{isToday && <span className={styles.todayPill}>today</span>}
													</th>
												);
											})}
											<th className={styles.thTotal}>#</th>
										</tr>
									</thead>

									{/* One row per caregiver */}
									<tbody>
										{caregivers.map((caregiver, rowIndex) => {
											const caregiverId          = caregiver._id || caregiver.id;
											const caregiverAssignments = assignments[caregiverId] || {};
											const assignedCount        = Object.keys(caregiverAssignments).filter((d) => dateSet.has(d)).length;
											const fullName             = [caregiver.firstName, caregiver.lastName].filter(Boolean).join(" ") || "Unknown";

											return (
												<tr
													key={caregiverId}
													className={`${styles.tr}${rowIndex % 2 === 0 ? ` ${styles.trEven}` : ""}`}
												>
													{/* Sticky caregiver name cell */}
													<td className={styles.tdName}>
														<div className={styles.tdNameInner}>
															<Image
																src={caregiver.profilePictureUrl || defaultAvatar}
																alt={fullName}
																width={28}
																height={28}
																className={styles.cgAvatar}
															/>
															<span className={styles.tdNameText}>{fullName}</span>
															{assignedCount > 0 && (
																<button
																	className={styles.clearRowBtn}
																	onClick={() => clearRow(caregiverId)}
																	title="Clear this row"
																>
																	✕
																</button>
															)}
														</div>
													</td>

													{/* One shift cell per date */}
													{dates.map((dateStr) => {
														const isToday = dateStr === todayStr;
														return (
															<td
																key={dateStr}
																className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}`}
															>
																<ShiftCell
																	assignment={caregiverAssignments[dateStr]}
																	dayStart={dayStart}
																	dayEnd={dayEnd}
																	nightStart={nightStart}
																	nightEnd={nightEnd}
																	onCycle={() => cycleCell(caregiverId, dateStr)}
																	onSetCustomTime={(field, value) => setCustomTime(caregiverId, dateStr, field, value)}
																/>
															</td>
														);
													})}

													{/* Shift count badge */}
													<td className={styles.tdTotal}>
														{assignedCount > 0 && (
															<span className={styles.totalBadge}>{assignedCount}</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>

								</table>
							</div>
						</div>
					)}

					{/* ── Legend ────────────────────────────────────────────── */}
					<div className={styles.legend}>
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotD}`}>
								<Sun size={13} />
							</span>
							<span>Day &nbsp;·&nbsp; {dayStart}–{dayEnd}</span>
						</div>
						<div className={styles.legendDivider} />
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotN}`}>
								<Moon size={13} />
							</span>
							<span>Night &nbsp;·&nbsp; {nightStart}–{nightEnd}</span>
						</div>
						<div className={styles.legendDivider} />
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotC}`}>C</span>
							<span>Custom time</span>
						</div>
						<span className={styles.legendNote}>
							Click any cell to cycle · D → N → C → clear
						</span>
					</div>

				</main>
			</div>
		</div>
	);
}
