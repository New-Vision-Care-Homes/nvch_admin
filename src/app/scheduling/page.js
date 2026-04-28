"use client";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * SCHEDULING PAGE — /scheduling
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the main scheduling calendar page. It renders a react-big-calendar
 * with 4 views: month, week, day, and agenda. Each view displays shifts
 * differently, and clicking an event navigates to a dedicated detail page.
 *
 * VIEW BEHAVIOUR SUMMARY:
 *   • Month view  → one grouped "summary" event per day (all shifts that day)
 *                   Clicking navigates to /scheduling/shift_day?date=yyyy-MM-dd
 *   • Week view   → one event per unique time slot (shifts at the same exact
 *                   start/end time are merged into a single block)
 *                   Clicking navigates to /scheduling/shift_list?startDate=&endDate=
 *   • Day view    → same as week view, just zoomed into one day
 *   • Agenda view → one event per individual shift
 *                   Clicking navigates to /scheduling/[shiftId] (shift detail)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

// react-big-calendar: the core calendar component + its date-fns adapter
import { Calendar, dateFnsLocalizer } from "react-big-calendar";

// date-fns helpers used by the localizer and our own date formatting
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay } from "date-fns";

// Canadian English locale — ensures weeks start on Sunday (en-CA convention)
import enCA from "date-fns/locale/en-CA";

// Base calendar styles (react-big-calendar requires this CSS to function)
import "react-big-calendar/lib/css/react-big-calendar.css";

// Lucide icons used inside event cards
import { CalendarPlus, Clock, MapPin, User, Users } from "lucide-react";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./scheduling.module.css";

// calendar.css overrides react-big-calendar's default styles to match our brand
import "./calendar.css";

import Button from "@components/UI/Button";
import Link from "next/link";

// Custom hook — fetches all shifts from the API via React Query
import { useShifts } from "@/hooks//useShifts";
import { useProfile } from "@/hooks/useProfile";

// ErrorState: shows a loading spinner OR an error message with a retry button
import ErrorState from "@components/UI/ErrorState";
import EmptyState from "@components/UI/EmptyState";
import { utcToZonedDateObject } from "@/utils/timeHandling";


// ─────────────────────────────────────────────────────────────────────────────
// 1. CALENDAR LOCALIZER SETUP
// ─────────────────────────────────────────────────────────────────────────────
// react-big-calendar needs a "localizer" to understand how to format dates,
// parse strings, and determine what day a week starts on.
// dateFnsLocalizer wires in our date-fns functions and locale.
const locales = { "en-CA": enCA };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });


// ─────────────────────────────────────────────────────────────────────────────
// 2. COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
// 8 pastel color sets that complement the site's primary navy (#1C4A6E).
// Each entry has three values:
//   bg     → pastel background fill for the event card
//   border → accent/border color (also used for the left border stripe)
//   text   → dark readable text color that contrasts against `bg`
const PALETTE = [
	{ bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" },  // blue
	{ bg: "#d1fae5", border: "#10b981", text: "#064e3b" },  // green
	{ bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" },  // purple
	{ bg: "#fef3c7", border: "#d97706", text: "#78350f" },  // amber
	{ bg: "#fce7f3", border: "#db2777", text: "#831843" },  // pink
	{ bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" },  // sky (matches site!)
	{ bg: "#dcfce7", border: "#16a34a", text: "#14532d" },  // lime
	{ bg: "#ffedd5", border: "#ea580c", text: "#7c2d12" },  // orange
];


// ─────────────────────────────────────────────────────────────────────────────
// 3. COLOR ASSIGNMENT HELPERS  (module-level, so they persist across renders)
// ─────────────────────────────────────────────────────────────────────────────

// caregiverColorMap: maps caregiver ID → a PALETTE entry.
// Once a caregiver gets a color, it stays the same for the entire session.
// This means if Jane always appears in blue, she will always be blue in week/day view.
const caregiverColorMap = {};
let caregiverColorIdx = 0; // increments each time a NEW caregiver is first seen

/**
 * getCaregiverColor(id)
 * Returns a PALETTE color for the given caregiver ID.
 * - If no ID is supplied (unassigned shift), defaults to PALETTE[0] (blue).
 * - If this caregiver already has a color assigned, returns the same one.
 * - Otherwise, picks the next available palette color (wraps around after 8).
 *
 * Used in: week/day event cards
 */
function getCaregiverColor(id) {
	if (!id) return PALETTE[0];
	if (!caregiverColorMap[id]) {
		// Assign the next color. The % operator wraps around when we exceed 8 caregivers.
		caregiverColorMap[id] = PALETTE[caregiverColorIdx % PALETTE.length];
		caregiverColorIdx++;
	}
	return caregiverColorMap[id];
}

// dayColorMap: maps a "yyyy-MM-dd" date string → a PALETTE entry.
// Each unique calendar date gets its own color in agenda view.
const dayColorMap = {};
let dayColorIdx = 0;

/**
 * getDayColor(dateStr)
 * Returns a PALETTE color for the given date string (e.g. "2025-04-24").
 * Same logic as getCaregiverColor but keyed by date instead of caregiver ID.
 *
 * Used in: agenda event cards (all shifts on the same day share one color)
 */
function getDayColor(dateStr) {
	if (!dayColorMap[dateStr]) {
		dayColorMap[dateStr] = PALETTE[dayColorIdx % PALETTE.length];
		dayColorIdx++;
	}
	return dayColorMap[dateStr];
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SchedulingPage() {
	const router = useRouter();

	// Fetch all shifts from the API.
	// useShifts() returns:
	//   shifts          → array of shift objects from the server
	//   isShiftLoading  → true while the first fetch is in-flight
	//   fetchShiftError → error message string if the fetch failed, else null
	//   refetch         → function to manually re-trigger the fetch (used by ErrorState retry button)
	const { shifts, isShiftLoading, fetchShiftError, refetch } = useShifts();
	const { profile } = useProfile();

	// view: which calendar view is currently active ("month" | "week" | "day" | "agenda")
	// setView is passed to the Calendar so the built-in toolbar can change it.
	const [view, setView] = useState("week");

	// date: the "anchor" date the calendar is currently centered on.
	// Changing this moves the calendar forward/backward (next week, prev month, etc.)
	const [date, setDate] = useState(new Date());


	// ───────────────────────────────────────────────────────────────────────
	// 5. EVENT TRANSFORMATION — MONTH VIEW
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * Problem to solve:
	 * react-big-calendar month view would normally render one tiny event pill
	 * per shift. If there are 10 shifts on April 24, you'd see 10 pills.
	 * That's cluttered and unusable.
	 *
	 * Solution:
	 * Group all shifts that share the same local calendar date into a SINGLE
	 * "summary" event. The summary shows the first caregiver's name, the first
	 * shift's time range, and a "+N more" badge if there are additional shifts.
	 *
	 * WHY startOfDay() instead of new Date("yyyy-MM-dd")?
	 * JavaScript's new Date("2025-04-24") parses the string as UTC MIDNIGHT.
	 * In Halifax (UTC-3), UTC midnight = 9:00 PM the previous day.
	 * So the event would appear on April 23 instead of April 24!
	 * startOfDay(shiftStart) correctly produces LOCAL midnight (00:00 in the
	 * user's timezone), which is what the calendar expects.
	 *
	 * useMemo: this computation only re-runs when `shifts` changes.
	 * Without useMemo it would recalculate on every re-render (wasteful).
	 */
	const monthEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];

		// Step 1: Group shifts by their local calendar date string ("yyyy-MM-dd")
		const dayGroups = {};
		shifts.forEach((shift) => {
			const shiftStart = utcToZonedDateObject(shift.startTime, profile?.timezone || "America/Halifax");
			const dateStr = format(shiftStart, "yyyy-MM-dd"); // e.g. "2025-04-24"

			// Create a new group for this date if we haven't seen it yet
			if (!dayGroups[dateStr]) {
				dayGroups[dateStr] = {
					shifts: [],
					dayStart: startOfDay(shiftStart), // LOCAL midnight — safe for calendar
				};
			}
			// Add this shift to its date group
			dayGroups[dateStr].shifts.push(shift);
		});

		// Step 2: Convert each date group into a single react-big-calendar event object
		return Object.entries(dayGroups).map(([dateStr, group]) => {
			const first = group.shifts[0]; // the "representative" shift shown in the pill
			return {
				id: `month_${dateStr}`,          // unique ID required by react-big-calendar
				title: `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				start: group.dayStart,            // LOCAL midnight of the day
				end: endOfDay(group.dayStart),    // 23:59:59 of the same day → makes it span the whole day cell
				allDay: true,                     // renders in the "all-day" row, not on the time grid
				_shifts: group.shifts,            // all raw shifts for this day (used in MonthEventComponent)
				_count: group.shifts.length,      // total number of shifts (used to show "+N more")
				_dayStart: group.dayStart,        // kept for convenience (same as `start`)
				_dateStr: dateStr,                // the "yyyy-MM-dd" string (passed in the URL when clicked)
				_isMonthSummary: true,            // flag so CustomEvent knows which renderer to use
			};
		});
	}, [shifts]);


	// ───────────────────────────────────────────────────────────────────────
	// 6. EVENT TRANSFORMATION — WEEK / DAY VIEW
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * Problem to solve:
	 * In week/day view, two shifts at exactly the same time (e.g. 09:00–17:00)
	 * would overlap and become unreadable when drawn on the time grid.
	 *
	 * Solution:
	 * Group shifts that share the EXACT same start time AND end time into one
	 * event block. The block shows the first caregiver's name and a "+N" badge
	 * if multiple shifts share that slot.
	 *
	 * The grouping key is:  "yyyy-MM-dd HH:mm_HH:mm"
	 * Example: "2025-04-24 09:00_17:00"
	 * Two shifts with the same key get merged into one calendar event.
	 */
	const weekDayEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];

		const groups = {};
		shifts.forEach((shift) => {
			const start = utcToZonedDateObject(shift.startTime, profile?.timezone || "America/Halifax");
			const end = utcToZonedDateObject(shift.endTime, profile?.timezone || "America/Halifax");

			// Build the grouping key: full date+start_time combined with end time
			const key = `${format(start, "yyyy-MM-dd HH:mm")}_${format(end, "HH:mm")}`;

			if (!groups[key]) {
				// First shift at this time slot — create a new group
				groups[key] = { id: shift.id || shift._id, start, end, shifts: [shift] };
			} else {
				// Another shift at the same slot — add it to the existing group
				groups[key].shifts.push(shift);
			}
		});

		// Convert each group into a calendar event object
		return Object.values(groups).map((g) => {
			const first = g.shifts[0];
			const cgId = first?.caregiver?.id || first?.caregiver?._id; // caregiver ID for color lookup
			return {
				...g,
				// Title: the first caregiver's name ("+N" badge is handled in the component)
				title: `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				count: g.shifts.length,   // total shifts in this slot (used to show "+N")
				_caregiverId: cgId,        // used by getCaregiverColor() for consistent coloring
			};
		});
	}, [shifts]);


	// ───────────────────────────────────────────────────────────────────────
	// 7. EVENT TRANSFORMATION — AGENDA VIEW
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * Agenda view is simpler: we want ONE event per individual shift,
	 * no merging. The user can scroll through a list of all upcoming shifts.
	 * Clicking one goes straight to that shift's detail page.
	 */
	const agendaEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];

		return shifts.map((shift) => {
			const start = utcToZonedDateObject(shift.startTime, profile?.timezone || "America/Halifax");
			const dateStr = format(start, "yyyy-MM-dd"); // used for per-day coloring
			return {
				id: shift.id || shift._id,
				title: `${shift.caregiver?.firstName ?? ""} ${shift.caregiver?.lastName ?? ""}`.trim(),
				start,
				end: utcToZonedDateObject(shift.endTime, profile?.timezone || "America/Halifax"),
				_shift: shift,       // the full raw shift object (used to display address in the row)
				_dateStr: dateStr,   // used by getDayColor() so all shifts on the same day share a color
				_isAgenda: true,     // flag so CustomEvent renders the Agenda component
			};
		});
	}, [shifts]);


	// ───────────────────────────────────────────────────────────────────────
	// 8. SELECTING WHICH EVENT LIST TO SHOW
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * react-big-calendar receives a single `events` prop.
	 * We pick the correct pre-processed event list based on the active view.
	 * Week and day views use the same grouped event format.
	 */
	const eventsToShow =
		view === "month" ? monthEvents :
			view === "agenda" ? agendaEvents :
				weekDayEvents; // handles both "week" and "day" views


	// ───────────────────────────────────────────────────────────────────────
	// 9. CLICK HANDLER — navigates to the right page based on which event was clicked
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * react-big-calendar calls onSelectEvent(event) when the user clicks an event.
	 * We distinguish between the three event types using the flags we set earlier
	 * (_isAgenda, _isMonthSummary) and route accordingly.
	 */
	const handleSelectEvent = (event) => {

		// AGENDA: go directly to the single shift's detail page
		if (event._isAgenda) {
			const shiftId = event._shift?._id || event._shift?.id;
			if (shiftId) router.push(`/scheduling/${shiftId}`);
			return;
		}

		// MONTH: go to the "all shifts on this day" list page
		// encodeURIComponent ensures special characters in the date string are URL-safe
		if (event._isMonthSummary) {
			router.push(`/scheduling/shift_day?date=${encodeURIComponent(event._dateStr)}`);
			return;
		}

		// WEEK / DAY: go to the "shifts within this exact time slot" list page
		// We pass the exact ISO start and end times so shift_list can filter precisely
		const startStr = event.start.toISOString();
		const endStr = event.end.toISOString();
		router.push(`/scheduling/shift_list?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`);
	};


	// ───────────────────────────────────────────────────────────────────────
	// 10. CUSTOM EVENT CARD COMPONENTS
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * react-big-calendar lets us replace its default event pill with any
	 * React component via the `components.event` prop.
	 * We pass `CustomEvent` which delegates to one of three sub-components
	 * based on the event's type flag.
	 */

	// MONTH EVENT CARD
	// Shows: caregiver name + time range of the first shift, and "+N more" if applicable
	const MonthEventComponent = ({ event }) => {
		const first = event._shifts?.[0];           // first shift in this day's group
		const extra = event._count - 1;             // how many additional shifts are not shown
		const startTime = first?.startTime ? format(utcToZonedDateObject(first.startTime, profile?.timezone || "America/Halifax"), "HH:mm") : "";
		const endTime = first?.endTime ? format(utcToZonedDateObject(first.endTime, profile?.timezone || "America/Halifax"), "HH:mm") : "";
		return (
			<div className={styles.monthEvent}>
				<div className={styles.monthEventRow}>
					<User size={10} className={styles.monthEventIcon} />
					<span className={styles.monthEventName}>{event.title}</span>
					<span className={styles.monthEventTime}>{startTime}–{endTime}</span>
				</div>
				{/* Only render the "+N more" line if there are additional shifts */}
				{extra > 0 && (
					<div className={styles.monthEventMore}>+{extra} more shift{extra > 1 ? "s" : ""}</div>
				)}
			</div>
		);
	};

	// WEEK / DAY EVENT CARD
	// Shows: caregiver name, time range, and location (address) if only one shift in the slot.
	// Color is determined by getCaregiverColor() using the caregiver's ID.
	// "--ev-text" is a CSS custom property passed via inline style so the CSS module
	// can use it for text color without needing to know the hex value at build time.
	const WeekDayEventComponent = ({ event }) => {
		const color = getCaregiverColor(event._caregiverId);
		const multi = event.count > 1; // true if multiple shifts share this time slot
		return (
			<div className={styles.weekEvent} style={{ "--ev-text": color.text }}>
				<div className={styles.weekEventBody}>
					<div className={styles.weekEventName}>
						{/* Show a "group" icon when multiple caregivers share the slot */}
						{multi ? <Users size={11} /> : <User size={11} />}
						<span>{event.title}</span>
						{/* Badge showing how many additional shifts exist (e.g. "+2") */}
						{multi && <span className={styles.weekEventBadge}>+{event.count - 1}</span>}
					</div>
					<div className={styles.weekEventTime}>
						<Clock size={9} />
						<span>{format(event.start, "HH:mm")} – {format(event.end, "HH:mm")}</span>
					</div>
					{/* Only show address when there's exactly one shift (multi slots would show conflicting addresses) */}
					{!multi && event.shifts?.[0]?.clientAddress && (
						<div className={styles.weekEventAddr}>
							<MapPin size={9} />
							<span>{event.shifts[0].clientAddress}</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	// AGENDA EVENT ROW
	// Simpler than the others — just caregiver name + address on one line.
	// Color is per-day (all shifts on April 24 share the same color).
	const AgendaEventComponent = ({ event }) => {
		const color = getDayColor(event._dateStr);
		return (
			<span className={styles.agendaTitle} style={{ color: color.text }}>
				{event.title}
				{/* Show the address after a "·" separator if available */}
				{event._shift?.clientAddress && (
					<span className={styles.agendaAddr}> · {event._shift.clientAddress}</span>
				)}
			</span>
		);
	};

	// ROUTER COMPONENT: delegates to the correct card based on event type flags
	const CustomEvent = (props) => {
		if (props.event._isAgenda) return <AgendaEventComponent {...props} />;
		if (props.event._isMonthSummary) return <MonthEventComponent {...props} />;
		return <WeekDayEventComponent {...props} />;
	};


	// ───────────────────────────────────────────────────────────────────────
	// 11. EVENT STYLE GETTER
	// ───────────────────────────────────────────────────────────────────────
	/*
	 * react-big-calendar calls eventPropGetter(event) for each event to get
	 * the inline style object applied to the outer event wrapper element.
	 * This is how we set the pastel background, border, and border-radius
	 * on each calendar block. The CustomEvent component handles the inner content.
	 *
	 * Month events: the wrapper is made invisible (transparent + no border)
	 * because MonthEventComponent draws its own styled gradient pill.
	 */
	const eventStyleGetter = (event) => {
		if (event._isMonthSummary) {
			// Let MonthEventComponent handle all styling — remove the wrapper's default look
			return { style: { background: "transparent", border: "none", padding: 0 } };
		}
		if (event._isAgenda) {
			// Agenda rows: pastel card, colored per calendar day
			const color = getDayColor(event._dateStr);
			return {
				style: {
					backgroundColor: color.bg,
					border: `1.5px solid ${color.border}`,
					borderLeft: `4px solid ${color.border}`, // thicker left accent stripe
					borderRadius: "8px",
					color: color.text,
					padding: "6px 12px",
					fontWeight: 600,
					fontSize: "0.83rem",
				},
			};
		}
		// Week/Day: pastel card, colored per caregiver
		const color = getCaregiverColor(event._caregiverId);
		return {
			style: {
				backgroundColor: color.bg,
				border: `1.5px solid ${color.border}`,
				borderLeft: `4px solid ${color.border}`, // thicker left accent stripe
				borderRadius: "10px",
				color: color.text,
				padding: 0, // inner padding is handled by WeekDayEventComponent
			},
		};
	};


	// ───────────────────────────────────────────────────────────────────────
	// 12. RENDER
	// ───────────────────────────────────────────────────────────────────────
	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>

					{/* Page heading row: title, hint text, and "Create Shift" button */}
					<div className={styles.titleRow}>
						<div>
							<h1 className={styles.heading}>Scheduling</h1>
							{/* Hint text changes based on the active view to guide the user */}
							<p className={styles.subtitle}>
								{view === "month" && "Click any day to view all shifts for that day"}
								{view === "week" && "Click a block to view shift details"}
								{view === "day" && "Click a block to view shift details"}
								{view === "agenda" && "Click any shift to view its detail"}
							</p>
						</div>
						<Link href="/scheduling/add_new_shift">
							<Button icon={<CalendarPlus size={16} />}>Create New Shift</Button>
						</Link>
					</div>

					{/* Calendar card — white rounded container holding the calendar */}
					<div className={styles.calendarCard}>

						{/*
						 * ErrorState handles two states:
						 *   isLoading=true  → renders a centered spinner
						 *   errorMessage    → renders the error message with a "Retry" button
						 *                    that calls refetch() to try the API again
						 * When neither is true, ErrorState renders nothing (null).
						 */}
						<ErrorState
							isLoading={isShiftLoading}
							errorMessage={fetchShiftError}
							onRetry={refetch}
						/>

						{/*
						 * Only render the calendar once loading is done AND there is no error.
						 * This prevents the calendar from flashing in before data arrives,
						 * and avoids showing an empty calendar alongside an error message.
						 */}
						{!fetchShiftError && !isShiftLoading && (
							shifts && shifts.length === 0 ? (
								<div style={{ margin: "4rem auto", maxWidth: "500px" }}>
									<EmptyState
										title="No shifts scheduled"
										message="There are no shifts available. Click 'Create New Shift' to get started."
									/>
								</div>
							) : (
								<Calendar
									localizer={localizer}        // date-fns adapter (required)
									events={eventsToShow}         // the pre-processed event list for the active view
									startAccessor="start"         // tells react-big-calendar which field is the event start
									endAccessor="end"             // tells react-big-calendar which field is the event end
									onSelectEvent={handleSelectEvent} // our click handler (routes to detail/list pages)
									components={{ event: CustomEvent }} // replaces default pill with our custom card
									eventPropGetter={eventStyleGetter}  // applies pastel colors to each event wrapper
									date={date}                   // the currently visible date (controlled)
									onNavigate={setDate}          // updates `date` when user clicks prev/next/today
									view={view}                   // the currently active view (controlled)
									onView={setView}              // updates `view` when user switches tabs
									className="my_calendar"       // hook for calendar.css global overrides
									step={30}                     // each time slot = 30 minutes
									timeslots={2}                 // 2 slots per step = one visual row per 30 min
									popup={false}                 // disable the built-in "+N more" popup (we handle navigation ourselves)
								/>
							)
						)}
					</div>

				</div>
			</div>
		</div>
	);
}
