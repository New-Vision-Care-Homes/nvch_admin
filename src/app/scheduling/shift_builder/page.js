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
 *    Existing-shift cells cycle the same way; the "+" button under a day adds a
 *    SECOND shift on that day without disturbing the first.
 * 4. Hit "Publish" → only the NEW (non-existing) assignments are sent to the API
 *    as one bulk call, then a success/failure summary is shown.
 *
 * ONE DAY HOLDS MANY SHIFTS
 * ─────────────────────────
 * A caregiver can legitimately work more than once on the same date (a day shift
 * plus a night shift, a short custom top-up, or a multi-day shift ending in the
 * morning followed by a fresh one). So every grid cell is a *stack*: the
 * assignments map is `caregiverId → dateStr → array of cells`, and the bulk API
 * already accepts several assignments for the same date. A cell is addressed by
 * its index in that array.
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
 *
 * LOCKED CELLS (read-only, never submitted)
 * ─────────────────────────────────────────
 * Some shifts occupy a slot but can't be edited from this home's grid. They are
 * kept in a separate `lockedCells` map — derived, never part of `assignments` —
 * and rendered above the editable stack so a slot never *looks* free when it
 * isn't:
 *   missed     — status "missed"; the slot was scheduled but not worked.
 *   busy       — the caregiver is committed to a *client* or a *different home*
 *                during this period (fetched via `caregiverIds`, see below).
 *   unassigned — an open shift at this home with no caregiver. The bulk endpoint
 *                keys assignments by caregiverId, so these get their own
 *                read-only row at the bottom of the grid.
 *
 * ADDITIONAL WORKERS (the search row)
 * ───────────────────────────────────
 * The grid starts from the home's own roster, but the search row at the bottom
 * can pull in ANY active caregiver whose regions include this home's region —
 * not just casuals, since a full-timer from another house in the same region is
 * a legitimate fill-in. Non-roster workers who already hold a shift at this home
 * are surfaced there automatically. A home with an empty roster still renders
 * the whole grid, because that search row is the only way to staff it.
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
import { expandShiftDays, getTodayInHalifax } from "@/utils/timeHandling";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import Modal from "@components/UI/Modal";
import OvertimeInfoBox from "../_components/OvertimeInfoBox";
import { useHomes } from "@/hooks/useHomes";
import { useShifts } from "@/hooks/useShifts";
import { useCaregivers } from "@/hooks/useCaregivers";
import { usePayPeriod } from "@/hooks/usePayPeriods";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

import styles from "./shift_builder.module.css";
import { fullName } from "@/utils/formatting";

// ─── Constants ────────────────────────────────────────────────────────────────

const HALIFAX_TZ = "America/Halifax";
const MAX_DAYS   = 42; // safety cap to prevent runaway renders on bad date ranges

// Statuses that make a shift editable in the grid. Cancelled shifts are void and
// never fetched at all.
const BUILDER_SHIFT_STATUSES = "scheduled,in_progress,completed";

// What the home query actually asks for. `missed` is included so a slot that was
// scheduled but not worked still shows (as a locked ghost) instead of looking as
// though nothing was ever planned — an admin rebuilding the period needs to see
// it. Missed shifts land in `lockedCells`, so they never occupy an editable cell
// and never block scheduling something new on that day.
const BUILDER_FETCH_STATUSES = `${BUILDER_SHIFT_STATUSES},missed`;

// Sentinel row id for open/unassigned shifts at the home. The bulk endpoint keys
// assignments by caregiverId, so this row is display-only.
const UNASSIGNED_ROW_ID = "__unassigned__";

// Shared empty stack. A fresh [] per empty cell would give every DayCell a new
// prop identity on each render, across ~14 days × every caregiver.
const EMPTY_CELLS = [];

// Width of the worker-search dropdown. Fixed rather than matched to the search
// input: that input sits in a colSpan cell spanning the entire grid, so on a
// 14-day period its width is well over a thousand pixels and the dropdown ran
// off the side of the screen.
const SEARCH_DROPDOWN_WIDTH = 340;

/** No-op handler for the read-only unassigned row. */
const noop = () => {};

// `useShifts` hands back a fresh `[]` for as long as its query has no data
// (loading, or held by `enabled`). Feeding that straight into a useMemo makes
// the memo — and the effect that pre-fills the grid from it — see a new
// dependency on every single render. Pin the empty case to one identity.
const EMPTY_SHIFTS = [];
const stableShifts = (shifts) => (shifts?.length ? shifts : EMPTY_SHIFTS);

// Every 30-minute slot from 00:00 → 23:30, used in Custom cell dropdowns and the
// legend's Day / Night hour pickers.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
	const hour   = Math.floor(i / 2);
	const minute = i % 2 === 0 ? "00" : "30";
	return `${String(hour).padStart(2, "0")}:${minute}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "HH:mm" → minutes since midnight. */
function hhmmToMinutes(hhmm) {
	if (!hhmm) return null;
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + (m || 0);
}

/**
 * Duration in hours of a shift window given HH:mm start/end, matching the
 * backend rule: when end <= start the window crosses midnight (end==start → 24h).
 * Returns 0 if either bound is missing.
 */
function windowHours(startHHMM, endHHMM) {
	const s = hhmmToMinutes(startHHMM);
	const e = hhmmToMinutes(endHHMM);
	if (s == null || e == null) return 0;
	const mins = e > s ? e - s : 1440 - s + e;
	return mins / 60;
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

/** Reads a Mongo id off a populated object or a raw string reference. */
function entityId(ref) {
	return (typeof ref === "string" ? ref : (ref?._id || ref?.id))?.toString();
}

/** Appends one cell to `map[caregiverId][dateStr]`, creating the levels as needed. */
function pushCell(map, caregiverId, dateStr, cell) {
	if (!map[caregiverId]) map[caregiverId] = {};
	if (!map[caregiverId][dateStr]) map[caregiverId][dateStr] = [];
	map[caregiverId][dateStr].push(cell);
}

/**
 * Adds API shift objects to an assignments map:
 *   { [caregiverId]: { [dateStr]: [ { type, customStart, customEnd, existing, shiftId }, … ] } }
 *
 * Each date holds an ARRAY because a caregiver can work more than once on the
 * same day (day + night, a custom top-up, a multi-day shift that ends in the
 * morning followed by a fresh one). Writing a single object here silently
 * dropped every shift after the first.
 *
 * `existing: true`  — cell was loaded from the server; shown muted.
 * `shiftId`         — the shift's DB id; included in the PUT payload to update (not re-create) the shift.
 *
 * Custom shifts store their actual Halifax-time start/end so the cell displays the real range.
 *
 * `opts.locked`     — "missed" | "busy" | "unassigned". Produces read-only cells
 *                     that carry no `type`, so every count and payload filter
 *                     skips them exactly the way it skips continuation markers.
 * `opts.rowId`      — forces every shift onto one row (used by the unassigned row).
 * `opts.lockLabel`  — (shift) => string shown on the locked chip's tooltip.
 *
 * This is one of three places that cooperate to render multi-day shifts as
 * "continuation" cells (a shift starting on one day and spanning into the
 * next): this function appends a continuation marker to every day the shift
 * covers after its first, ShiftCell renders that marker as an inert arrow
 * rather than an editable cell, and cycleCell refuses to act on it (the owning
 * start-day cell is the editable one). Each is commented locally — this note is
 * just the map between them.
 */
function addShiftsToAssignments(map, shifts, opts = {}) {
	const { locked = null, rowId = null, lockLabel = null } = opts;

	for (const shift of shifts ?? []) {
		// caregiver may be a populated object { _id, ... } or a raw string ID.
		// Newly-created shifts are often returned un-populated (string only).
		const caregiverId = rowId ?? entityId(shift.caregiver);
		if (!caregiverId) continue;

		const segments = expandShiftDays(shift.startTime, shift.endTime, HALIFAX_TZ);
		if (segments.length === 0) continue;

		const startHfx = DateTime.fromISO(shift.startTime).setZone(HALIFAX_TZ);
		const endHfx   = DateTime.fromISO(shift.endTime).setZone(HALIFAX_TZ);
		const type     = classifyShift(shift);
		const shiftId  = shift._id || shift.id; // needed for PUT /api/shifts/bulk
		const rangeLabel = `${startHfx.toFormat("HH:mm")}–${endHfx.toFormat("HH:mm")}`;
		// Orders the day's stack chronologically. Continuation markers cover the
		// small hours, so they sort ahead of anything starting that morning.
		const sortMinutes = startHfx.hour * 60 + startHfx.minute;

		// Day 1 — the shift's own cell.
		pushCell(map, caregiverId, segments[0].dateStr, locked
			? {
				locked,
				lockType:  type,                       // drives the icon only — NOT a schedulable type
				lockLabel: lockLabel ? lockLabel(shift) : "",
				rangeLabel,
				existing:  true,
				shiftId,
				spanDays:  segments.length,
				sortMinutes,
			}
			: {
				type,
				// For custom shifts, capture the actual times so the cell can display them
				customStart: type === "custom" ? startHfx.toFormat("HH:mm") : "",
				customEnd:   type === "custom" ? endHfx.toFormat("HH:mm")   : "",
				existing:    true,
				shiftId,
				spanDays:    segments.length,
				sortMinutes,
			});

		// Day 2+ — read-only continuation markers tied to the same shift. They carry
		// no `type`, so every count/payload filter skips them; only the start-day
		// cell is editable or published.
		for (let i = 1; i < segments.length; i++) {
			pushCell(map, caregiverId, segments[i].dateStr, {
				continuation: true,
				...(locked ? { locked, lockLabel: lockLabel ? lockLabel(shift) : "" } : {}),
				existing:     true,
				shiftId,
				rangeLabel,
				isLast:       segments[i].isLast,
				sortMinutes:  -1,
			});
		}
	}
	return map;
}

/** Orders every day's stack chronologically (continuations first). */
function sortAssignmentCells(map) {
	for (const dateMap of Object.values(map)) {
		for (const cells of Object.values(dateMap)) {
			cells.sort((a, b) => (a.sortMinutes ?? 0) - (b.sortMinutes ?? 0));
		}
	}
	return map;
}

/**
 * Identity of one failed cell in the bulk response.
 *
 * Includes `type` because a caregiver can now have several shifts on the same
 * date — keying on caregiver + date alone would collapse two failures into a
 * single decision. Two cells on one date can't share a type (identical windows
 * would overlap and be rejected as a conflict, not an overage), so this is unique.
 */
function failureKey(failure) {
	return `${failure.caregiverId}_${failure.date}_${failure.type ?? ""}`;
}

/** Counts cells across the whole grid that match `predicate`, ignoring out-of-range dates. */
function countCells(assignments, dateSet, predicate) {
	let total = 0;
	for (const dateMap of Object.values(assignments)) {
		for (const [dateStr, cells] of Object.entries(dateMap)) {
			if (!dateSet.has(dateStr)) continue;
			for (const cell of cells) if (predicate(cell, dateStr)) total++;
		}
	}
	return total;
}

// ─── Sub-component: ShiftCell ─────────────────────────────────────────────────

/**
 * One clickable cell in the schedule grid.
 *
 * Props:
 *   assignment          — current cell value; undefined = empty.
 *                         Shape: { type: 'day'|'night'|'custom', customStart, customEnd, existing? }
 *                         A cell with no `type` is either a multi-day continuation
 *                         marker or a locked (read-only) slot — both render inert.
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
	const spanNote      = assignment?.spanDays > 1 ? ` · ${assignment.spanDays}-day shift` : "";

	// Continuation of a multi-day shift that started on an earlier day; it belongs
	// to a shift edited via its start-day cell, so it is always inert. A day whose
	// shift ends partway through (e.g. a night shift ending 07:00) can still host a
	// new shift for the rest of that day — that is what the stack's "+" button is
	// for, so the marker itself no longer needs to be clickable.
	if (assignment?.continuation) {
		return (
			<div
				className={`${styles.cellContinuation}${pastClass}`}
				title={assignment.isLast
					? `Ends here from a multi-day shift · ${assignment.rangeLabel}${assignment.locked ? `\n${assignment.lockLabel}` : "\nUse + to schedule the rest of this day"}`
					: `Part of a multi-day shift · ${assignment.rangeLabel} · continues${assignment.locked ? `\n${assignment.lockLabel}` : ""}`}
			>
				{assignment.isLast ? "→|" : "→"}
			</div>
		);
	}

	// Locked cell — the slot is taken by something this grid cannot edit:
	// a missed shift, a commitment at another home/client, or an open shift.
	// It sits above the editable stack purely so the day doesn't look free.
	if (assignment?.locked) {
		const lockIcon = assignment.lockType === "day"   ? <Sun size={10} />
		               : assignment.lockType === "night" ? <Moon size={10} />
		               :                                   null;
		return (
			<div
				className={`${styles.cellLocked} ${styles[`cellLocked_${assignment.locked}`] ?? ""}`}
				title={`${assignment.lockLabel} · ${assignment.rangeLabel}${spanNote}\nRead-only here`}
			>
				{lockIcon}
				<span className={styles.cellLockedLabel}>{assignment.lockLabel}</span>
				<span className={styles.cellLockedRange}>{assignment.rangeLabel}</span>
			</div>
		);
	}

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
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Day · ${dayStart}–${dayEnd}${spanNote}\nClick to change`}
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
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Night · ${nightStart}–${nightEnd}${spanNote}\nClick to change`}
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
				title={isPast ? "Past date — read only" : `${isExisting ? "Existing · " : ""}Custom shift${spanNote} · click to change`}
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

// ─── Sub-component: DayCell ───────────────────────────────────────────────────

/**
 * One day column for one caregiver — a *stack* of shifts, not a single cell.
 *
 * Renders, top to bottom:
 *   1. locked cells   — missed shifts, commitments at another home/client, open
 *                       shifts. Read-only; they exist so a taken slot never looks
 *                       free. They live in their own map and are never submitted.
 *   2. editable cells — this home's shifts for the day, each addressed by its
 *                       index in the assignments array.
 *   3. an "add" affordance — the big empty button when the day has nothing
 *                       editable yet, otherwise a compact "+" underneath.
 *
 * Props:
 *   cells            — editable cells for this caregiver/date (may be empty).
 *   lockedCells      — read-only cells for this caregiver/date (may be empty).
 *   isPast           — past dates are read-only.
 *   onCycle          — (index) => void, advances one editable cell.
 *   onSetCustomTime  — (index, field, value) => void.
 *   onAdd            — () => void, appends a new Day cell to this date.
 */
function DayCell({
	cells,
	lockedCells,
	isPast,
	dayStart,
	dayEnd,
	nightStart,
	nightEnd,
	dayTimesChanged,
	nightTimesChanged,
	onCycle,
	onSetCustomTime,
	onAdd,
}) {
	// A day fully covered by a multi-day shift can't host another one — the
	// backend would reject the overlap — so no "+" there. The shift's LAST day
	// ends partway through, which is exactly the back-to-back-nights case, so
	// that day stays addable.
	const fullyCovered = [...lockedCells, ...cells].some(
		(c) => c.continuation && !c.isLast
	);
	const canAdd = !isPast && !fullyCovered;

	return (
		<div className={styles.cellStack}>
			{lockedCells.map((cell, i) => (
				<ShiftCell key={`locked-${cell.shiftId ?? i}`} assignment={cell} isPast={isPast} />
			))}

			{cells.map((cell, index) => (
				<ShiftCell
					key={cell.shiftId ?? `new-${index}`}
					assignment={cell}
					isExisting={
						!!cell.existing &&
						// Only unmute the type whose times actually changed
						!(cell.type === "day" && dayTimesChanged) &&
						!(cell.type === "night" && nightTimesChanged)
					}
					isPast={isPast}
					dayStart={dayStart}
					dayEnd={dayEnd}
					nightStart={nightStart}
					nightEnd={nightEnd}
					onCycle={() => onCycle(index)}
					onSetCustomTime={(field, value) => onSetCustomTime(index, field, value)}
				/>
			))}

			{cells.length === 0 ? (
				// Nothing editable yet: the whole cell is the click target, exactly as
				// before. Locked cells above don't count — you can still schedule
				// around a missed shift or a commitment elsewhere.
				<ShiftCell assignment={undefined} isPast={!canAdd} onCycle={onAdd} />
			) : canAdd ? (
				<button
					type="button"
					className={styles.cellAddBtn}
					onClick={onAdd}
					title="Add another shift on this day"
				>
					+
				</button>
			) : null}
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

// ─── Sub-component: CapacityExceededModal ─────────────────────────────────────

/**
 * Shown after a bulk publish when one or more cells fail with CAPACITY_EXCEEDED.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The backend blocks any shift that pushes a caregiver past their bi-weekly
 * hour cap unless the request includes an `overageDecision` field.  The 409
 * (or bulk failure row) comes back with a `details` payload giving the exact
 * hours breakdown — those numbers populate the cards below.
 *
 * TWO PATHS the admin can choose per shift
 * ─────────────────────────────────────────
 * "mandated"  — Management-mandated overtime.  The overage pays at 1.5× (handled
 *               by the payroll company; this system tracks hours only).  No
 *               caregiver action is required.  The shift is created immediately.
 *
 * "voluntary" — The caregiver chose to work extra.  A bank-or-pay acknowledgment
 *               approval is pushed to the caregiver's mobile app.  Until they
 *               respond, the shift shows a "Pending" badge in the grid and
 *               clock-in is blocked.  Once acknowledged, the overage goes into
 *               hours_banked (if they elected to bank) or other (straight time).
 *
 * FLOW after confirming
 * ─────────────────────
 * 1. doResubmitWithDecisions rebuilds a payload of only the failed cells with
 *    overageDecision attached per cell.
 * 2. The same bulk endpoint is called (POST or PUT, matching the original submit).
 * 3. The query invalidates, the grid reloads.  Voluntary shifts come back with
 *    extraHours.ackStatus: "pending" — the "Overtime Pending" badge is shown on
 *    the shift detail page (scheduling/[id]) until the caregiver acknowledges.
 * 4. Once the caregiver acknowledges on mobile, ackStatus becomes "acknowledged"
 *    and the badge disappears — the shift is a regular scheduled shift.
 *
 * Props:
 *   failures          — CAPACITY_EXCEEDED failure objects from the bulk API response
 *   allCaregivers     — combined home roster + added casuals (for name lookup)
 *   decisions         — { [caregiverId_date]: "mandated"|"voluntary" }
 *   onDecisionChange  — (key, value) => void — updates one decision in parent state
 *   onConfirm         — () => void — fires doResubmitWithDecisions
 *   onCancel          — () => void — closes modal without resubmitting
 *   isSubmitting      — disables the confirm button while the API call is in-flight
 */
function CapacityExceededModal({
	failures,
	allCaregivers,
	decisions,
	onDecisionChange,
	onConfirm,
	onCancel,
	isSubmitting,
}) {
	// The confirm button stays disabled until every failure has a decision.
	const allDecided =
		failures.length > 0 &&
		failures.every((f) => decisions[failureKey(f)]);

	return (
		<Modal isOpen onClose={onCancel}>
			<div className={styles.capacityModalBody}>

				{/* Header */}
				<div className={styles.capacityModalHeader}>
					<AlertCircle size={22} className={styles.capacityModalIcon} />
					<div>
						<h2 className={styles.capacityModalTitle}>Overtime Decision Required</h2>
						<p className={styles.capacityModalSubtitle}>
							{failures.length} shift{failures.length !== 1 ? "s" : ""}{" "}
							add{failures.length === 1 ? "s" : ""} hours past the caregiver&apos;s
							bi-weekly capacity. Choose how to handle each one before resubmitting.
						</p>
					</div>
				</div>

				{/* Explains the two paths up front so the per-card choice below isn't a guess */}
				<OvertimeInfoBox />

				{/* One card per CAPACITY_EXCEEDED failure */}
				<div className={styles.capacityFailureList}>
					{failures.map((failure) => {
						// Unique key for this caregiver + date + shift-type combination
						const key = failureKey(failure);
						const {
							maxHours,
							committedHours,
							shiftHours,
							projectedTotal,
							overageHours,
							designatedOverageHours,
							newOverageHours,
						} = failure.details ?? {};

						// Overage is attributed incrementally: the decision is about what
						// THIS cell adds on top of the overage other shifts in the period
						// already carry, not the period-wide total. Fall back to
						// `overageHours` so a pre-incremental backend still renders.
						const newOverage = newOverageHours ?? overageHours;
						const alreadyDesignated = designatedOverageHours ?? 0;

						// Look up display name from the combined caregiver list
						const cg = allCaregivers.find(
							(c) => (c._id || c.id)?.toString() === failure.caregiverId
						);
						const cgName = cg ? fullName(cg, "Unknown") : failure.caregiverId;

						// Human-readable date (falls back to ISO string on parse error)
						let displayDate = failure.date;
						try { displayDate = format(parseISO(failure.date), "MMM d, yyyy"); } catch {}

						const chosen = decisions[key];

						return (
							<div key={key} className={styles.capacityFailureItem}>

								{/* Caregiver name + date */}
								<div className={styles.capacityFailureName}>
									<strong>{cgName}</strong>
									<span className={styles.capacityFailureDate}>{displayDate}</span>
								</div>

								{/* Hours breakdown chips — mirrors the 409 details payload */}
								<div className={styles.capacityStatsRow}>
									<span className={styles.capacityStatChip}>Max {maxHours}h</span>
									<span className={styles.capacityStatChip}>Committed {committedHours}h</span>
									<span className={styles.capacityStatChip}>This shift {shiftHours}h</span>
									<span className={styles.capacityStatChip}>Total {projectedTotal}h</span>
									{alreadyDesignated > 0 && (
										<span className={styles.capacityStatChip}>
											Designated {alreadyDesignated}h
										</span>
									)}
									<span className={`${styles.capacityStatChip} ${styles.capacityStatOver}`}>
										+{newOverage}h added
									</span>
								</div>

								{/*
								 * Decision buttons — one click selects a choice (no submit needed
								 * per card; the main Confirm button is gated on allDecided).
								 *
								 * "Mandate"   → overageDecision: "mandated"
								 * "Voluntary" → overageDecision: "voluntary"
								 */}
								<div className={styles.capacityDecisionRow}>
									<button
										className={`${styles.capacityDecisionBtn}${chosen === "mandated" ? ` ${styles.capacityDecisionBtnActive}` : ""}`}
										onClick={() => onDecisionChange(key, "mandated")}
									>
										<strong>Mandate overtime</strong>
										<span>Counted as overtime for payroll · no caregiver action needed</span>
									</button>
									<button
										className={`${styles.capacityDecisionBtn}${chosen === "voluntary" ? ` ${styles.capacityDecisionBtnActive}` : ""}`}
										onClick={() => onDecisionChange(key, "voluntary")}
									>
										<strong>Voluntary</strong>
										<span>Caregiver acknowledges via app · paid regular (or banked)</span>
									</button>
								</div>

							</div>
						);
					})}
				</div>

				{/* Action row — Confirm is disabled until every card has a decision */}
				<div className={styles.capacityModalActions}>
					<Button
						icon={<Zap size={15} />}
						onClick={onConfirm}
						disabled={!allDecided || isSubmitting}
					>
						{isSubmitting ? "Resubmitting…" : "Confirm & Resubmit"}
					</Button>
					<Button variant="secondary" onClick={onCancel}>
						Cancel
					</Button>
				</div>

			</div>
		</Modal>
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

	// ── Long-shift (>12h) confirmation ────────────────────────────────────────
	// Shifts longer than 12 hours are allowed but unusual, so publishing/saving
	// warns first rather than blocking.
	const [showLongShiftModal, setShowLongShiftModal] = useState(false);
	const [longShiftCount, setLongShiftCount] = useState(0);

	// ── Capacity-exceeded overage decision modal ──────────────────────────────
	// Populated when the bulk API returns one or more CAPACITY_EXCEEDED failures.
	// Holds:
	//   failures        — the failed cells from result.failed (code === "CAPACITY_EXCEEDED")
	//   decisions       — { [caregiverId_date]: "mandated"|"voluntary" } — filled by admin
	//   originalPayload — the caregiverPayload we sent, needed to resubmit only the failed cells
	//   sharedBody      — the endpoint params (dates, homeId, timezone, shift times)
	//   mode            — "create" (POST, empty period) | "save" (PUT, period has existing shifts)
	// null = modal is closed.
	const [capacityModalData, setCapacityModalData] = useState(null);

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
	// Tracks IDs that the admin explicitly added via search (vs auto-detected from shifts).
	// Auto-detected workers are removed when navigating to a period where they have no shifts;
	// manually-added workers are always kept so the admin can still assign shifts to them.
	const manuallyAddedCasualIds = useRef(new Set());

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
			status: BUILDER_FETCH_STATUSES,
			...(selectedHomeId ? { homeId: selectedHomeId } : {}),
			limit: 1000,
		},
		// Held until the period and home are known — without the date range the
		// endpoint falls back to pagination and would return unrelated shifts.
		enabled: !!startDate && !!endDate && !!selectedHomeId,
	});

	// The home query returns everything occupying a slot this period, in three
	// flavours the grid treats very differently:
	//
	//   editableShifts — assigned and workable. These pre-fill the editable grid
	//                    and decide POST (create-only) vs PUT (create + update).
	//   missedShifts   — scheduled but not worked. Shown as locked ghosts so the
	//                    slot doesn't read as "nothing was ever planned"; they
	//                    don't occupy an editable cell, so a replacement shift can
	//                    still be scheduled on that day.
	//   openShifts     — no caregiver. The bulk endpoint keys assignments by
	//                    caregiverId, so these can't be edited here and get their
	//                    own read-only row at the bottom of the grid.
	//
	// Cancelled shifts are excluded server-side; the guard here is belt-and-
	// suspenders so a stray one can never pre-fill the grid, flag a casual worker,
	// or flip the period into PUT (save) mode.
	const homeShifts = stableShifts(existingShifts);

	const editableShifts = useMemo(
		() => homeShifts.filter(
			(s) => s.caregiver && s.status !== "cancelled" && s.status !== "missed"
		),
		[homeShifts]
	);

	const missedShifts = useMemo(
		() => homeShifts.filter((s) => s.caregiver && s.status === "missed"),
		[homeShifts]
	);

	const openShifts = useMemo(
		() => homeShifts.filter((s) => !s.caregiver && s.status !== "cancelled"),
		[homeShifts]
	);

	// Editable + missed. Used to decide who gets a row: a casual worker whose only
	// shift here this period was missed still needs one, or the ghost would have
	// nowhere to render and the slot would look empty all over again.
	const assignedHomeShifts = useMemo(
		() => [...editableShifts, ...missedShifts],
		[editableShifts, missedShifts]
	);

	// Every worker who gets a row: the home's roster plus the casual workers
	// surfaced or added below it. Sorted so the query key stays stable.
	const rosterIds = useMemo(() => {
		const ids = new Set();
		for (const cg of homeDetail?.caregivers ?? []) {
			const id = entityId(cg);
			if (id) ids.add(id);
		}
		for (const cg of addedCasualWorkers) {
			const id = entityId(cg);
			if (id) ids.add(id);
		}
		return [...ids].sort();
	}, [homeDetail?.caregivers, addedCasualWorkers]);

	// Second pass over the same period for those same workers, this time WITHOUT
	// the homeId filter. A shift targets either a home or a client, never both, so
	// the home query structurally cannot see a roster member's client-targeted
	// shift — nor one they're working at a different home. Those slots are
	// genuinely taken, and an admin needs to see that before double-booking.
	// Rendered locked: visible here, editable only where they belong.
	const { shifts: rosterShifts } = useShifts({
		params: {
			startDate,
			endDate,
			status: BUILDER_SHIFT_STATUSES,
			caregiverIds: rosterIds.join(","),
			limit: 1000,
		},
		enabled: !!startDate && !!endDate && rosterIds.length > 0,
	});

	// Drop this home's own shifts — the home query above already owns those.
	const busyShifts = useMemo(
		() => stableShifts(rosterShifts).filter((s) => entityId(s.home) !== selectedHomeId),
		[rosterShifts, selectedHomeId]
	);

	// Read-only overlay: everything occupying a slot that this grid can't edit.
	// Deliberately kept OUT of `assignments` state so it can never be counted,
	// published, or clobbered by an edit — the grid merges the two at render time,
	// and every existing count/payload filter stays untouched.
	const lockedCells = useMemo(() => {
		const map = {};
		addShiftsToAssignments(map, missedShifts, {
			locked:    "missed",
			lockLabel: () => "Missed",
		});
		addShiftsToAssignments(map, busyShifts, {
			locked:    "busy",
			lockLabel: (s) => (s.client
				? `Client · ${fullName(s.client, "client")}`
				: `Home · ${s.home?.name ?? "elsewhere"}`),
		});
		addShiftsToAssignments(map, openShifts, {
			locked:    "unassigned",
			rowId:     UNASSIGNED_ROW_ID,
			lockLabel: (s) => (s.status === "missed" ? "Open · missed" : "Open"),
		});
		return sortAssignmentCells(map);
	}, [missedShifts, busyShifts, openShifts]);

	// Present only when the home has open shifts this period — drives the extra
	// read-only row at the bottom of the grid.
	const unassignedCells = lockedCells[UNASSIGNED_ROW_ID];

	// The pool the search row draws from: every active caregiver whose regions
	// include this home's region — deliberately NOT restricted to casuals. A
	// full-timer based at another house in the same region is a legitimate
	// fill-in, and roster members are filtered out of the results below since
	// they already have a row.
	//
	// Fetched once per region and filtered client-side so typing is instant.
	// `limit` is therefore the ceiling on how many of a region's caregivers are
	// searchable — raise it if a region ever outgrows it.
	const homeRegion = homeDetail?.region ?? null;
	const { caregivers: regionCaregivers, isCaregiverLoading: casualLoading } = useCaregivers({
		params: { region: homeRegion, isActive: true, limit: 200 },
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
	// Runs whenever the editable shifts change.
	// Builds a fresh assignments map from server data and saves it as the base
	// so clearAll can restore to this state.
	// Also captures the current day/night times as a baseline — if the user later
	// edits those times, `timesChanged` becomes true and the PUT payload will
	// include the existing Day/Night cells so their times get updated too.
	useEffect(() => {
		const base = sortAssignmentCells(addShiftsToAssignments({}, editableShifts));
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
	}, [editableShifts]);

	// Auto-detect casual workers who have shifts in this home/period but aren't in
	// the home's permanent roster. Runs whenever existingShifts or homeDetail.caregivers
	// resolves/updates.
	// Two responsibilities in one pass:
	//   1. REMOVE any workers that are actually in the home's permanent roster
	//      (guards against the race where homeDetail resolves after existingShifts
	//      with an empty caregivers list, causing all shift workers to be flagged
	//      as "extra" before the real list arrives).
	//   2. ADD workers from the home's shifts whose IDs are not in the roster.
	useEffect(() => {
		if (!homeDetail?.caregivers) return;
		const homeCgIds = new Set(
			homeDetail.caregivers.map((cg) => (cg._id || cg.id)?.toString())
		);

		// Build the set of genuinely extra workers from shift data
		const extraMap = {};
		if (assignedHomeShifts.length) {
			for (const shift of assignedHomeShifts) {
				const cg = shift.caregiver;
				if (!cg || typeof cg === "string") continue;
				const id = (cg._id || cg.id)?.toString();
				if (!id || homeCgIds.has(id) || extraMap[id]) continue;
				extraMap[id] = cg;
			}
		}

		setAddedCasualWorkers((prev) => {
			// Strip out anyone who:
			// - is now a permanent home caregiver, OR
			// - has no shifts this period AND was not manually added via search
			const cleaned = prev.filter((w) => {
				const id = (w._id || w.id)?.toString();
				if (homeCgIds.has(id)) return false;
				if (manuallyAddedCasualIds.current.has(id)) return true;
				return !!extraMap[id];
			});
			// Add genuinely extra workers not already in the list
			const cleanedIds = new Set(cleaned.map((w) => (w._id || w.id)?.toString()));
			const toAdd = Object.values(extraMap).filter((w) => !cleanedIds.has((w._id || w.id)?.toString()));
			if (cleaned.length === prev.length && toAdd.length === 0) return prev; // nothing changed
			return toAdd.length > 0 ? [...cleaned, ...toAdd] : cleaned;
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [assignedHomeShifts, homeDetail?.caregivers]);

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

	// Caregivers that belong to the selected home. Memoised so the `?? []`
	// fallback doesn't hand every dependent memo a brand-new array each render.
	const caregivers = useMemo(() => homeDetail?.caregivers ?? [], [homeDetail?.caregivers]);

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

	// ─ Worker search ────────────────────────────────────────────────────────────

	// Search results — hides anyone who already has a row in the grid: the
	// home's permanent roster plus the workers added below it. Matches on name
	// or email so an admin can paste either.
	const filteredCasualResults = useMemo(() => {
		const shownIds = new Set([
			...caregivers.map(entityId),
			...addedCasualWorkers.map(entityId),
		]);
		const q = casualSearch.trim().toLowerCase();
		return (regionCaregivers || []).filter((cg) => {
			if (shownIds.has(entityId(cg))) return false;
			if (!q) return true;
			const name = [cg.firstName, cg.lastName].filter(Boolean).join(" ").toLowerCase();
			return name.includes(q) || (cg.email || "").toLowerCase().includes(q);
		});
	}, [regionCaregivers, casualSearch, addedCasualWorkers, caregivers]);

	// ─ Grid summary counts ──────────────────────────────────────────────────────
	// These drive the "Publish N Shifts" / "Save Schedule" button label and
	// the guard that prevents empty submits.

	// Brand-new cells — no shiftId means they'll be created, not updated
	const assignmentCount = useMemo(
		() => countCells(assignments, dateSet,
			(c) => !!c.type && !c.existing && !c.wasExisting && !c.shiftId),
		[assignments, dateSet]
	);

	// Cells cycled from an existing shift (have shiftId) — these are updates, not creates
	const updatedCount = useMemo(
		() => countCells(assignments, dateSet,
			(c) => !!c.type && !c.existing && !c.wasExisting && !!c.shiftId),
		[assignments, dateSet]
	);

	// Existing custom cells whose inline times were edited (shown separately on the button)
	const modifiedCustomCount = useMemo(
		() => countCells(assignments, dateSet,
			(c) => c.wasExisting && c.type === "custom"),
		[assignments, dateSet]
	);

	// True when the selected period already has shifts from the server.
	// Determines POST (create-only) vs PUT (create + update) mode.
	// Locked cells (missed / busy elsewhere / unassigned) deliberately don't count:
	// none of them can be updated through the bulk endpoint, so a period holding
	// only those is still a create-only publish.
	const hasExistingShifts = editableShifts.length > 0;

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
	const affectedDayCount = useMemo(
		() => (dayTimesChanged
			? countCells(assignments, dateSet, (c) => c.existing && c.type === "day")
			: 0),
		[assignments, dateSet, dayTimesChanged]
	);

	const affectedNightCount = useMemo(
		() => (nightTimesChanged
			? countCells(assignments, dateSet, (c) => c.existing && c.type === "night")
			: 0),
		[assignments, dateSet, nightTimesChanged]
	);

	// ── Handlers ──────────────────────────────────────────────────────────────

	// ─ Grid cell actions ────────────────────────────────────────────────────────
	// cycleCell / setCustomTime / clearRow / clearAll all write to the assignments map.
	// They never touch the server — Publish/Save sends the final state in one call.

	/**
	 * Advances one cell of a day's stack through:
	 *   existing → day → night → custom → day   (updates keep their shiftId)
	 *   new      → night → custom → gone        (creates can be cleared away)
	 *
	 * `index` addresses the cell within `assignments[caregiverId][dateStr]`.
	 *
	 * When cycling an existing cell, `shiftId` is preserved so the PUT endpoint
	 * can update (not duplicate) the shift. `existing: true` is dropped so the cell
	 * renders bright, signalling it has been modified.
	 *
	 * Note: cycling a new cell all the way to "clear" removes it from the stack;
	 * cycling an EXISTING cell never clears it, because dropping it here would not
	 * cancel the shift on the server — use the cancel flow for that.
	 */
	const cycleCell = useCallback((caregiverId, dateStr, index) => {
		setAssignments((prev) => {
			const caregiverMap = { ...(prev[caregiverId] || {}) };
			const cells        = [...(caregiverMap[dateStr] || [])];
			const current      = cells[index];
			if (!current) return prev;
			// A continuation marker belongs to a multi-day shift owned by an earlier
			// day's cell, so it is never edited in place. Scheduling something on a
			// day a shift runs into is done with the stack's "+" button instead.
			if (current.continuation) return prev;
			const shiftId = current.shiftId;

			if (current.existing) {
				cells[index] = { type: "day", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else if (current.type === "day") {
				cells[index] = { type: "night", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else if (current.type === "night") {
				cells[index] = { type: "custom", customStart: "", customEnd: "", ...(shiftId ? { shiftId } : {}) };
			} else if (shiftId) {
				// Existing shift: custom → Day (DNC loop — no blank state for updates)
				cells[index] = { type: "day", customStart: "", customEnd: "", shiftId };
			} else {
				// New shift: custom → clear. Drop it out of the stack entirely.
				cells.splice(index, 1);
			}

			if (cells.length === 0) delete caregiverMap[dateStr];
			else caregiverMap[dateStr] = cells;
			return { ...prev, [caregiverId]: caregiverMap };
		});
	}, []);

	/**
	 * Appends a new Day cell to a date's stack.
	 *
	 * This is the only way a second shift lands on a day that already has one —
	 * clicking an existing cell edits it rather than stacking on top of it. The
	 * bulk endpoint takes assignments as a flat per-caregiver list, so several
	 * cells on the same date need no special handling on the way out.
	 */
	const addCell = useCallback((caregiverId, dateStr) => {
		setAssignments((prev) => {
			const caregiverMap = { ...(prev[caregiverId] || {}) };
			caregiverMap[dateStr] = [
				...(caregiverMap[dateStr] || []),
				{ type: "day", customStart: "", customEnd: "" },
			];
			return { ...prev, [caregiverId]: caregiverMap };
		});
	}, []);

	/** Updates one time field (customStart or customEnd) on a Custom cell.
	 *  If the cell was loaded from the API (existing: true), editing its times
	 *  clears that flag so it lights up, counts toward the button total, and
	 *  gets included in the PUT payload with its shiftId. */
	const setCustomTime = useCallback((caregiverId, dateStr, index, field, value) => {
		setAssignments((prev) => {
			const cells   = [...(prev[caregiverId]?.[dateStr] || [])];
			const current = cells[index];
			if (!current) return prev;
			cells[index] = {
				...current,
				[field]: value,
				// Touching the time on an existing cell marks it as modified.
				// wasExisting distinguishes "edited server shift" from a brand-new cell.
				...(current.existing ? { existing: false, wasExisting: true } : {}),
			};
			return {
				...prev,
				[caregiverId]: { ...(prev[caregiverId] || {}), [dateStr]: cells },
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
		manuallyAddedCasualIds.current.clear();
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
		// Manually-added casual workers are period-specific — clear so they don't
		// bleed into the new period. The auto-detection effect will re-add any who
		// have actual shifts in the new period.
		manuallyAddedCasualIds.current.clear();
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
		const id = (caregiver._id || caregiver.id)?.toString();
		manuallyAddedCasualIds.current.add(id);
		setAddedCasualWorkers((prev) => {
			if (prev.some((cg) => (cg._id || cg.id)?.toString() === id)) return prev;
			return [...prev, caregiver];
		});
		setCasualSearch("");
		setShowCasualDropdown(false);
	}, []);

	const handleRemoveCasualWorker = useCallback((caregiverId) => {
		manuallyAddedCasualIds.current.delete(caregiverId);
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
			const rect  = casualSearchRef.current.getBoundingClientRect();
			// Anchor to the input's left edge, but keep the whole dropdown on
			// screen: the row is inside a horizontally scrollable table, so that
			// edge can sit far to the right (or off-screen) on a wide grid.
			const width = Math.min(SEARCH_DROPDOWN_WIDTH, window.innerWidth - 16);
			const left  = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
			setCasualDropdownPos({ top: rect.bottom + 4, left, width });
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
	// Counts cells that WILL be written and whose duration exceeds 12 hours, so we
	// can warn before publishing. Mirrors the payload filters in doSubmit().
	const countLongShifts = () => countCells(assignments, dateSet, (v) => {
		if (!v.type) return false;
		const willWrite = !v.existing || (
			(v.type === "day" && dayTimesChanged) ||
			(v.type === "night" && nightTimesChanged)
		);
		if (!willWrite) return false;
		const hrs = v.type === "day"   ? windowHours(dayStart, dayEnd)
		          : v.type === "night" ? windowHours(nightStart, nightEnd)
		          :                      windowHours(v.customStart, v.customEnd);
		return hrs > 12;
	});

	// Gate: warn on any >12h shift, then run the real submit once confirmed.
	const handleSubmit = () => {
		if (!selectedHomeId) return;
		if (isBulkPending || isSaveBulkPending) return;
		const longCount = countLongShifts();
		if (longCount > 0) {
			setLongShiftCount(longCount);
			setShowLongShiftModal(true);
			return;
		}
		doSubmit();
	};

	const doSubmit = async () => {
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
				const cells = [];
				for (const [d, dayCells] of Object.entries(dateMap)) {
					if (!dateSet.has(d)) continue;
					for (const v of dayCells) {
						if (!v.type || v.existing) continue;
						const entry = { date: d, type: v.type };
						if (v.type === "custom") entry.customTime = { start: v.customStart, end: v.customEnd };
						cells.push(entry);
					}
				}
				if (cells.length > 0) caregiverPayload.push({ caregiverId, assignments: cells });
			}
			if (caregiverPayload.length === 0) return;

			try {
				const result = await createBulkShifts({ ...sharedBody, caregivers: caregiverPayload });
				setBulkResult(result);

				// If any cells failed because they push the caregiver past their bi-weekly
				// capacity, open the overage-decision modal.  The admin picks "mandated" or
				// "voluntary" per shift, then hits Confirm — doResubmitWithDecisions sends
				// only those cells back with overageDecision attached.
				// Other error codes (e.g. conflicts) are already visible in the result banner.
				const capacityFailures = (result.failed ?? []).filter(
					(f) => f.code === "CAPACITY_EXCEEDED"
				);
				if (capacityFailures.length > 0) {
					setCapacityModalData({
						failures:        capacityFailures,
						decisions:       {},               // admin fills this in the modal
						originalPayload: caregiverPayload, // needed to reconstruct the cells on resubmit
						sharedBody,                        // dates, homeId, timezone, shift times
						mode:            "create",         // POST endpoint — period had no prior shifts
					});
				}
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
				for (const [d, dayCells] of Object.entries(dateMap)) {
					if (!dateSet.has(d)) continue;
					for (const v of dayCells) {
						// Skips continuation markers — they have no `type` and are owned
						// by their start-day cell.
						if (!v.type) continue;

						if (!v.existing) {
							// User modified this cell (new, cycled from existing, or custom time edited)
							// shiftId present → backend updates; absent → backend creates
							const entry = { date: d, type: v.type };
							if (v.shiftId) entry.shiftId = v.shiftId;
							if (v.type === "custom") entry.customTime = { start: v.customStart, end: v.customEnd };
							cells.push(entry);
						} else if (
							v.shiftId &&
							((v.type === "day" && dayTimesChanged) || (v.type === "night" && nightTimesChanged))
						) {
							// Untouched Day/Night cell whose global times changed — re-send so backend updates times
							cells.push({ shiftId: v.shiftId, date: d, type: v.type });
						}
					}
				}
				if (cells.length > 0) caregiverPayload.push({ caregiverId, assignments: cells });
			}
			if (caregiverPayload.length === 0) return;

			try {
				const result = await saveBulkShifts({ ...sharedBody, caregivers: caregiverPayload });
				setBulkResult(result);

				// Same CAPACITY_EXCEEDED handling as the POST path above, but for the
				// PUT (save) endpoint when the period already has existing shifts.
				const capacityFailures = (result.failed ?? []).filter(
					(f) => f.code === "CAPACITY_EXCEEDED"
				);
				if (capacityFailures.length > 0) {
					setCapacityModalData({
						failures:        capacityFailures,
						decisions:       {},
						originalPayload: caregiverPayload,
						sharedBody,
						mode:            "save",           // PUT endpoint — period already had shifts
					});
				}
			} catch (err) {
				setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
			}
		}
	};

	// ── Resubmit with overage decisions ──────────────────────────────────────

	/**
	 * Called when the admin confirms the CapacityExceededModal.
	 *
	 * WHAT IT DOES
	 * ─────────────
	 * Rebuilds a minimal payload containing only the cells that failed with
	 * CAPACITY_EXCEEDED, each with the admin's overageDecision attached, then
	 * calls the same bulk endpoint that was used in the original submit.
	 *
	 * WHY "only those cells"
	 * ──────────────────────
	 * Every other cell from the original submit either already succeeded (now an
	 * existing shift in the grid) or failed for a different reason (already shown
	 * in the result banner).  Re-sending them would risk duplicates or unintended
	 * updates.
	 *
	 * RESULT MERGING
	 * ──────────────
	 * The resubmission result is merged into the existing result banner so the
	 * admin sees the full picture in one place.  The CAPACITY_EXCEEDED entries
	 * that were showing in the banner are replaced by whatever this call returns
	 * (success or a new error).
	 *
	 * VOLUNTARY SHIFTS AFTER SUCCESS
	 * ────────────────────────────────
	 * The query invalidates → the grid reloads → voluntary shifts come back with
	 * extraHours.ackStatus: "pending" → the "Overtime Pending" badge is shown on
	 * the shift detail page (scheduling/[id]).  Once the caregiver acknowledges on
	 * mobile (bank or pay), ackStatus becomes "acknowledged" and the badge clears.
	 */
	const doResubmitWithDecisions = useCallback(async () => {
		if (!capacityModalData) return;
		const { failures, decisions, originalPayload, sharedBody, mode } = capacityModalData;

		// Build a payload of only the previously-failed cells with overageDecision added.
		const resubmitPayload = [];
		for (const failure of failures) {
			const decision = decisions[failureKey(failure)];
			if (!decision) continue; // guarded by allDecided in modal, but safety-first

			// Recover the original cell we sent (type, customTime, shiftId for updates)
			const cgEntry      = originalPayload.find((p) => p.caregiverId === failure.caregiverId);
			const originalCell = cgEntry?.assignments?.find(
				(a) => a.date === failure.date && a.type === failure.type
			);
			if (!originalCell) continue;

			// Append to the right caregiver bucket in the resubmit payload
			let resubCg = resubmitPayload.find((p) => p.caregiverId === failure.caregiverId);
			if (!resubCg) {
				resubCg = { caregiverId: failure.caregiverId, assignments: [] };
				resubmitPayload.push(resubCg);
			}
			// Spread the original cell so type/customTime/shiftId are preserved,
			// then attach the admin's decision for the backend gate.
			resubCg.assignments.push({ ...originalCell, overageDecision: decision });
		}

		if (resubmitPayload.length === 0) {
			setCapacityModalData(null);
			return;
		}

		// Close the modal before the async call so the UI doesn't appear frozen
		setCapacityModalData(null);

		try {
			// Use the same endpoint (POST for new period, PUT for existing)
			const apiCall = mode === "save" ? saveBulkShifts : createBulkShifts;
			const result  = await apiCall({ ...sharedBody, caregivers: resubmitPayload });

			// Merge the resubmission result into the existing result banner.
			// The CAPACITY_EXCEEDED entries are removed from both the failed list
			// AND the summary count — they were resolved by this resubmit, so they
			// should no longer appear as failures.
			setBulkResult((prev) => {
				if (!prev) return result;
				const resolvedCount = (prev.failed ?? []).filter(
					(f) => f.code === "CAPACITY_EXCEEDED"
				).length;
				return {
					...result,
					summary: {
						created: (prev.summary?.created ?? 0) + (result.summary?.created ?? 0),
						updated: (prev.summary?.updated ?? 0) + (result.summary?.updated ?? 0),
						failed:  (prev.summary?.failed  ?? 0) - resolvedCount + (result.summary?.failed ?? 0),
					},
					failed: [
						...(prev.failed ?? []).filter((f) => f.code !== "CAPACITY_EXCEEDED"),
						...(result.failed ?? []),
					],
				};
			});
		} catch (err) {
			setSubmitError(err?.response?.data?.error || "An unexpected error occurred");
		}
	}, [capacityModalData, saveBulkShifts, createBulkShifts]);

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

					{/* ── Warning before saving a schedule with >12h shifts ──── */}
					<Modal isOpen={showLongShiftModal} onClose={() => setShowLongShiftModal(false)}>
						<div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "1rem 0.5rem" }}>
							<h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--color-primary)" }}>Long shift warning</h2>
							<p style={{ marginTop: "0.75rem", color: "#4b5563", lineHeight: 1.5 }}>
								<strong>{longShiftCount} shift{longShiftCount !== 1 ? "s" : ""}</strong> in this schedule {longShiftCount !== 1 ? "are" : "is"} longer than 12 hours.
								Are you sure you want to save the schedule?
							</p>
							<div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
								<Button
									icon={<Zap size={15} />}
									disabled={isBulkPending || isSaveBulkPending}
									onClick={() => { setShowLongShiftModal(false); doSubmit(); }}
								>
									Yes, save schedule
								</Button>
								<Button variant="secondary" onClick={() => setShowLongShiftModal(false)}>Cancel</Button>
							</div>
						</div>
					</Modal>

					{/*
					 * ── Capacity-exceeded overage decision modal ──────────────
					 *
					 * Opens automatically after a publish that has CAPACITY_EXCEEDED
					 * failures.  The admin sees one card per over-capacity shift with
					 * the hours breakdown and picks a decision:
					 *
					 *   Mandate overtime — shift created immediately as overtime pay.
					 *                      No caregiver action required.
					 *
					 *   Voluntary        — an acknowledgment approval is sent to the
					 *                      caregiver's mobile app.  The shift is created
					 *                      with ackStatus: "pending".  The "Overtime Pending"
					 *                      badge appears on the shift detail page until the
					 *                      caregiver responds (bank or pay).  Clock-in is
					 *                      blocked until acknowledged.
					 *
					 * Once all cards have a decision the "Confirm & Resubmit" button
					 * enables — doResubmitWithDecisions sends only those failed cells
					 * back with overageDecision attached per cell.
					 *
					 * Cancelling closes the modal without resubmitting.  The CAPACITY_
					 * EXCEEDED cells remain unscheduled; the admin can re-publish them
					 * (which will reopen this modal) or leave them out of the schedule.
					 */}
					{capacityModalData && (
						<CapacityExceededModal
							failures={capacityModalData.failures}
							allCaregivers={[...caregivers, ...addedCasualWorkers]}
							decisions={capacityModalData.decisions}
							onDecisionChange={(key, val) =>
								setCapacityModalData((prev) => ({
									...prev,
									decisions: { ...prev.decisions, [key]: val },
								}))
							}
							onConfirm={doResubmitWithDecisions}
							onCancel={() => setCapacityModalData(null)}
							isSubmitting={isBulkPending || isSaveBulkPending}
						/>
					)}

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
											const caregiverLocked      = lockedCells[caregiverId] || {};

											// Only count NEW (non-existing) assignments for this row
											const newCount = countCells(
												{ row: caregiverAssignments }, dateSet,
												(c) => !!c.type && !c.existing
											);

											const cgName       = fullName(caregiver, "Unknown");
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
																alt={cgName}
																width={28}
																height={28}
																className={styles.cgAvatar}
															/>
															<span className={styles.tdNameText}>{cgName}</span>
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
														const isToday = dateStr === todayStr;
														const isPast  = dateStr < todayStr;
														return (
															<td
																key={dateStr}
																className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}${isPast ? ` ${styles.tdCellPast}` : ""}`}
															>
																<DayCell
																	cells={caregiverAssignments[dateStr] || EMPTY_CELLS}
																	lockedCells={caregiverLocked[dateStr] || EMPTY_CELLS}
																	isPast={isPast}
																	dayStart={dayStart}
																	dayEnd={dayEnd}
																	nightStart={nightStart}
																	nightEnd={nightEnd}
																	dayTimesChanged={dayTimesChanged}
																	nightTimesChanged={nightTimesChanged}
																	onCycle={(index) => cycleCell(caregiverId, dateStr, index)}
																	onSetCustomTime={(index, field, value) => setCustomTime(caregiverId, dateStr, index, field, value)}
																	onAdd={() => addCell(caregiverId, dateStr)}
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

									{/*
									 * ── Empty roster hint ────────────────────
									 * A home with nobody assigned still gets the
									 * full grid — the search row below is the only
									 * way to staff it, so hiding the table would
									 * leave the admin with nothing to act on.
									 */}
									{sortedCaregivers.length === 0 && addedCasualWorkers.length === 0 && (
										<tr className={styles.emptyRosterRow}>
											<td colSpan={dates.length + 2} className={styles.emptyRosterCell}>
												No caregivers are assigned to this home
												{homeRegion
													? ` — search ${homeRegion} below to add one.`
													: ". Set a region on this home to search for workers."}
											</td>
										</tr>
									)}

									{/* ── Added worker separator + rows ───────── */}
									{addedCasualWorkers.length > 0 && (
										<tr className={styles.casualSeparatorRow}>
											<td colSpan={dates.length + 2} className={styles.casualSeparatorCell}>
												Additional Workers
											</td>
										</tr>
									)}
									{addedCasualWorkers.map((caregiver) => {
										const caregiverId          = (caregiver._id || caregiver.id)?.toString();
										const caregiverAssignments = assignments[caregiverId] || {};
										const caregiverLocked      = lockedCells[caregiverId] || {};
										const newCount = countCells(
											{ row: caregiverAssignments }, dateSet,
											(c) => !!c.type && !c.existing
										);
										const cgName = fullName(caregiver, "Unknown");
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
															alt={cgName}
															width={28}
															height={28}
															className={styles.cgAvatar}
														/>
														<span className={styles.tdNameText}>{cgName}</span>
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
													const isToday = dateStr === todayStr;
													const isPast  = dateStr < todayStr;
													return (
														<td
															key={dateStr}
															className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}${isPast ? ` ${styles.tdCellPast}` : ""}`}
														>
															<DayCell
																cells={caregiverAssignments[dateStr] || EMPTY_CELLS}
																lockedCells={caregiverLocked[dateStr] || EMPTY_CELLS}
																isPast={isPast}
																dayStart={dayStart}
																dayEnd={dayEnd}
																nightStart={nightStart}
																nightEnd={nightEnd}
																dayTimesChanged={dayTimesChanged}
																nightTimesChanged={nightTimesChanged}
																onCycle={(index) => cycleCell(caregiverId, dateStr, index)}
																onSetCustomTime={(index, field, value) => setCustomTime(caregiverId, dateStr, index, field, value)}
																onAdd={() => addCell(caregiverId, dateStr)}
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

									{/*
									 * ── Unassigned / open shifts ─────────────
									 * Shifts at this home with no caregiver. They occupy real
									 * slots, but the bulk endpoint keys every assignment by
									 * caregiverId, so there's nothing to edit here — the row
									 * exists so an open shift isn't invisible while the admin
									 * builds around it. Assign one from the shift detail page.
									 */}
									{unassignedCells && (
										<>
											<tr className={styles.casualSeparatorRow}>
												<td colSpan={dates.length + 2} className={styles.casualSeparatorCell}>
													Unassigned Shifts
												</td>
											</tr>
											<tr className={`${styles.tr} ${styles.casualRow}`}>
												<td className={styles.tdName}>
													<div className={styles.tdNameInner}>
														<span className={styles.unassignedAvatar}>?</span>
														<span className={styles.tdNameText}>Open / unassigned</span>
													</div>
												</td>
												{dates.map((dateStr) => {
													const isToday = dateStr === todayStr;
													const isPast  = dateStr < todayStr;
													return (
														<td
															key={dateStr}
															className={`${styles.tdCell}${isToday ? ` ${styles.tdCellToday}` : ""}${isPast ? ` ${styles.tdCellPast}` : ""}`}
														>
															<DayCell
																cells={EMPTY_CELLS}
																lockedCells={unassignedCells[dateStr] || EMPTY_CELLS}
																isPast
																onCycle={noop}
																onSetCustomTime={noop}
																onAdd={noop}
															/>
														</td>
													);
												})}
												<td className={styles.tdTotal} />
											</tr>
										</>
									)}

									{/* ── Worker search row ───────────────────── */}
									{selectedHomeId && (
										<tr className={styles.casualSearchRow}>
											<td colSpan={dates.length + 2} className={styles.casualSearchCell}>
												<div className={styles.casualSearchInner}>
													<Search size={14} className={styles.casualSearchIcon} />
													<input
														ref={casualSearchRef}
														className={styles.casualSearchInput}
														placeholder={homeRegion ? `Search employees in ${homeRegion}…` : "Search employees…"}
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

					{/* ── Worker search dropdown (fixed-position) ─────────── */}
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
											<span className={styles.casualDropdownNameRow}>
												<span className={styles.casualDropdownName}>{name}</span>
												{/* Admins holding access_app can be assigned shifts too, so the
												    row says which kind of account this is. */}
												<span className={`${styles.roleTag} ${cg.role === "admin" ? styles.roleTagAdmin : styles.roleTagCaregiver}`}>
													{cg.role === "admin" ? "Admin" : "Caregiver"}
												</span>
											</span>
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
							Muted = existing &nbsp;·&nbsp; Bright = new &nbsp;·&nbsp; New shifts: D → N → C → clear &nbsp;·&nbsp; Existing shifts: D → N → C → D &nbsp;·&nbsp; <strong>+</strong> adds a second shift on the same day &nbsp;·&nbsp; Greyed chips are read-only (missed, booked elsewhere, or unassigned) &nbsp;·&nbsp; Drag <GripVertical size={11} style={{ display: "inline", verticalAlign: "middle" }} /> to reorder
						</span>
					</div>

				</main>
			</div>
		</div>
	);
}
