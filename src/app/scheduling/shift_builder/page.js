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
	Moon,
	RotateCcw,
	Search,
	Sun,
	UserPlus,
	X,
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
import { useCaregivers } from "@/hooks/useCaregivers";
import { usePayPeriod } from "@/hooks/usePayPeriods";
import { getTodayInHalifax } from "@/utils/timeHandling";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

import styles from "./shift_builder.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const HALIFAX_TZ = "America/Halifax";
const MAX_DAYS   = 42; // safety cap to prevent runaway renders on bad date ranges

// Every 30-minute slot from 00:00 → 23:30, used in Custom cell dropdowns and the
// legend's Day / Night hour pickers.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
	const hour   = Math.floor(i / 2);
	const minute = i % 2 === 0 ? "00" : "30";
	return `${String(hour).padStart(2, "0")}:${minute}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
	isPast,
	dayStart,
	dayEnd,
	nightStart,
	nightEnd,
	onCycle,
	onSetCustomTime,
}) {
	const type = assignment?.type;
	const existingClass = isExisting ? ` ${styles.cellExisting}` : "";
	const pastClass     = isPast     ? ` ${styles.cellPast}`     : "";

	// Empty cell
	if (!type) {
		// Past dates: locked placeholder, no interaction
		if (isPast) return <div className={`${styles.cellEmpty} ${styles.cellPast}`} />;
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
				className={`${styles.cellDay}${existingClass}${pastClass}`}
				onClick={isPast ? undefined : onCycle}
				disabled={isPast}
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Day · ${dayStart}–${dayEnd}\nClick to change`}
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
				className={`${styles.cellNight}${existingClass}${pastClass}`}
				onClick={isPast ? undefined : onCycle}
				disabled={isPast}
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Night · ${nightStart}–${nightEnd}\nClick to change`}
			>
				<Moon size={11} className={styles.cellIcon} />
				<span className={styles.cellLetter}>N</span>
				<span className={styles.cellHint}>{nightStart}–{nightEnd}</span>
			</button>
		);
	}

	// Custom shift
	return (
		<div className={`${styles.cellCustom}${existingClass}${pastClass}`}>
			<button
				className={styles.cellCustomBadge}
				onClick={isPast ? undefined : onCycle}
				disabled={isPast}
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Custom shift · click to change`}
			>
				C
			</button>
			<div className={styles.cellCustomRange} onClick={isPast ? undefined : (e) => e.stopPropagation()}>
				{isPast ? (
					<>
						<span className={styles.cellTimeSelect}>{assignment.customStart || "--"}</span>
						<span className={styles.cellRangeDash}>–</span>
						<span className={styles.cellTimeSelect}>{assignment.customEnd || "--"}</span>
					</>
				) : (
					<>
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
					</>
				)}
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

	// Pay period dates from the backend — single source of truth
	const { payPeriod, isPayPeriodLoading, payPeriodError } = usePayPeriod(periodOffset);

	// Flat "yyyy-MM-dd" strings used in API calls and date comparisons.
	// Empty strings while loading so the dates useMemo safely returns [].
	const startDate = payPeriod?.periodStart?.slice(0, 10) ?? "";
	const endDate   = payPeriod?.periodEnd?.slice(0, 10)   ?? "";

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

	// ── Casual workers ────────────────────────────────────────────────────────
	const [addedCasualWorkers,  setAddedCasualWorkers]  = useState([]);
	const [casualSearch,        setCasualSearch]         = useState("");
	const [showCasualDropdown,  setShowCasualDropdown]   = useState(false);
	const [casualDropdownPos,   setCasualDropdownPos]    = useState({ top: 0, left: 0, width: 0 });
	const casualSearchRef = useRef(null);

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

	// Casual workers for the selected home's region
	const homeRegion = homeDetail?.region ?? null;
	const { caregivers: allCasualWorkers, isCaregiverLoading: casualLoading } = useCaregivers({
		params: { employmentStatus: "casual", region: homeRegion, limit: 100 },
		enabled: !!homeRegion,
	});

	// ── Effects ───────────────────────────────────────────────────────────────────

	// Auto-select the first home on initial load so the grid isn't blank on first visit.
	useEffect(() => {
		if (homes?.length && !selectedHomeId) {
			setSelectedHomeId(homes[0]._id || homes[0].id);
		}
	}, [homes, selectedHomeId]);

	// Sync caregiver display order when the home changes.
	// React Query keeps homeDetail reference-stable between polls, so this only
	// fires when the user actually switches homes.
	useEffect(() => {
		if (homeDetail?.caregivers) {
			setCaregiverOrder(homeDetail.caregivers.map((cg) => (cg._id || cg.id)?.toString()));
		}
	}, [homeDetail]);

	// Pre-fill the grid from the API when the home or period changes.
	// Runs whenever the existingShifts array changes.
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

	// Auto-detect casual workers who have shifts in this home/period but aren't in
	// the home's permanent roster. Runs whenever existingShifts or homeDetail.caregivers
	// resolves/updates.
	// Two responsibilities in one pass:
	//   1. REMOVE any workers that are actually in the home's permanent roster
	//      (guards against the race where homeDetail resolves after existingShifts
	//      with an empty caregivers list, causing all shift workers to be flagged
	//      as "extra" before the real list arrives).
	//   2. ADD workers from existingShifts whose IDs are not in the roster.
	useEffect(() => {
		if (!homeDetail?.caregivers) return;
		const homeCgIds = new Set(
			homeDetail.caregivers.map((cg) => (cg._id || cg.id)?.toString())
		);

		// Build the set of genuinely extra workers from shift data
		const extraMap = {};
		if (existingShifts?.length) {
			for (const shift of existingShifts) {
				const cg = shift.caregiver;
				if (!cg || typeof cg === "string") continue;
				const id = (cg._id || cg.id)?.toString();
				if (!id || homeCgIds.has(id) || extraMap[id]) continue;
				extraMap[id] = cg;
			}
		}

		setAddedCasualWorkers((prev) => {
			// Strip out anyone who turned out to be a permanent home caregiver
			const cleaned = prev.filter((w) => !homeCgIds.has((w._id || w.id)?.toString()));
			// Add genuinely extra workers not already in the list
			const cleanedIds = new Set(cleaned.map((w) => (w._id || w.id)?.toString()));
			const toAdd = Object.values(extraMap).filter((w) => !cleanedIds.has((w._id || w.id)?.toString()));
			if (cleaned.length === prev.length && toAdd.length === 0) return prev; // nothing changed
			return toAdd.length > 0 ? [...cleaned, ...toAdd] : cleaned;
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [existingShifts, homeDetail?.caregivers]);

	// Close the casual worker search dropdown when the user clicks anywhere outside it.
	useEffect(() => {
		const handleOutside = (e) => {
			if (casualSearchRef.current && !casualSearchRef.current.contains(e.target)) {
				setShowCasualDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, []);

	// ── Derived data ──────────────────────────────────────────────────────────

	// ─ Caregiver list & ordering ────────────────────────────────────────────────

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

	// ─ Pay period date range ────────────────────────────────────────────────────

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

	// ─ Casual worker search ─────────────────────────────────────────────────────

	// Casual worker search results — excludes already-added workers
	const filteredCasualResults = useMemo(() => {
		const addedIds = new Set(addedCasualWorkers.map((cg) => (cg._id || cg.id)?.toString()));
		const q = casualSearch.trim().toLowerCase();
		return (allCasualWorkers || []).filter((cg) => {
			if (addedIds.has((cg._id || cg.id)?.toString())) return false;
			if (!q) return true;
			const name = [cg.firstName, cg.lastName].filter(Boolean).join(" ").toLowerCase();
			return name.includes(q);
		});
	}, [allCasualWorkers, casualSearch, addedCasualWorkers]);

	// ─ Grid summary counts ──────────────────────────────────────────────────────
	// These drive the "Publish N Shifts" / "Save Schedule" button label and
	// the guard that prevents empty submits.

	// Brand-new cells — no shiftId means they'll be created, not updated
	const assignmentCount = useMemo(() => {
		return Object.values(assignments).reduce((total, dateMap) => {
			const count = Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && !!dateMap[d]?.type && !dateMap[d].existing && !dateMap[d].wasExisting && !dateMap[d].shiftId
			).length;
			return total + count;
		}, 0);
	}, [assignments, dateSet]);

	// Cells cycled from an existing shift (have shiftId) — these are updates, not creates
	const updatedCount = useMemo(() => {
		return Object.values(assignments).reduce((total, dateMap) => {
			const count = Object.keys(dateMap).filter(
				(d) => dateSet.has(d) && !!dateMap[d]?.type && !dateMap[d].existing && !dateMap[d].wasExisting && !!dateMap[d].shiftId
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

	// ─ Time-change tracking ─────────────────────────────────────────────────────
	// When the user edits the Day/Night hour pickers after shifts have loaded, PUT
	// mode re-includes those existing cells so the backend updates their times.
	// Each shift type is tracked separately so only the affected type lights up.
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

	// ─ Grid cell actions ────────────────────────────────────────────────────────
	// cycleCell / setCustomTime / clearRow / clearAll all write to the assignments map.
	// They never touch the server — Publish/Save sends the final state in one call.

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
			} else if (shiftId) {
				// Existing shift: custom → Day (DNC loop — no blank state for updates)
				caregiverMap[dateStr] = { type: "day", customStart: "", customEnd: "", shiftId };
			} else {
				// New shift: custom → clear
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

	// ─ Navigation ────────────────────────────────────────────────────────────────
	// handleHomeChange / changePeriod reset all transient state so the grid is always
	// consistent with the currently selected home & period.

	/** Switches home — clears grid immediately; existing shifts load via the hook. */
	const handleHomeChange = useCallback((homeId) => {
		setSelectedHomeId(homeId);
		baseAssignments.current = {};
		setAssignments({});
		setBulkResult(null);
		setSubmitError(null);
		setAddedCasualWorkers([]);
		setCasualSearch("");
		setShowCasualDropdown(false);
	}, []);

	/** Moves to the adjacent pay period and clears any pending new assignments.
	 *  Navigation to past periods (offset < 0) is blocked — admins may only
	 *  schedule the current or future pay periods. */
	const changePeriod = useCallback((delta) => {
		const next = periodOffset + delta;
		if (next < 0) return; // block past-period navigation
		setPeriodOffset(next);
		// The existingShifts effect will repopulate once the query resolves.
		// We clear immediately so the grid doesn't show stale data during the fetch.
		baseAssignments.current = {};
		setAssignments({});
		setBulkResult(null);
		setSubmitError(null);
	}, [periodOffset]);

	// ─ Drag-to-reorder: home caregivers ────────────────────────────────────────
	// Regular rows update caregiverOrder (an array of caregiver IDs).
	// Dragging from the regular section into the casual section is a no-op because
	// the dragItem ID won't be found in caregiverOrder.

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

	// ─ Drag-to-reorder: casual workers ─────────────────────────────────────────
	// Casual rows update addedCasualWorkers (the ordered array). Uses the same
	// dragItem/dragOverItem refs as the regular handlers — cross-section drags are
	// safe no-ops because findIndex won't match in the wrong array.

	const handleCasualDragStart = useCallback((e, caregiverId) => {
		dragItem.current = caregiverId;
		e.dataTransfer.effectAllowed = "move";
	}, []);

	const handleCasualDragEnter = useCallback((caregiverId) => {
		if (caregiverId === dragItem.current) return;
		dragOverItem.current = caregiverId;
		setDragOverId(caregiverId);
	}, []);

	const handleCasualDragEnd = useCallback(() => {
		const from = dragItem.current;
		const to   = dragOverItem.current;
		if (from && to && from !== to) {
			setAddedCasualWorkers((prev) => {
				const order   = [...prev];
				const fromIdx = order.findIndex((cg) => (cg._id || cg.id)?.toString() === from);
				const toIdx   = order.findIndex((cg) => (cg._id || cg.id)?.toString() === to);
				if (fromIdx === -1 || toIdx === -1) return prev;
				const [item] = order.splice(fromIdx, 1);
				order.splice(toIdx, 0, item);
				return order;
			});
		}
		dragItem.current     = null;
		dragOverItem.current = null;
		setDragOverId(null);
	}, []);

	// ─ Casual worker management ──────────────────────────────────────────────────
	// handleAddCasualWorker / handleRemoveCasualWorker manage addedCasualWorkers state.
	// openCasualDropdown positions the fixed dropdown relative to the search input.

	const handleAddCasualWorker = useCallback((caregiver) => {
		setAddedCasualWorkers((prev) => {
			const id = (caregiver._id || caregiver.id)?.toString();
			if (prev.some((cg) => (cg._id || cg.id)?.toString() === id)) return prev;
			return [...prev, caregiver];
		});
		setCasualSearch("");
		setShowCasualDropdown(false);
	}, []);

	const handleRemoveCasualWorker = useCallback((caregiverId) => {
		setAddedCasualWorkers((prev) =>
			prev.filter((cg) => (cg._id || cg.id)?.toString() !== caregiverId)
		);
		setAssignments((prev) => {
			const next = { ...prev };
			delete next[caregiverId];
			return next;
		});
	}, []);

	const openCasualDropdown = useCallback(() => {
		if (casualSearchRef.current) {
			const rect = casualSearchRef.current.getBoundingClientRect();
			setCasualDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) });
		}
		setShowCasualDropdown(true);
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
			if (assignmentCount === 0 && updatedCount === 0 && modifiedCustomCount === 0 && !timesChanged) return;

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
				setBulkResult(result);
			} catch (err) {
				setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
			}
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	const isLoading = homesLoading || isPayPeriodLoading || (!!selectedHomeId && homeDetailLoading) || existingShiftsLoading;

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
									disabled={periodOffset === 0}
									title={periodOffset === 0 ? "Cannot navigate to past periods" : "Previous pay period"}
								>
									<ChevronLeft size={15} />
								</button>
								<div className={styles.periodDisplay}>
									<span className={styles.periodBadge}>
										PP {payPeriod?.periodNumber ?? "—"}
										{payPeriod?.payYear ? ` (${payPeriod.payYear})` : ""}
									</span>
									<span className={styles.periodDates}>
										{payPeriod
											? `${format(parseISO(payPeriod.periodStart), "MMM d")} – ${format(parseISO(payPeriod.periodEnd), "MMM d, yyyy")}`
											: "Loading…"
										}
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
										? (assignmentCount > 0 || updatedCount > 0 || timesChanged || modifiedCustomCount > 0)
										: assignmentCount > 0
								);
								const parts = [];
								if (assignmentCount > 0) parts.push(`${assignmentCount} new`);
								if (updatedCount > 0) parts.push(`${updatedCount} updated`);
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

					{/* ── Error banner ───────────────────────────────────────── */}
					{(submitError || bulkShiftError || saveBulkShiftError || payPeriodError) && (
						<div className={styles.errorBanner}>
							<AlertCircle size={15} />
							<span>{submitError || bulkShiftError || saveBulkShiftError || payPeriodError}</span>
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
														const asgn    = caregiverAssignments[dateStr];
														const isToday = dateStr === todayStr;
														const isPast  = dateStr < todayStr;
														return (
															<td
																key={dateStr}
																className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}${isPast ? ` ${styles.tdCellPast}` : ""}`}
															>
																<ShiftCell
																	assignment={asgn}
																	isExisting={
																		!!asgn?.existing &&
																		// Only unmute the type whose times actually changed
																		!(asgn?.type === "day" && dayTimesChanged) &&
																		!(asgn?.type === "night" && nightTimesChanged)
																	}
																	isPast={isPast}
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

									{/* ── Casual worker separator + rows ──────── */}
									{addedCasualWorkers.length > 0 && (
										<tr className={styles.casualSeparatorRow}>
											<td colSpan={dates.length + 2} className={styles.casualSeparatorCell}>
												Casual Workers
											</td>
										</tr>
									)}
									{addedCasualWorkers.map((caregiver) => {
										const caregiverId          = (caregiver._id || caregiver.id)?.toString();
										const caregiverAssignments = assignments[caregiverId] || {};
										const newCount = Object.keys(caregiverAssignments).filter(
											(d) => dateSet.has(d) && !!caregiverAssignments[d]?.type && !caregiverAssignments[d].existing
										).length;
										const fullName = [caregiver.firstName, caregiver.lastName].filter(Boolean).join(" ") || "Unknown";
										// Renamed: outer hasExistingShifts is a period-level check; this is per-caregiver
										const casualHasShifts = Object.keys(baseAssignments.current[caregiverId] || {}).length > 0;
										return (
											<tr
												key={caregiverId}
												draggable
												onDragStart={(e) => handleCasualDragStart(e, caregiverId)}
												onDragEnter={() => handleCasualDragEnter(caregiverId)}
												onDragEnd={handleCasualDragEnd}
												onDragOver={(e) => e.preventDefault()}
												className={[
													styles.tr,
													styles.casualRow,
													dragOverId === caregiverId ? styles.trDragOver : "",
												].filter(Boolean).join(" ")}
											>
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
														{!casualHasShifts && (
															<button
																className={styles.removeCasualBtn}
																onClick={() => handleRemoveCasualWorker(caregiverId)}
																title="Remove from schedule"
															>
																<X size={11} />
															</button>
														)}
													</div>
												</td>
												{dates.map((dateStr) => {
													const asgn    = caregiverAssignments[dateStr];
													const isToday = dateStr === todayStr;
													const isPast  = dateStr < todayStr;
													return (
														<td
															key={dateStr}
															className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}${isPast ? ` ${styles.tdCellPast}` : ""}`}
														>
															<ShiftCell
																assignment={asgn}
																isExisting={
																	!!asgn?.existing &&
																	!(asgn?.type === "day" && dayTimesChanged) &&
																	!(asgn?.type === "night" && nightTimesChanged)
																}
																isPast={isPast}
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
												<td className={styles.tdTotal}>
													{newCount > 0 && <span className={styles.totalBadge}>{newCount}</span>}
												</td>
											</tr>
										);
									})}

									{/* ── Casual worker search row ────────────── */}
									{selectedHomeId && (
										<tr className={styles.casualSearchRow}>
											<td colSpan={dates.length + 2} className={styles.casualSearchCell}>
												<div className={styles.casualSearchInner}>
													<Search size={14} className={styles.casualSearchIcon} />
													<input
														ref={casualSearchRef}
														className={styles.casualSearchInput}
														placeholder={homeRegion ? `Search casual workers in ${homeRegion}…` : "Search casual workers…"}
														value={casualSearch}
														onChange={(e) => { setCasualSearch(e.target.value); setShowCasualDropdown(true); }}
														onFocus={openCasualDropdown}
													/>
													{casualLoading && <span className={styles.casualSearchSpinner} />}
												</div>
											</td>
										</tr>
									)}
								</tbody>

							</table>
						</div>
					</div>
					)}

					{/* ── Casual worker dropdown (fixed-position) ─────────── */}
					{showCasualDropdown && filteredCasualResults.length > 0 && (
						<div
							className={styles.casualDropdown}
							style={{ top: casualDropdownPos.top, left: casualDropdownPos.left, width: casualDropdownPos.width }}
						>
							{filteredCasualResults.slice(0, 8).map((cg) => {
								const id   = (cg._id || cg.id)?.toString();
								const name = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "Unknown";
								return (
									<button
										key={id}
										className={styles.casualDropdownItem}
										onMouseDown={(e) => { e.preventDefault(); handleAddCasualWorker(cg); }}
									>
										<Image
											src={cg.profilePictureUrl || defaultAvatar}
											alt={name}
											width={26}
											height={26}
											className={styles.casualDropdownAvatar}
										/>
										<div className={styles.casualDropdownInfo}>
											<span className={styles.casualDropdownName}>{name}</span>
											{cg.email && <span className={styles.casualDropdownSub}>{cg.email}</span>}
										</div>
										<UserPlus size={13} className={styles.casualDropdownAddIcon} />
									</button>
								);
							})}
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
							Muted = existing &nbsp;·&nbsp; Bright = new &nbsp;·&nbsp; New shifts: D → N → C → clear &nbsp;·&nbsp; Existing shifts: D → N → C → D &nbsp;·&nbsp; Drag <GripVertical size={11} style={{ display: "inline", verticalAlign: "middle" }} /> to reorder
						</span>
					</div>

				</main>
			</div>
		</div>
	);
}
