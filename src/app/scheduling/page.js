"use client";

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCHEDULING PAGE  —  /scheduling
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the main scheduling calendar. It wraps react-big-calendar and adds
 * two extra views ("Payroll" and "Agenda") on top of the built-in month/week/day.
 *
 * HOW VIEWS WORK
 * ──────────────
 * Month   → Groups all shifts on the same day into ONE summary pill.
 *            Clicking that pill opens /scheduling/shift_day?date=yyyy-MM-dd,
 *            which lists every shift for that day.
 *
 * Week    → Groups shifts that share the EXACT same start+end time into one
 *            block (so two 9–5 shifts don't overlap each other).
 *            Clicking opens /scheduling/shift_list?startDate=…&endDate=…
 *
 * Day     → Identical to Week view but zoomed to a single day.
 *
 * Agenda  → One row per individual shift (no grouping).
 *            Clicking opens /scheduling/[shiftId] (the shift detail page).
 *
 * Payroll → A paginated table covering a 14-day pay period.
 *            Shows hours worked/scheduled and a summary stat row.
 *
 * HOME FILTER
 * ───────────
 * A dropdown above the calendar lets admins scope all views to one home.
 * Selecting "All Homes" removes the filter. The filter is applied server-side
 * by passing `homeId` as a query param to GET /api/shifts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css"; // our brand overrides on top of react-big-calendar defaults

import {
	format,
	parse,
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	startOfDay,
	endOfDay,
	addDays,
	subDays,
	addMonths,
	subMonths,
	getDay,
} from "date-fns";
import enCA from "date-fns/locale/en-CA"; // weeks start on Sunday in Canada
import { DateTime } from "luxon";

import { Building2, CalendarPlus, Clock, MapPin, Search, User, Users } from "lucide-react";
import Link from "next/link";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import EmptyState from "@components/UI/EmptyState";

import { useShifts } from "@/hooks//useShifts";
import { useHomes } from "@/hooks/useHomes";
import { utcToZonedDateObject } from "@/utils/timeHandling";

import styles from "./scheduling.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// All shift times from the server are stored in UTC and must be displayed in
// Halifax (Atlantic) time, regardless of where the admin's browser is located.
const HALIFAX_TZ = "America/Halifax";

// Payroll periods are 14 days long, anchored to Jan 1 2026.
// Period 0 = Jan 1–14, Period 1 = Jan 15–28, Period -1 = Dec 18–31 2025, etc.
const PAYROLL_ANCHOR = new Date(2026, 0, 1);
const PERIOD_DAYS = 14;

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR LOCALIZER
// ─────────────────────────────────────────────────────────────────────────────
// react-big-calendar needs a "localizer" that teaches it how to parse and
// format dates. We use the date-fns adapter with the Canadian English locale.
const locales = { "en-CA": enCA };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
// 8 pastel color sets used to tint calendar event cards.
// Each set has three tokens: bg (fill), border (accent stripe), text (readable label).
// They are assigned round-robin to caregivers (week/day view) or calendar days (agenda view).
const PALETTE = [
	{ bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" }, // blue
	{ bg: "#d1fae5", border: "#10b981", text: "#064e3b" }, // green
	{ bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" }, // purple
	{ bg: "#fef3c7", border: "#d97706", text: "#78350f" }, // amber
	{ bg: "#fce7f3", border: "#db2777", text: "#831843" }, // pink
	{ bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" }, // sky
	{ bg: "#dcfce7", border: "#16a34a", text: "#14532d" }, // lime
	{ bg: "#ffedd5", border: "#ea580c", text: "#7c2d12" }, // orange
];

// ─────────────────────────────────────────────────────────────────────────────
// makeColorAssigner(state)
// ─────────────────────────────────────────────────────────────────────────────
// Returns a function that maps any string key → a PALETTE color.
// The first time a key is seen, it claims the next available color.
// The same key always returns the same color within a page session.
//
// `state` is a plain object { map: {}, idx: 0 } held in a React ref so it
// resets when the page unmounts (avoids unbounded memory growth across navigations).
function makeColorAssigner(state) {
	return (key) => {
		if (!key) return PALETTE[0]; // unassigned shifts get the default blue
		if (!state.map[key]) {
			state.map[key] = PALETTE[state.idx % PALETTE.length];
			state.idx++;
		}
		return state.map[key];
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SchedulingPage() {
	const router = useRouter();

	// ── Layout state ──────────────────────────────────────────────────────────
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Show the current Halifax wall-clock time in a banner when the admin's
	// browser timezone differs from Halifax (so they don't misread shift times).
	const [deviceTimeZone, setDeviceTimeZone] = useState(null);
	const [halifaxNowLabel, setHalifaxNowLabel] = useState("");

	// ── Color assigners ───────────────────────────────────────────────────────
	// Stored in refs (not state/module scope) so the color map resets each time
	// the page mounts — prevents colors from "drifting" across navigation events.
	const caregiverColorState = useRef({ map: {}, idx: 0 });
	const dayColorState       = useRef({ map: {}, idx: 0 });
	const getCaregiverColor = useMemo(() => makeColorAssigner(caregiverColorState.current), []);
	const getDayColor       = useMemo(() => makeColorAssigner(dayColorState.current), []);

	// ── Home filter ───────────────────────────────────────────────────────────
	// When a home is selected, both the calendar and payroll views send homeId
	// as a query param to the API, which filters the results server-side.
	// Empty string = "All Homes" (no filter).
	const [selectedHomeId, setSelectedHomeId] = useState("");
	const { homes } = useHomes({ limit: 100 }); // load all homes once for the dropdown

	// ── Shift search bar ──────────────────────────────────────────────────────
	// Lets admins jump straight to a shift by typing its ID.
	// shiftInput = what's typed; shiftSearch = debounced value sent to the API.
	const [shiftInput, setShiftInput]         = useState("");
	const [shiftSearch, setShiftSearch]       = useState("");
	const [showShiftDropdown, setShowShiftDropdown] = useState(false);
	const searchRef = useRef(null);

	// Debounce: wait 400 ms after the user stops typing before firing the request.
	useEffect(() => {
		const timer = setTimeout(() => setShiftSearch(shiftInput), 400);
		return () => clearTimeout(timer);
	}, [shiftInput]);

	const {
		shifts: searchResults,
		isShiftLoading: isSearchLoading,
		fetchShiftError: searchError,
	} = useShifts({ params: { shiftId: shiftSearch.trim(), limit: 8 } });

	// Close the search dropdown when the user clicks anywhere outside it.
	useEffect(() => {
		const handler = (e) => {
			if (searchRef.current && !searchRef.current.contains(e.target)) {
				setShowShiftDropdown(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// Navigate to the selected shift and clear the search bar.
	const handleSearchSelect = useCallback((shift) => {
		const id = shift._id || shift.id;
		setShiftInput("");
		setShiftSearch("");
		setShowShiftDropdown(false);
		router.push(`/scheduling/${id}`);
	}, [router]);

	// ── Calendar view & date ──────────────────────────────────────────────────
	// `view`  — which tab is active: "month" | "week" | "day" | "agenda" | "payroll"
	// `date`  — the anchor date the calendar is centered on (changes when navigating prev/next)
	const [view, setView] = useState("week");

	// Default to agenda on small screens — week/month grids are unusable on mobile.
	useEffect(() => {
		if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
			setView("agenda");
		}
	}, []);

	// Start the Halifax clock banner and detect the device timezone.
	useEffect(() => {
		setDeviceTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

		const update = () => {
			setHalifaxNowLabel(
				DateTime.now().setZone(HALIFAX_TZ).toFormat("ccc, MMM d, yyyy • h:mm a")
			);
		};

		// Update immediately, then re-fire at the top of each minute.
		update();
		const msToNextMinute = 60_000 - (Date.now() % 60_000);
		let intervalId;
		const timeoutId = setTimeout(() => {
			update();
			intervalId = setInterval(update, 60_000);
		}, msToNextMinute);

		return () => {
			clearTimeout(timeoutId);
			if (intervalId) clearInterval(intervalId);
		};
	}, []);

	// Initialize `date` to the current Halifax time (not the browser's local time).
	const [date, setDate] = useState(() => {
		const dt = DateTime.now().setZone(HALIFAX_TZ);
		return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
	});

	// ── Visible window (calendar data range) ──────────────────────────────────
	// The calendar only fetches shifts for the time range currently on screen.
	// We add a 1-day buffer on each side to absorb timezone drift between the
	// browser clock (what react-big-calendar gives us) and Halifax time (what the
	// backend uses). Without the buffer, the last/first day of a view can be blank.
	const visibleWindow = useMemo(() => {
		let start, end;
		switch (view) {
			case "month":
				// Expand to include the partial weeks at the start/end of the month.
				start = startOfWeek(startOfMonth(date));
				end   = endOfWeek(endOfMonth(date));
				break;
			case "day":
				start = startOfDay(date);
				end   = endOfDay(date);
				break;
			case "agenda":
				// Agenda shows the next 30 days from the anchor date.
				start = startOfDay(date);
				end   = addDays(start, 30);
				break;
			case "week":
			default:
				start = startOfWeek(date);
				end   = endOfWeek(date);
				break;
		}
		return {
			startDate: format(subDays(start, 1), "yyyy-MM-dd"),
			endDate:   format(addDays(end, 1),   "yyyy-MM-dd"),
		};
	}, [view, date]);

	// Build the homeId filter object. When no home is selected this is empty,
	// so the spread below has no effect and all homes are returned.
	const homeFilter = selectedHomeId ? { homeId: selectedHomeId } : {};

	// Fetch shifts for the current calendar window (month / week / day / agenda).
	const { shifts, isShiftLoading, fetchShiftError, refetch } = useShifts({
		...visibleWindow,
		...homeFilter,
	});

	// ── Payroll view state ────────────────────────────────────────────────────
	// payrollOffset: 0 = current pay period, -1 = one period back, +1 = one ahead.
	const [payrollOffset, setPayrollOffset] = useState(0);
	const [payrollPage, setPayrollPage]     = useState(1);

	// Reset to page 1 whenever the period changes so the user isn't left mid-table.
	useEffect(() => { setPayrollPage(1); }, [payrollOffset]);

	// Calculate the start and end dates of the selected pay period.
	// Formula: currentPeriodIndex = floor((today - anchor) / 14 days)
	//          then shift by payrollOffset periods.
	const payrollPeriod = useMemo(() => {
		const msPerPeriod = PERIOD_DAYS * 24 * 60 * 60 * 1000;
		const nowHfx  = DateTime.now().setZone(HALIFAX_TZ);
		const today   = new Date(nowHfx.year, nowHfx.month - 1, nowHfx.day);
		const diffMs  = Math.max(0, today.getTime() - PAYROLL_ANCHOR.getTime());
		const currentIdx = Math.floor(diffMs / msPerPeriod);
		const start = addDays(PAYROLL_ANCHOR, (currentIdx + payrollOffset) * PERIOD_DAYS);
		const end   = addDays(start, PERIOD_DAYS - 1);
		return { start, end };
	}, [payrollOffset]);

	const payrollWindow = useMemo(() => ({
		startDate: format(payrollPeriod.start, "yyyy-MM-dd"),
		endDate:   format(payrollPeriod.end,   "yyyy-MM-dd"),
	}), [payrollPeriod]);

	// Fetch shifts for the payroll period (separate query so it doesn't conflict
	// with the calendar query when the user is on a different view).
	const {
		shifts: payrollShifts,
		isShiftLoading: isPayrollLoading,
		fetchShiftError: payrollError,
		refetch: refetchPayroll,
	} = useShifts({ ...payrollWindow, ...homeFilter });

	// Override react-big-calendar's "now" indicator so the red line always shows
	// Halifax wall-clock time, not the browser's local time.
	const getNow = () => {
		const dt = DateTime.now().setZone(HALIFAX_TZ);
		return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
	};


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT TRANSFORMATION — MONTH VIEW
	// ═══════════════════════════════════════════════════════════════════════════
	// The month grid can only fit one or two event pills per day cell.
	// Instead of showing one pill per shift (messy), we group all shifts on the
	// same day into a SINGLE summary pill: "John Doe  09:00–17:00  +3 more".
	//
	// Important timezone note:
	//   new Date("2025-04-24") → parses as UTC midnight → 9 PM on Apr 23 in Halifax!
	//   We use utcToZonedDateObject() + startOfDay() to get LOCAL midnight, which
	//   is what react-big-calendar needs to place the event on the correct date cell.
	const monthEvents = useMemo(() => {
		if (!shifts?.length) return [];

		// Step 1 — group shifts by their Halifax calendar date ("yyyy-MM-dd").
		const dayGroups = {};
		shifts.forEach((shift) => {
			const shiftStart = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
			const dateStr    = format(shiftStart, "yyyy-MM-dd");

			if (!dayGroups[dateStr]) {
				dayGroups[dateStr] = {
					shifts:   [],
					dayStart: startOfDay(shiftStart), // local midnight — safe for the calendar
				};
			}
			dayGroups[dateStr].shifts.push(shift);
		});

		// Step 2 — turn each group into one react-big-calendar event object.
		return Object.entries(dayGroups).map(([dateStr, group]) => {
			const first = group.shifts[0]; // shown in the pill; others appear in "+N more"
			return {
				id:              `month_${dateStr}`,
				title:           `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				start:           group.dayStart,
				end:             endOfDay(group.dayStart), // span the full day cell
				allDay:          true,
				_shifts:         group.shifts,   // all raw shifts (used by MonthEventComponent)
				_count:          group.shifts.length,
				_dateStr:        dateStr,        // passed as a URL param when the pill is clicked
				_isMonthSummary: true,           // tells CustomEvent which sub-renderer to use
			};
		});
	}, [shifts]);


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT TRANSFORMATION — WEEK / DAY VIEW
	// ═══════════════════════════════════════════════════════════════════════════
	// Two shifts at exactly the same time (e.g. both 09:00–17:00) would stack
	// on top of each other in the time grid, making them impossible to click.
	// We merge them: same start + same end → one event block with a "+N" badge.
	// Grouping key format: "yyyy-MM-dd HH:mm_HH:mm"  (e.g. "2025-04-24 09:00_17:00")
	//
	// Overnight shifts cross midnight and confuse react-big-calendar (it would
	// place them in the "all-day" row). We split them into two segments:
	//   Part 1 — original start → 23:59:59 of the start day
	//   Part 2 — 00:00:00 of the end day → original end
	// Both parts carry _originalStart/_originalEnd so the tooltip shows the real hours.
	const weekDayEvents = useMemo(() => {
		if (!shifts?.length) return [];

		const groups = {};

		shifts.forEach((shift) => {
			const start = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
			const end   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);

			const isOvernight = format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd");

			if (isOvernight) {
				const baseKey  = `${format(start, "yyyy-MM-dd HH:mm")}_${format(end, "yyyy-MM-dd HH:mm")}`;
				const day1End  = endOfDay(start);
				const day2Start = startOfDay(end);

				const key1 = `${baseKey}_p1`;
				if (!groups[key1]) {
					groups[key1] = {
						id: `${shift.id || shift._id}_p1`,
						start, end: day1End, shifts: [shift],
						_isOvernightStart: true,
						_originalStart: start, _originalEnd: end,
					};
				} else {
					groups[key1].shifts.push(shift);
				}

				const key2 = `${baseKey}_p2`;
				if (!groups[key2]) {
					groups[key2] = {
						id: `${shift.id || shift._id}_p2`,
						start: day2Start, end, shifts: [shift],
						_isOvernightEnd: true,
						_originalStart: start, _originalEnd: end,
					};
				} else {
					groups[key2].shifts.push(shift);
				}

			} else {
				const key = `${format(start, "yyyy-MM-dd HH:mm")}_${format(end, "HH:mm")}`;
				if (!groups[key]) {
					groups[key] = { id: shift.id || shift._id, start, end, shifts: [shift] };
				} else {
					groups[key].shifts.push(shift);
				}
			}
		});

		return Object.values(groups).map((g) => {
			const first = g.shifts[0];
			return {
				...g,
				title:        `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				count:        g.shifts.length,
				_caregiverId: first?.caregiver?.id || first?.caregiver?._id,
			};
		});
	}, [shifts]);


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT TRANSFORMATION — AGENDA VIEW
	// ═══════════════════════════════════════════════════════════════════════════
	// Agenda is a scrollable list — one row per shift, no merging needed.
	// Clicking a row navigates to that shift's detail page.
	const agendaEvents = useMemo(() => {
		if (!shifts?.length) return [];

		return shifts.map((shift) => {
			const start   = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
			const dateStr = format(start, "yyyy-MM-dd"); // used to assign a per-day color
			return {
				id:       shift.id || shift._id,
				title:    `${shift.caregiver?.firstName ?? ""} ${shift.caregiver?.lastName ?? ""}`.trim(),
				start,
				end:      utcToZonedDateObject(shift.endTime, HALIFAX_TZ),
				_shift:   shift,    // full shift object — used to show the address in the row
				_dateStr: dateStr,  // all shifts on the same day share the same color
				_isAgenda: true,    // tells CustomEvent to render the Agenda sub-component
			};
		});
	}, [shifts]);


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT SELECTION — pick the right list for the active view
	// ═══════════════════════════════════════════════════════════════════════════
	// react-big-calendar receives a single `events` array. We pre-process the
	// raw shifts into three different formats and pick the right one here.
	const eventsToShow =
		view === "month"  ? monthEvents  :
		view === "agenda" ? agendaEvents :
		weekDayEvents; // week and day views share the same format


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT CLICK HANDLER
	// ═══════════════════════════════════════════════════════════════════════════
	// react-big-calendar calls this when an event is clicked.
	// We route to different pages depending on which type of event was clicked,
	// identified by the boolean flags we set during transformation above.
	const handleSelectEvent = (event) => {
		// Agenda click → go straight to the single shift detail page
		if (event._isAgenda) {
			const shiftId = event._shift?._id || event._shift?.id;
			if (shiftId) router.push(`/scheduling/${shiftId}`);
			return;
		}

		// Month click → show all shifts for that calendar day
		if (event._isMonthSummary) {
			router.push(`/scheduling/shift_day?date=${encodeURIComponent(event._dateStr)}`);
			return;
		}

		// Week/Day click → show all shifts that share this exact start+end time
		const startStr = event.shifts[0].startTime;
		const endStr   = event.shifts[0].endTime;
		router.push(`/scheduling/shift_list?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`);
	};


	// ═══════════════════════════════════════════════════════════════════════════
	// CUSTOM EVENT CARD COMPONENTS
	// ═══════════════════════════════════════════════════════════════════════════
	// react-big-calendar lets us supply a custom React component for event pills
	// via the `components.event` prop. CustomEvent dispatches to the right
	// sub-component based on which type of event it receives.

	// Month pill — shows the first caregiver's name, the time range, and "+N more".
	const MonthEventComponent = ({ event }) => {
		const first     = event._shifts?.[0];
		const extra     = event._count - 1;
		const startTime = first?.startTime ? format(utcToZonedDateObject(first.startTime, HALIFAX_TZ), "HH:mm") : "";
		const endTime   = first?.endTime   ? format(utcToZonedDateObject(first.endTime,   HALIFAX_TZ), "HH:mm") : "";
		return (
			<div className={styles.monthEvent}>
				<div className={styles.monthEventRow}>
					<User size={10} className={styles.monthEventIcon} />
					<span className={styles.monthEventName}>{event.title}</span>
					<span className={styles.monthEventTime}>{startTime}–{endTime}</span>
				</div>
				{extra > 0 && (
					<div className={styles.monthEventMore}>+{extra} more shift{extra > 1 ? "s" : ""}</div>
				)}
			</div>
		);
	};

	// Week/Day block — shows caregiver name, time range, and address.
	// Color is assigned per-caregiver so the same person always has the same tint.
	// `--ev-text` is a CSS custom property so the module can use it for text color
	// without needing the hex value baked in at build time.
	// Short shifts (<60 min) get a compact layout to avoid text overflow.
	const WeekDayEventComponent = ({ event }) => {
		const color      = getCaregiverColor(event._caregiverId);
		const multi      = event.count > 1;
		const isOvernight = event._isOvernightStart || event._isOvernightEnd;

		// Overnight segments: show the original full time range in the tooltip,
		// not the midnight-split range used for positioning.
		const displayStart = isOvernight ? event._originalStart : event.start;
		const displayEnd   = isOvernight ? event._originalEnd   : event.end;
		const tooltip = `${event.title ? event.title + "\n" : ""}${format(displayStart, "HH:mm")} – ${format(displayEnd, "HH:mm")}`;

		const durationMins = (event.end - event.start) / 60_000;
		const isShort = durationMins < 60;

		return (
			<div className={styles.weekEvent} style={{ "--ev-text": color.text }} title={tooltip}>
				<div className={`${styles.weekEventBody} ${isShort ? styles.weekEventBodyCompact : ""}`}>
					<div className={styles.weekEventName}>
						{multi ? <Users size={11} /> : <User size={11} />}
						<span>{event.title}</span>
						{multi && <span className={styles.weekEventBadge}>+{event.count - 1}</span>}
					</div>
					{!isShort && (
						<div className={styles.weekEventTime}>
							<Clock size={9} />
							<span>{format(displayStart, "HH:mm")} – {format(displayEnd, "HH:mm")}</span>
						</div>
					)}
					{!isShort && !multi && event.shifts?.[0]?.clientAddress && (
						<div className={styles.weekEventAddr}>
							<MapPin size={9} />
							<span>{event.shifts[0].clientAddress}</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	// Agenda row — caregiver name + address, colored per calendar day.
	const AgendaEventComponent = ({ event }) => {
		const color = getDayColor(event._dateStr);
		return (
			<span className={styles.agendaTitle} style={{ color: color.text }}>
				{event.title}
				{event._shift?.clientAddress && (
					<span className={styles.agendaAddr}> · {event._shift.clientAddress}</span>
				)}
			</span>
		);
	};

	// Router: picks the right sub-component based on the event type flag.
	const CustomEvent = (props) => {
		if (props.event._isAgenda)       return <AgendaEventComponent {...props} />;
		if (props.event._isMonthSummary) return <MonthEventComponent {...props} />;
		return <WeekDayEventComponent {...props} />;
	};


	// ═══════════════════════════════════════════════════════════════════════════
	// EVENT STYLE GETTER
	// ═══════════════════════════════════════════════════════════════════════════
	// react-big-calendar calls eventPropGetter(event) for every event to get the
	// inline styles applied to the outer wrapper div (background, border, radius).
	// The inner content (text, icons) is handled by CustomEvent above.
	const eventStyleGetter = (event) => {
		// Month: the MonthEventComponent draws its own gradient pill, so we make
		// the wrapper invisible to avoid a double border.
		if (event._isMonthSummary) {
			return { style: { background: "transparent", border: "none", padding: 0 } };
		}

		// Agenda: pastel card tinted by calendar day.
		if (event._isAgenda) {
			const color = getDayColor(event._dateStr);
			return {
				style: {
					backgroundColor: color.bg,
					border:          `1.5px solid ${color.border}`,
					borderLeft:      `4px solid ${color.border}`, // thick left accent stripe
					borderRadius:    "8px",
					color:           color.text,
					padding:         "6px 12px",
					fontWeight:      600,
					fontSize:        "0.83rem",
				},
			};
		}

		// Week/Day: pastel card tinted by caregiver.
		// Overnight segments get flat edges at the midnight seam so the two
		// halves look like one continuous block across adjacent day columns.
		const color = getCaregiverColor(event._caregiverId);
		let borderRadius = "10px";
		if (event._isOvernightStart) borderRadius = "10px 10px 0 0"; // flat bottom edge
		if (event._isOvernightEnd)   borderRadius = "0 0 10px 10px"; // flat top edge

		return {
			style: {
				backgroundColor: color.bg,
				border:          `1.5px solid ${color.border}`,
				borderLeft:      `4px solid ${color.border}`,
				borderRadius,
				color:           color.text,
				padding:         0,
			},
		};
	};


	// ═══════════════════════════════════════════════════════════════════════════
	// STANDALONE TOOLBAR
	// ═══════════════════════════════════════════════════════════════════════════
	// We suppress react-big-calendar's built-in toolbar (components={{ toolbar: () => null }})
	// and render our own so we can add the "Payroll" tab alongside the standard ones.
	// Toolbar navigation mutates `date` (calendar views) or `payrollOffset` (payroll).

	// Label shown in the centre of the toolbar (e.g. "Apr 24 – Apr 30, 2025").
	const calendarToolbarLabel = useMemo(() => {
		if (view === "payroll") {
			return `${format(payrollPeriod.start, "MMM d")} – ${format(payrollPeriod.end, "MMM d, yyyy")}`;
		}
		switch (view) {
			case "month":  return format(date, "MMMM yyyy");
			case "week": {
				const s = startOfWeek(date);
				const e = endOfWeek(date);
				// "Apr 24 – 30, 2025" (same month) vs "Mar 28 – Apr 3, 2025" (month boundary)
				return format(s, "MMM") !== format(e, "MMM")
					? `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`
					: `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
			}
			case "day":    return format(date, "EEEE, MMMM d, yyyy");
			case "agenda": return `${format(date, "MMM d")} – ${format(addDays(date, 30), "MMM d, yyyy")}`;
			default:       return format(date, "MMMM yyyy");
		}
	}, [view, date, payrollPeriod]);

	const handleToolbarPrev = useCallback(() => {
		if (view === "payroll") { setPayrollOffset((o) => o - 1); return; }
		if (view === "month")  setDate((d) => subMonths(d, 1));
		else if (view === "week") setDate((d) => subDays(d, 7));
		else if (view === "day")  setDate((d) => subDays(d, 1));
		else                      setDate((d) => subDays(d, 30));
	}, [view]);

	const handleToolbarToday = useCallback(() => {
		if (view === "payroll") { setPayrollOffset(0); return; }
		const dt = DateTime.now().setZone(HALIFAX_TZ);
		setDate(new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond));
	}, [view]);

	const handleToolbarNext = useCallback(() => {
		if (view === "payroll") { setPayrollOffset((o) => o + 1); return; }
		if (view === "month")  setDate((d) => addMonths(d, 1));
		else if (view === "week") setDate((d) => addDays(d, 7));
		else if (view === "day")  setDate((d) => addDays(d, 1));
		else                      setDate((d) => addDays(d, 30));
	}, [view]);

	const StandaloneToolbar = () => (
		<div className={styles.calendarToolbar}>
			<div className={styles.toolbarBtnGroup}>
				<button type="button" className={styles.toolbarBtn} onClick={handleToolbarPrev}>&#8249;</button>
				<button type="button" className={styles.toolbarBtn} onClick={handleToolbarToday}>Today</button>
				<button type="button" className={styles.toolbarBtn} onClick={handleToolbarNext}>&#8250;</button>
			</div>
			<span className={styles.toolbarLabel}>{calendarToolbarLabel}</span>
			<div className={styles.toolbarBtnGroup}>
				{["month", "week", "day", "agenda"].map((v) => (
					<button
						key={v}
						type="button"
						className={`${styles.toolbarBtn} ${view === v ? styles.toolbarBtnActive : ""}`}
						onClick={() => setView(v)}
					>
						{v.charAt(0).toUpperCase() + v.slice(1)}
					</button>
				))}
				<button
					type="button"
					className={`${styles.toolbarBtn} ${view === "payroll" ? styles.toolbarBtnActive : ""}`}
					onClick={() => setView("payroll")}
				>
					Payroll
				</button>
			</div>
		</div>
	);


	// ═══════════════════════════════════════════════════════════════════════════
	// PAYROLL VIEW
	// ═══════════════════════════════════════════════════════════════════════════
	// Renders a paginated table of shifts for the selected 14-day pay period.
	// Stats (total shifts, scheduled hours, worked hours, unique caregivers) are
	// derived client-side from the fetched shift array.
	const PayrollView = () => {
		const PAGE_SIZE = 10;

		// Sort shifts chronologically (server returns them in an unspecified order).
		const sorted = useMemo(() => {
			if (!payrollShifts?.length) return [];
			return [...payrollShifts].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
		}, []);

		const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
		const paginated  = sorted.slice((payrollPage - 1) * PAGE_SIZE, payrollPage * PAGE_SIZE);

		// Aggregate summary stats for the stat cards at the top.
		const stats = useMemo(() => {
			const scheduledHrs = sorted.reduce(
				(sum, s) => sum + (new Date(s.endTime) - new Date(s.startTime)) / 3_600_000, 0
			);
			const workedHrs = sorted.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
			const cgIds = new Set(sorted.map((s) => s.caregiver?._id || s.caregiver?.id).filter(Boolean));
			return {
				total:      sorted.length,
				scheduled:  scheduledHrs.toFixed(1),
				worked:     workedHrs.toFixed(1),
				caregivers: cgIds.size,
			};
		}, [sorted]);

		// Badge styles for each possible shift status value.
		const STATUS_CFG = {
			completed:   { label: "Completed",   bg: "#d1fae5", color: "#065f46" },
			scheduled:   { label: "Scheduled",   bg: "#dbeafe", color: "#1e40af" },
			in_progress: { label: "In Progress", bg: "#fef3c7", color: "#92400e" },
			cancelled:   { label: "Cancelled",   bg: "#fee2e2", color: "#991b1b" },
			missed:      { label: "Missed",      bg: "#f3f4f6", color: "#374151" },
		};

		if (isPayrollLoading) return <ErrorState isLoading />;
		if (payrollError)     return <ErrorState errorMessage={payrollError} onRetry={refetchPayroll} />;

		return (
			<div className={styles.payrollView}>
				{/* Summary stat cards */}
				<div className={styles.payrollStats}>
					{[
						{ value: stats.total,            label: "Shifts"    },
						{ value: `${stats.scheduled} h`, label: "Scheduled" },
						{ value: `${stats.worked} h`,    label: "Worked"    },
						{ value: stats.caregivers,       label: "Caregivers"},
					].map(({ value, label }) => (
						<div key={label} className={styles.payrollStatCard}>
							<span className={styles.payrollStatValue}>{value}</span>
							<span className={styles.payrollStatLabel}>{label}</span>
						</div>
					))}
				</div>

				{/* Shifts table */}
				{sorted.length === 0 ? (
					<div className={styles.payrollEmpty}>No shifts scheduled for this pay period.</div>
				) : (
					<>
						<div className={styles.payrollTableWrap}>
							<table className={styles.payrollTable}>
								<thead>
									<tr>
										<th>Date</th>
										<th>Time</th>
										<th>Caregiver</th>
										<th>Location</th>
										<th>Hours</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{paginated.map((shift) => {
										const sid   = shift._id || shift.id;
										const start = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
										const end   = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
										const dur   = ((new Date(shift.endTime) - new Date(shift.startTime)) / 3_600_000).toFixed(1);
										const sc    = STATUS_CFG[shift.status] ?? STATUS_CFG.scheduled;
										const name  = [shift.caregiver?.firstName, shift.caregiver?.lastName]
											.filter(Boolean).join(" ") || "Unassigned";

										return (
											<tr
												key={sid}
												className={styles.payrollRow}
												onClick={() => router.push(`/scheduling/${sid}`)}
											>
												<td>{format(start, "EEE, MMM d")}</td>
												<td className={styles.payrollTimeCell}>{format(start, "HH:mm")} – {format(end, "HH:mm")}</td>
												<td className={styles.payrollNameCell}>
													<User size={13} style={{ marginRight: 5, flexShrink: 0, opacity: 0.6 }} />
													{name}
												</td>
												<td className={styles.payrollAddrCell}>{shift.clientAddress || "—"}</td>
												<td className={styles.payrollHrsCell}>
													{/* Show actual worked hours once a shift is completed; fall back to scheduled duration */}
													{shift.hoursWorked != null ? `${shift.hoursWorked} h` : `${dur} h`}
												</td>
												<td>
													<span
														className={styles.payrollStatus}
														style={{ background: sc.bg, color: sc.color }}
													>
														{sc.label}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{totalPages > 1 && (
							<div className={styles.payrollPagination}>
								<button
									className={styles.payrollPageBtn}
									disabled={payrollPage === 1}
									onClick={() => setPayrollPage((p) => p - 1)}
								>
									&#8249; Prev
								</button>
								<span className={styles.payrollPageInfo}>
									Page {payrollPage} of {totalPages}
									<span className={styles.payrollPageTotal}> &middot; {sorted.length} shifts</span>
								</span>
								<button
									className={styles.payrollPageBtn}
									disabled={payrollPage === totalPages}
									onClick={() => setPayrollPage((p) => p + 1)}
								>
									Next &#8250;
								</button>
							</div>
						)}
					</>
				)}
			</div>
		);
	};


	// ═══════════════════════════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════════════════════════
	return (
		<div className={styles.page}>
			<Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
			<div className={styles.container}>
				<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className={styles.body}>

					{/* Page header — title, view-specific hint, and "Create Shift" button */}
					<div className={styles.titleRow}>
						<div>
							<h1 className={styles.heading}>Scheduling</h1>
							<p className={styles.subtitle}>
								{view === "month"   && "Click any day to view all shifts for that day"}
								{view === "week"    && "Click a block to view shift details"}
								{view === "day"     && "Click a block to view shift details"}
								{view === "agenda"  && "Click any shift to view its detail"}
								{view === "payroll" && "Click any row to view shift details"}
							</p>
						</div>
						<Link href="/scheduling/add_new_shift">
							<Button icon={<CalendarPlus size={16} />}>Create New Shift</Button>
						</Link>
					</div>

					{/* Shift ID search — type a shift ID to jump directly to its detail page */}
					<div className={styles.searchWrapper} ref={searchRef}>
						<div className={styles.searchInputRow}>
							<Search size={15} className={styles.searchIcon} />
							<input
								className={styles.searchInput}
								type="text"
								placeholder="Search shifts by ID…"
								value={shiftInput}
								onChange={(e) => { setShiftInput(e.target.value); setShowShiftDropdown(true); }}
								onFocus={() => setShowShiftDropdown(true)}
							/>
							{shiftInput && (
								<button
									className={styles.searchClear}
									onClick={() => { setShiftInput(""); setShiftSearch(""); setShowShiftDropdown(false); }}
									aria-label="Clear search"
								>
									×
								</button>
							)}
						</div>

						{showShiftDropdown && shiftInput.trim().length > 0 && (
							<div className={styles.searchDropdown}>
								{isSearchLoading ? (
									<div className={styles.searchMeta}>Searching…</div>
								) : searchError ? (
									<div className={styles.searchMeta}>Invalid shift ID</div>
								) : searchResults.length === 0 ? (
									<div className={styles.searchMeta}>No shifts found</div>
								) : (
									searchResults.map((shift) => {
										const id = shift._id || shift.id;
										const caregiverName = [shift.caregiver?.firstName, shift.caregiver?.lastName]
											.filter(Boolean).join(" ") || "Unassigned";
										const start     = utcToZonedDateObject(shift.startTime, HALIFAX_TZ);
										const end       = utcToZonedDateObject(shift.endTime,   HALIFAX_TZ);
										const dateLabel = format(start, "EEE, MMM d, yyyy");
										const timeLabel = `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
										return (
											<button key={id} className={styles.searchItem} onClick={() => handleSearchSelect(shift)}>
												<User size={14} className={styles.searchItemIcon} />
												<div className={styles.searchItemBody}>
													<span className={styles.searchItemName}>{caregiverName}</span>
													<span className={styles.searchItemMeta}>{dateLabel} · {timeLabel}</span>
												</div>
											</button>
										);
									})
								)}
							</div>
						)}
					</div>

					{/* Home filter — narrows all calendar views and payroll to a single home.
					    Selecting "All Homes" (empty value) removes the filter. */}
					<div className={styles.filterRow}>
						<Building2 size={15} className={styles.filterIcon} />
						<label className={styles.filterLabel} htmlFor="home-filter">Filter by Home:</label>
						<select
							id="home-filter"
							className={styles.homeSelect}
							value={selectedHomeId}
							onChange={(e) => setSelectedHomeId(e.target.value)}
						>
							<option value="">All Homes</option>
							{homes.map((home) => {
								const id = home._id || home.id;
								return (
									<option key={id} value={id}>
										{home.name || home.homeName || `Home ${id}`}
									</option>
								);
							})}
						</select>
					</div>

					{/* Halifax time banner — only shown when the admin's device is in a
					    different timezone, to prevent them from misreading shift times */}
					{deviceTimeZone && deviceTimeZone !== HALIFAX_TZ && (
						<div className={styles.tzNotice}>
							<Clock size={13} style={{ flexShrink: 0 }} />
							<span>Current Halifax time: <strong>{halifaxNowLabel}</strong></span>
						</div>
					)}

					{/* Main calendar card */}
					<div className={styles.calendarCard}>
						<StandaloneToolbar />

						<div className={styles.calendarBody}>
							{view === "payroll" ? (
								<PayrollView />
							) : (
								<>
									<ErrorState
										isLoading={isShiftLoading}
										errorMessage={fetchShiftError}
										onRetry={refetch}
									/>
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
												culture="en-CA"
												localizer={localizer}
												events={eventsToShow}
												startAccessor="start"
												endAccessor="end"
												onSelectEvent={handleSelectEvent}
												components={{ toolbar: () => null, event: CustomEvent }}
												eventPropGetter={eventStyleGetter}
												date={date}
												onNavigate={setDate}
												view={view}
												onView={setView}
												getNow={getNow}
												className="my_calendar"
												step={30}
												timeslots={2}
												popup={false}
											/>
										)
									)}
								</>
							)}
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}
