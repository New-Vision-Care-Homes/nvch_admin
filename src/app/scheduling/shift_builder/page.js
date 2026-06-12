"use client";

/**
 * Shift Builder — /scheduling/shift_builder
 *
 * Lets admins bulk-create shifts for all caregivers in a home over a pay period.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Pick a home and navigate to a pay period using ‹ / › buttons.
 * 2. Existing shifts for that period are fetched and shown in the grid
 *    (muted style so they're clearly "already there").
 * 3. Click any cell to cycle it through Day → Night → Custom → clear.
 *    Existing-shift cells cycle the same way; cycling off empty creates a NEW
 *    planned shift on top of the existing one.
 * 4. Hit "Publish" → only the NEW (non-existing) assignments are sent to the API
 *    as one bulk call, then a success/failure summary is shown.
 *
 * SHIFT TYPES
 * ───────────
 * D (Day)    — times from the Day pickers in the legend at the bottom.
 * N (Night)  — times from the Night pickers in the legend at the bottom.
 * C (Custom) — inline time dropdowns rendered inside the cell itself.
 *
 * SHIFT CLASSIFICATION (for existing shifts loaded from the API)
 * ──────────────────────────────────────────────────────────────
 * startHour === 7  → Day    (assumes 07:00–19:00 pattern)
 * startHour === 19 → Night  (assumes 19:00–07:00 pattern)
 * anything else   → Custom
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
	AlertCircle,
	Building2,
	CalendarRange,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	GripVertical,
	Info,
	Moon,
	RotateCcw,
	Sun,
	XCircle,
	Zap,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { DateTime } from "luxon";
import Image from "next/image";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import { useHomes } from "@/hooks/useHomes";
import { useShifts } from "@/hooks/useShifts";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

import styles from "./shift_builder.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const HALIFAX_TZ    = "America/Halifax";
const PAYROLL_ANCHOR = new Date(2025, 11, 18); // Dec 18 2025 — PP1 starts here; PP13 = Jun 4–17 2026
const PERIOD_DAYS   = 14;
const MAX_DAYS      = 42; // safety cap to prevent runaway renders on bad date ranges

// Every 30-minute slot from 00:00 → 23:30, used in Custom cell dropdowns and the
// legend's Day / Night hour pickers.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
	const hour   = Math.floor(i / 2);
	const minute = i % 2 === 0 ? "00" : "30";
	return `${String(hour).padStart(2, "0")}:${minute}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Luxon DateTime set to the Halifax (Atlantic) timezone. */
function getHalifaxNow() {
	return DateTime.now().setZone(HALIFAX_TZ);
}

/** Returns today's date as "yyyy-MM-dd" in the Halifax timezone. */
function getTodayInHalifax() {
	const now = getHalifaxNow();
	return format(new Date(now.year, now.month - 1, now.day), "yyyy-MM-dd");
}

/**
 * Classifies an existing API shift as "day", "night", or "custom" by
 * checking what hour it starts in Halifax time.
 *
 * We only look at the start hour because the builder enforces 07:00 / 19:00
 * as the canonical day/night boundaries. Anything outside those is Custom.
 */
function classifyShift(shift) {
	const startHfx = DateTime.fromISO(shift.startTime).setZone(HALIFAX_TZ);
	if (startHfx.hour === 7)  return "day";
	if (startHfx.hour === 19) return "night";
	return "custom";
}

/**
 * Converts an array of API shift objects into the assignments map shape:
 *   { [caregiverId]: { [dateStr]: { type, customStart, customEnd, existing, shiftId } } }
 *
 * `existing: true`  — cell was loaded from the server; shown muted.
 * `shiftId`         — the shift's DB id; included in the PUT payload to update (not re-create) the shift.
 *
 * Custom shifts store their actual Halifax-time start/end so the cell displays the real range.
 */
function buildAssignmentsFromShifts(shifts) {
	const map = {};
	for (const shift of shifts) {
		// caregiver may be a populated object { _id, ... } or a raw string ID.
		// Newly-created shifts are often returned un-populated (string only).
		const cg = shift.caregiver;
		const caregiverId = (
			typeof cg === "string" ? cg : (cg?._id || cg?.id)
		)?.toString();
		if (!caregiverId) continue;

		const startHfx = DateTime.fromISO(shift.startTime).setZone(HALIFAX_TZ);
		const endHfx   = DateTime.fromISO(shift.endTime).setZone(HALIFAX_TZ);
		const dateStr  = startHfx.toFormat("yyyy-MM-dd");
		const type     = classifyShift(shift);

		if (!map[caregiverId]) map[caregiverId] = {};
		map[caregiverId][dateStr] = {
			type,
			// For custom shifts, capture the actual times so the cell can display them
			customStart: type === "custom" ? startHfx.toFormat("HH:mm") : "",
			customEnd:   type === "custom" ? endHfx.toFormat("HH:mm")   : "",
			existing:    true,
			shiftId:     shift._id || shift.id, // needed for PUT /api/shifts/bulk
		};
	}
	return map;
}

// ─── Sub-component: ShiftCell ─────────────────────────────────────────────────

/**
 * One clickable cell in the schedule grid.
 *
 * Props:
 *   assignment          — current cell value; undefined = empty.
 *                         Shape: { type: 'day'|'night'|'custom', customStart, customEnd, existing? }
 *   isExisting          — true when the cell was pre-loaded from the API (renders muted).
 *   dayStart/dayEnd     — global day-shift hours shown as a hint inside Day cells.
 *   nightStart/nightEnd — global night-shift hours shown inside Night cells.
 *   onCycle             — called on click to advance to the next state.
 *   onSetCustomTime     — (field, value) → updates a Custom cell's start/end time.
 */
function ShiftCell({
	assignment,
	isExisting,
	dayStart,
	dayEnd,
	nightStart,
	nightEnd,
	onCycle,
	onSetCustomTime,
}) {
	const type = assignment?.type;

	const existingClass = isExisting ? ` ${styles.cellExisting}` : "";

	// Empty — invisible area; shows dashed hover outline
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
				className={`${styles.cellDay}${existingClass}`}
				onClick={onCycle}
				title={`${isExisting ? "Existing · " : ""}Day · ${dayStart}–${dayEnd}\nClick to change`}
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
				className={`${styles.cellNight}${existingClass}`}
				onClick={onCycle}
				title={`${isExisting ? "Existing · " : ""}Night · ${nightStart}–${nightEnd}\nClick to change`}
			>
				<Moon size={11} className={styles.cellIcon} />
				<span className={styles.cellLetter}>N</span>
				<span className={styles.cellHint}>{nightStart}–{nightEnd}</span>
			</button>
		);
	}

	// Custom shift — shows a "C" badge + inline time dropdowns
	return (
		<div className={`${styles.cellCustom}${existingClass}`}>
			<button
				className={styles.cellCustomBadge}
				onClick={onCycle}
				title={`${isExisting ? "Existing · " : ""}Custom shift · click to remove`}
			>
				C
			</button>

			{/*
			 * stopPropagation prevents clicks inside the selects from also
			 * triggering onCycle (which would clear the assignment).
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
 * Shows the publish outcome:
 * — green "X created" badge for successes
 * — red "Y failed" badge + expandable error list for failures
 *
 * Props:
 *   result — the API response from createBulkShifts, or null before publishing.
 */
function BulkResultBanner({ result }) {
	const [showFailed, setShowFailed] = useState(false);
	if (!result) return null;

	const createdCount = result.summary?.created ?? 0;
	const updatedCount = result.summary?.updated ?? 0;
	const failedCount  = result.summary?.failed  ?? 0;

	return (
		<div className={styles.resultCard}>
			<div className={styles.resultSummaryRow}>
				<CheckCircle2 size={18} className={styles.resultOkIcon} />
				<span className={styles.resultTitle}>Schedule saved</span>
				{createdCount > 0 && (
					<span className={styles.resultCreatedBadge}>{createdCount} created</span>
				)}
				{updatedCount > 0 && (
					<span className={styles.resultCreatedBadge}>{updatedCount} updated</span>
				)}
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

	// ── Home selection ────────────────────────────────────────────────────────
	const [selectedHomeId, setSelectedHomeId] = useState("");

	// ── Pay period navigation ─────────────────────────────────────────────────
	// periodOffset is an integer relative to the current pay period:
	//   0 = current period, -1 = previous, +1 = next, etc.
	const [periodOffset, setPeriodOffset] = useState(0);

	// Derive the pay period's start date, end date, and 1-based PP number
	const payrollPeriod = useMemo(() => {
		const msPerPeriod = PERIOD_DAYS * 24 * 60 * 60 * 1000;
		const nowHfx      = getHalifaxNow();
		const today       = new Date(nowHfx.year, nowHfx.month - 1, nowHfx.day);
		const diffMs      = Math.max(0, today.getTime() - PAYROLL_ANCHOR.getTime());
		const currentIdx  = Math.floor(diffMs / msPerPeriod);
		const start       = addDays(PAYROLL_ANCHOR, (currentIdx + periodOffset) * PERIOD_DAYS);
		const end         = addDays(start, PERIOD_DAYS - 1);
		const ppNumber    = currentIdx + 1 + periodOffset; // 1-based
		return { start, end, ppNumber };
	}, [periodOffset]);

	// Flat string versions used in API calls and date comparisons
	const startDate = format(payrollPeriod.start, "yyyy-MM-dd");
	const endDate   = format(payrollPeriod.end,   "yyyy-MM-dd");

	// ── Global shift hours (editable in the legend at the bottom) ─────────────
	// These apply to all Day / Night cells. Custom cells have their own time pickers.
	const [dayStart,   setDayStart]   = useState("07:00");
	const [dayEnd,     setDayEnd]     = useState("19:00");
	const [nightStart, setNightStart] = useState("19:00");
	const [nightEnd,   setNightEnd]   = useState("07:00");

	// ── Grid assignments ──────────────────────────────────────────────────────
	/*
	 * Nested map: caregiverId → dateStr → { type, customStart, customEnd, existing? }
	 *
	 * `existing: true` cells came from the API and are shown muted. They are
	 * excluded from the publish payload so we don't re-create them.
	 *
	 * Example:
	 *   {
	 *     "cg-001": {
	 *       "2026-06-10": { type: "day",    existing: true },          ← loaded from API
	 *       "2026-06-12": { type: "night",  customStart: "", customEnd: "" }, ← new
	 *     }
	 *   }
	 */
	const [assignments, setAssignments] = useState({});

	// baseAssignments holds the server-loaded state so clearAll can restore it.
	const baseAssignments = useRef({});

	// Tracks the day/night times at the moment existing shifts were loaded.
	// If the user changes the times afterward, timesChanged will be true and
	// the PUT payload will include existing Day/Night cells so the backend updates their times.
	const originalTimes = useRef({ dayStart: "07:00", dayEnd: "19:00", nightStart: "19:00", nightEnd: "07:00" });

	// ── Submission feedback ───────────────────────────────────────────────────
	const [bulkResult,  setBulkResult]  = useState(null);
	const [submitError, setSubmitError] = useState(null);

	// ── Drag-to-reorder ───────────────────────────────────────────────────────
	const [caregiverOrder, setCaregiverOrder] = useState([]);
	const [dragOverId,     setDragOverId]     = useState(null);
	const dragItem     = useRef(null); // ID of the row being dragged
	const dragOverItem = useRef(null); // ID of the row currently hovered over

	// ── Data fetching ─────────────────────────────────────────────────────────

	// All homes for the dropdown
	const { homes, isLoading: homesLoading } = useHomes({ limit: 100 });

	// The selected home's full record — includes its caregivers list
	const { homeDetail, isLoading: homeDetailLoading } = useHomes(selectedHomeId);

	// Existing shifts for the current period/home (used to pre-fill the grid)
	// + bulk mutations (combined into one hook call to avoid duplicate queries)
	const {
		shifts:           existingShifts,
		isShiftLoading:   existingShiftsLoading,
		createBulkShifts,
		isBulkPending,
		bulkShiftError,
		saveBulkShifts,
		isSaveBulkPending,
		saveBulkShiftError,
	} = useShifts({
		params: {
			startDate,
			endDate,
			...(selectedHomeId ? { homeId: selectedHomeId } : {}),
			limit: 1000,
		},
	});

	// ── Auto-select first home ────────────────────────────────────────────────
	useEffect(() => {
		if (homes?.length && !selectedHomeId) {
			setSelectedHomeId(homes[0]._id || homes[0].id);
		}
	}, [homes, selectedHomeId]);

	// ── Sync caregiver display order when home changes ────────────────────────
	// React Query keeps homeDetail reference-stable between polls, so this only
	// fires when the user actually switches homes.
	useEffect(() => {
		if (homeDetail?.caregivers) {
			setCaregiverOrder(homeDetail.caregivers.map((cg) => (cg._id || cg.id)?.toString()));
		}
	}, [homeDetail]);

	// ── Pre-fill grid from existing API shifts ────────────────────────────────
	// Runs whenever the existingShifts array changes (home or period change).
	// Builds a fresh assignments map from server data and saves it as the base
	// so clearAll can restore to this state.
	// Also captures the current day/night times as a baseline — if the user later
	// edits those times, `timesChanged` becomes true and the PUT payload will
	// include the existing Day/Night cells so their times get updated too.
	useEffect(() => {
		if (!existingShifts) return;
		const base = buildAssignmentsFromShifts(existingShifts);
		baseAssignments.current = base;
		originalTimes.current = { dayStart, dayEnd, nightStart, nightEnd };
		setAssignments(base);
		// Do NOT clear bulkResult/submitError here — this effect also fires after every
		// save (because the mutation invalidates the query), which would wipe the result
		// banner before the user sees it. Those are cleared by handleHomeChange,
		// changePeriod, and at the top of handleSubmit instead.
	// dayStart/dayEnd/nightStart/nightEnd are intentionally omitted from deps —
	// we only want to snapshot them at the moment shifts load, not re-run on every time change.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [existingShifts]);

	// ── Derived data ──────────────────────────────────────────────────────────

	// Caregivers that belong to the selected home
	const caregivers = homeDetail?.caregivers ?? [];

	// Caregivers sorted by the user's drag order
	const sortedCaregivers = useMemo(() => {
		if (caregiverOrder.length === 0) return caregivers;
		return [...caregivers].sort((a, b) => {
			const aIdx = caregiverOrder.indexOf(a._id || a.id);
			const bIdx = caregiverOrder.indexOf(b._id || b.id);
			return aIdx - bIdx;
		});
	}, [caregivers, caregiverOrder]);

	// Array of "yyyy-MM-dd" strings for every day in the pay period
	const dates = useMemo(() => {
		try {
			const start = parseISO(startDate);
			const end   = parseISO(endDate);
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

	// Set for O(1) date-in-range checks; also filters out stale assignments
	const dateSet = useMemo(() => new Set(dates), [dates]);

	// Truly new cells — not existing, not just an existing custom cell with edited times
	const assignmentCount = useMemo(() => {
		return Object.values(assignments).reduce((total, dateMap) => {
			const count = Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && !!dateMap[d]?.type && !dateMap[d].existing && !dateMap[d].wasExisting
			).length;
			return total + count;
		}, 0);
	}, [assignments, dateSet]);

	// Existing custom cells whose inline times were edited (shown separately on the button)
	const modifiedCustomCount = useMemo(() => {
		return Object.values(assignments).reduce((total, dateMap) =>
			total + Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && dateMap[d]?.wasExisting && dateMap[d]?.type === "custom"
			).length, 0);
	}, [assignments, dateSet]);

	// True when the selected period already has shifts from the server.
	// Determines POST (create-only) vs PUT (create + update) mode.
	const hasExistingShifts = (existingShifts?.length ?? 0) > 0;

	// Tracked separately so only the affected shift type lights up and gets re-sent.
	const dayTimesChanged = useMemo(() => {
		const orig = originalTimes.current;
		return dayStart !== orig.dayStart || dayEnd !== orig.dayEnd;
	}, [dayStart, dayEnd]);

	const nightTimesChanged = useMemo(() => {
		const orig = originalTimes.current;
		return nightStart !== orig.nightStart || nightEnd !== orig.nightEnd;
	}, [nightStart, nightEnd]);

	// Combined: any time change → PUT payload may need to include existing cells
	const timesChanged = dayTimesChanged || nightTimesChanged;

	// Number of existing Day/Night cells that will be re-timed on Save.
	// Used to show the user what will be affected by a time-picker change.
	const affectedDayCount = useMemo(() => {
		if (!dayTimesChanged) return 0;
		return Object.values(assignments).reduce((total, dateMap) =>
			total + Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && dateMap[d]?.existing && dateMap[d]?.type === "day"
			).length, 0);
	}, [assignments, dateSet, dayTimesChanged]);

	const affectedNightCount = useMemo(() => {
		if (!nightTimesChanged) return 0;
		return Object.values(assignments).reduce((total, dateMap) =>
			total + Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && dateMap[d]?.existing && dateMap[d]?.type === "night"
			).length, 0);
	}, [assignments, dateSet, nightTimesChanged]);

	// ── Handlers ──────────────────────────────────────────────────────────────

	/**
	 * Advances a cell through: empty / existing → day → night → custom → empty.
	 *
	 * When cycling an existing cell, `shiftId` is preserved so the PUT endpoint
	 * can update (not duplicate) the shift. `existing: true` is dropped so the cell
	 * renders bright, signalling it has been modified.
	 *
	 * Note: cycling all the way to "clear" on an existing cell does NOT cancel the
	 * shift on the server — use the cancel flow for that.
	 */
	const cycleCell = useCallback((caregiverId, dateStr) => {
		setAssignments((prev) => {
			const caregiverMap = { ...(prev[caregiverId] || {}) };
			const current      = caregiverMap[dateStr];
			// Preserve shiftId across cycles so PUT can target the right record
			const shiftId = current?.shiftId;

			if (!current || current.existing) {
				caregiverMap[dateStr] = { type: "day", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else if (current.type === "day") {
				caregiverMap[dateStr] = { type: "night", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else if (current.type === "night") {
				caregiverMap[dateStr] = { type: "custom", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else {
				// custom → clear
				delete caregiverMap[dateStr];
			}

			return { ...prev, [caregiverId]: caregiverMap };
		});
	}, []);

	/** Updates one time field (customStart or customEnd) on a Custom cell.
	 *  If the cell was loaded from the API (existing: true), editing its times
	 *  clears that flag so it lights up, counts toward the button total, and
	 *  gets included in the PUT payload with its shiftId. */
	const setCustomTime = useCallback((caregiverId, dateStr, field, value) => {
		setAssignments((prev) => {
			const current = prev[caregiverId]?.[dateStr] || {};
			return {
				...prev,
				[caregiverId]: {
					...(prev[caregiverId] || {}),
					[dateStr]: {
						...current,
						[field]: value,
						// Touching the time on an existing cell marks it as modified.
						// wasExisting distinguishes "edited server shift" from a brand-new cell.
						...(current.existing ? { existing: false, wasExisting: true } : {}),
					},
				},
			};
		});
	}, []);

	/** Removes all NEW assignments for one caregiver (restores existing ones). */
	const clearRow = useCallback((caregiverId) => {
		setAssignments((prev) => ({
			...prev,
			[caregiverId]: baseAssignments.current[caregiverId] || {},
		}));
	}, []);

	/** Resets the entire grid back to the server-loaded state. */
	const clearAll = useCallback(() => {
		setAssignments({ ...baseAssignments.current });
		setBulkResult(null);
		setSubmitError(null);
	}, []);

	/** Switches home — clears grid immediately; existing shifts load via the hook. */
	const handleHomeChange = useCallback((homeId) => {
		setSelectedHomeId(homeId);
		baseAssignments.current = {};
		setAssignments({});
		setBulkResult(null);
		setSubmitError(null);
	}, []);

	/** Moves to the adjacent pay period and clears any pending new assignments. */
	const changePeriod = useCallback((delta) => {
		setPeriodOffset((prev) => prev + delta);
		// The existingShifts effect will repopulate once the query resolves.
		// We clear immediately so the grid doesn't show stale data during the fetch.
		baseAssignments.current = {};
		setAssignments({});
		setBulkResult(null);
		setSubmitError(null);
	}, []);

	// ── Drag-to-reorder handlers ──────────────────────────────────────────────

	const handleDragStart = useCallback((e, caregiverId) => {
		dragItem.current = caregiverId;
		e.dataTransfer.effectAllowed = "move";
	}, []);

	const handleDragEnter = useCallback((caregiverId) => {
		if (caregiverId === dragItem.current) return;
		dragOverItem.current = caregiverId;
		setDragOverId(caregiverId);
	}, []);

	/**
	 * Fires on the dragged row when the drag ends (drop or cancel).
	 * We reorder here rather than onDrop so it works reliably even when the
	 * pointer briefly leaves the table between rows.
	 */
	const handleDragEnd = useCallback(() => {
		const from = dragItem.current;
		const to   = dragOverItem.current;
		if (from && to && from !== to) {
			setCaregiverOrder((prev) => {
				const order   = [...prev];
				const fromIdx = order.indexOf(from);
				const toIdx   = order.indexOf(to);
				if (fromIdx === -1 || toIdx === -1) return prev;
				order.splice(fromIdx, 1);
				order.splice(toIdx, 0, from);
				return order;
			});
		}
		dragItem.current     = null;
		dragOverItem.current = null;
		setDragOverId(null);
	}, []);

	// ── Submit ────────────────────────────────────────────────────────────────

	/**
	 * POST mode (no existing shifts in period): sends only NEW cells.
	 * PUT mode (period has existing shifts): sends every modified cell (new or
	 *   cycled from existing, with shiftId so the backend updates not duplicates),
	 *   plus any existing Day/Night cells if the global times changed.
	 */
	const handleSubmit = async () => {
		if (!selectedHomeId) return;
		const isSubmitting = isBulkPending || isSaveBulkPending;
		if (isSubmitting) return;

		setBulkResult(null);
		setSubmitError(null);

		const sharedBody = {
			startDate,
			endDate,
			homeId:     selectedHomeId,
			timezone:   HALIFAX_TZ,
			dayShift:   { start: dayStart,   end: dayEnd   },
			nightShift: { start: nightStart, end: nightEnd },
		};

		if (!hasExistingShifts) {
			// ── POST: create-only (empty period) ─────────────────────────────
			if (assignmentCount === 0) return;

			const caregiverPayload = [];
			for (const [caregiverId, dateMap] of Object.entries(assignments)) {
				const cells = Object.entries(dateMap)
					.filter(([d, v]) => dateSet.has(d) && !!v?.type && !v.existing)
					.map(([d, v]) => {
						const entry = { date: d, type: v.type };
						if (v.type === "custom") entry.customTime = { start: v.customStart, end: v.customEnd };
						return entry;
					});
				if (cells.length > 0) caregiverPayload.push({ caregiverId, assignments: cells });
			}
			if (caregiverPayload.length === 0) return;

			try {
				const result = await createBulkShifts({ ...sharedBody, caregivers: caregiverPayload });
				setBulkResult(result);
			} catch (err) {
				setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
			}

		} else {
			// ── PUT: create + update (period has existing shifts) ────────────
			// Nothing to do if the user made no changes at all
			if (assignmentCount === 0 && modifiedCustomCount === 0 && !timesChanged) return;

			const caregiverPayload = [];
			for (const [caregiverId, dateMap] of Object.entries(assignments)) {
				const cells = [];
				for (const [d, v] of Object.entries(dateMap)) {
					if (!dateSet.has(d) || !v?.type) continue;

					if (!v.existing) {
						// User modified this cell (new, cycled from existing, or custom time edited)
						// shiftId present → backend updates; absent → backend creates
						const entry = { date: d, type: v.type };
						if (v.shiftId) entry.shiftId = v.shiftId;
						if (v.type === "custom") entry.customTime = { start: v.customStart, end: v.customEnd };
						cells.push(entry);
					} else if (
						v.existing && v.shiftId &&
						((v.type === "day" && dayTimesChanged) || (v.type === "night" && nightTimesChanged))
					) {
						// Untouched Day/Night cell whose global times changed — re-send so backend updates times
						cells.push({ shiftId: v.shiftId, date: d, type: v.type });
					}
				}
				if (cells.length > 0) caregiverPayload.push({ caregiverId, assignments: cells });
			}
			if (caregiverPayload.length === 0) return;

			try {
				const result = await saveBulkShifts({ ...sharedBody, caregivers: caregiverPayload });
				console.log(caregiverPayload)
				setBulkResult(result);
			} catch (err) {
				setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
			}
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	const isLoading  = homesLoading || (!!selectedHomeId && homeDetailLoading) || existingShiftsLoading;

	return (
		<div className={styles.page}>
			<Navbar onMenuToggle={() => setMobileOpen(true)} />
			<div className={styles.container}>
				<Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

				<main className={styles.body}>

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

						{/* Pay period navigator — replaces the free-form date range inputs */}
						<div className={styles.controlGroup}>
							<label className={styles.controlLabel}>
								<CalendarRange size={13} /> Pay Period
							</label>
							<div className={styles.controlRow}>
								<button
									className={styles.periodNavBtn}
									onClick={() => changePeriod(-1)}
									title="Previous pay period"
								>
									<ChevronLeft size={15} />
								</button>
								<div className={styles.periodDisplay}>
									<span className={styles.periodBadge}>PP {payrollPeriod.ppNumber}</span>
									<span className={styles.periodDates}>
										{format(payrollPeriod.start, "MMM d")} – {format(payrollPeriod.end, "MMM d, yyyy")}
									</span>
								</div>
								<button
									className={styles.periodNavBtn}
									onClick={() => changePeriod(+1)}
									title="Next pay period"
								>
									<ChevronRight size={15} />
								</button>
							</div>
						</div>

						{/* Push action buttons to the right */}
						<div className={styles.controlsSpacer} />

						{/* Clear all + Publish/Save — kept together so they're always visible */}
						<div className={styles.controlsActions}>
							{assignmentCount > 0 && (
								<button className={styles.clearBtn} onClick={clearAll}>
									<RotateCcw size={13} />
									Clear new
								</button>
							)}
							{(() => {
								const isSubmitting = isBulkPending || isSaveBulkPending;
								const canSubmit = selectedHomeId && (
									hasExistingShifts
										? (assignmentCount > 0 || timesChanged || modifiedCustomCount > 0)
										: assignmentCount > 0
								);
								const parts = [];
								if (assignmentCount > 0) parts.push(`${assignmentCount} new`);
								if (affectedDayCount > 0) parts.push(`${affectedDayCount}D re-timed`);
								if (affectedNightCount > 0) parts.push(`${affectedNightCount}N re-timed`);
								if (modifiedCustomCount > 0) parts.push(`${modifiedCustomCount}C re-timed`);
								const label = isSubmitting
									? (hasExistingShifts ? "Saving…" : "Publishing…")
									: hasExistingShifts
										? `Save Schedule${parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}`
										: `Publish ${assignmentCount} Shift${assignmentCount !== 1 ? "s" : ""}`;
								return (
									<Button icon={<Zap size={15} />} onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
										{label}
									</Button>
								);
							})()}
						</div>

					</div>

					{/* ── Info notice ────────────────────────────────────────── */}
					<div className={styles.infoBanner}>
						<Info size={14} className={styles.infoIcon} />
						<span>
							Clearing an existing shift cell here <strong>does not cancel the shift</strong>.
							To cancel, open the shift detail page and submit a cancellation reason.
						</span>
					</div>

					{/* ── Error banner ───────────────────────────────────────── */}
					{(submitError || bulkShiftError || saveBulkShiftError) && (
						<div className={styles.errorBanner}>
							<AlertCircle size={15} />
							<span>{submitError || bulkShiftError || saveBulkShiftError}</span>
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
					) : (
						<div className={styles.tableCard}>
							<div className={styles.tableWrap}>
								<table className={styles.table}>

									{/* Column headers — one per day of the pay period */}
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

									{/*
									 * Rows are sorted by caregiverOrder (user's drag order).
									 * Muted cells (existing: true) came from the API and are
									 * pre-filled for reference — only bright cells are new.
									 */}
									<tbody>
										{sortedCaregivers.map((caregiver, rowIndex) => {
											const caregiverId          = (caregiver._id || caregiver.id)?.toString();
											const caregiverAssignments = assignments[caregiverId] || {};

											// Only count NEW (non-existing) assignments for this row
											const newCount = Object.keys(caregiverAssignments).filter(
												(d) => dateSet.has(d) && !!caregiverAssignments[d]?.type && !caregiverAssignments[d].existing
											).length;

											const fullName     = [caregiver.firstName, caregiver.lastName].filter(Boolean).join(" ") || "Unknown";
											const isDragTarget = dragOverId === caregiverId;

											return (
												<tr
													key={caregiverId}
													draggable
													onDragStart={(e) => handleDragStart(e, caregiverId)}
													onDragEnter={() => handleDragEnter(caregiverId)}
													onDragEnd={handleDragEnd}
													onDragOver={(e) => e.preventDefault()}
													className={[
														styles.tr,
														rowIndex % 2 === 0 ? styles.trEven : "",
														isDragTarget ? styles.trDragOver : "",
													].filter(Boolean).join(" ")}
												>
													{/* Sticky name cell with drag handle */}
													<td className={styles.tdName}>
														<div className={styles.tdNameInner}>
															<GripVertical
																size={14}
																className={styles.dragHandle}
																title="Drag to reorder"
															/>
															<Image
																src={caregiver.profilePictureUrl || defaultAvatar}
																alt={fullName}
																width={28}
																height={28}
																className={styles.cgAvatar}
															/>
															<span className={styles.tdNameText}>{fullName}</span>
															{newCount > 0 && (
																<button
																	className={styles.clearRowBtn}
																	onClick={() => clearRow(caregiverId)}
																	title="Clear new shifts in this row"
																>
																	✕
																</button>
															)}
														</div>
													</td>

													{/* One shift cell per date */}
													{dates.map((dateStr) => {
														const asgn     = caregiverAssignments[dateStr];
														const isToday  = dateStr === todayStr;
														return (
															<td
																key={dateStr}
																className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}`}
															>
																<ShiftCell
																	assignment={asgn}
																	isExisting={
																		!!asgn?.existing &&
																		// Only unmute the type whose times actually changed
																		!(asgn?.type === "day" && dayTimesChanged) &&
																		!(asgn?.type === "night" && nightTimesChanged)
																	}
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

													{/* New shift count badge */}
													<td className={styles.tdTotal}>
														{newCount > 0 && (
															<span className={styles.totalBadge}>{newCount}</span>
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

					{/*
					 * ── Legend + editable shift hours ────────────────────────
					 * Day / Night hour dropdowns are here (not in the controls bar)
					 * so admins can adjust times after seeing the existing grid.
					 * TIME_OPTIONS limits selections to :00 and :30 values only.
					 */}
					<div className={styles.legend}>
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotD}`}>
								<Sun size={13} />
							</span>
							<span className={styles.legendLabel}>Day</span>
							<select className={styles.legendSelect} value={dayStart} onChange={(e) => setDayStart(e.target.value)}>
								{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
							<span className={styles.legendSep}>–</span>
							<select className={styles.legendSelect} value={dayEnd} onChange={(e) => setDayEnd(e.target.value)}>
								{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
						</div>
						<div className={styles.legendDivider} />
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotN}`}>
								<Moon size={13} />
							</span>
							<span className={styles.legendLabel}>Night</span>
							<select className={styles.legendSelect} value={nightStart} onChange={(e) => setNightStart(e.target.value)}>
								{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
							<span className={styles.legendSep}>–</span>
							<select className={styles.legendSelect} value={nightEnd} onChange={(e) => setNightEnd(e.target.value)}>
								{TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
						</div>
						<div className={styles.legendDivider} />
						<div className={styles.legendItem}>
							<span className={`${styles.legendDot} ${styles.legendDotC}`}>C</span>
							<span>Custom time</span>
						</div>
						<span className={styles.legendNote}>
							Muted = existing &nbsp;·&nbsp; Bright = new &nbsp;·&nbsp; Click to cycle D → N → C → clear &nbsp;·&nbsp; Drag <GripVertical size={11} style={{ display: "inline", verticalAlign: "middle" }} /> to reorder
						</span>
					</div>

				</main>
			</div>
		</div>
	);
}
