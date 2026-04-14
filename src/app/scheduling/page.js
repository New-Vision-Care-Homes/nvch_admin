"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay } from "date-fns";
import enCA from "date-fns/locale/en-CA";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarPlus, Clock, MapPin, User, Users } from "lucide-react";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./scheduling.module.css";
import "./calendar.css";
import Button from "@components/UI/Button";
import Link from "next/link";
import { useShifts } from "@/hooks/useShifts";

const locales = { "en-CA": enCA };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// 8-color palette that complements the site's primary #1C4A6E
const PALETTE = [
	{ bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" },  // blue
	{ bg: "#d1fae5", border: "#10b981", text: "#064e3b" },  // green
	{ bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" },  // purple
	{ bg: "#fef3c7", border: "#d97706", text: "#78350f" },  // amber
	{ bg: "#fce7f3", border: "#db2777", text: "#831843" },  // pink
	{ bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" },  // sky (site color!)
	{ bg: "#dcfce7", border: "#16a34a", text: "#14532d" },  // lime
	{ bg: "#ffedd5", border: "#ea580c", text: "#7c2d12" },  // orange
];

// Per-caregiver color (for week/day)
const caregiverColorMap = {};
let caregiverColorIdx = 0;
function getCaregiverColor(id) {
	if (!id) return PALETTE[0];
	if (!caregiverColorMap[id]) {
		caregiverColorMap[id] = PALETTE[caregiverColorIdx % PALETTE.length];
		caregiverColorIdx++;
	}
	return caregiverColorMap[id];
}

// Per-day color (for agenda)
const dayColorMap = {};
let dayColorIdx = 0;
function getDayColor(dateStr) {
	if (!dayColorMap[dateStr]) {
		dayColorMap[dateStr] = PALETTE[dayColorIdx % PALETTE.length];
		dayColorIdx++;
	}
	return dayColorMap[dateStr];
}

export default function SchedulingPage() {
	const router = useRouter();
	const { shifts } = useShifts();
	const [view, setView] = useState("week");
	const [date, setDate] = useState(new Date());

	// ── MONTH VIEW: one event per day, stores all shifts for that day ──
	// KEY FIX: use startOfDay(shiftStart) so the month event date is in LOCAL time,
	// NOT new Date("yyyy-MM-dd") which parses as UTC midnight (off-by-one in UTC-3 etc.)
	const monthEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
		const dayGroups = {};
		shifts.forEach((shift) => {
			const shiftStart = new Date(shift.startTime);
			const dateStr = format(shiftStart, "yyyy-MM-dd"); // local date
			if (!dayGroups[dateStr]) {
				dayGroups[dateStr] = {
					shifts: [],
					dayStart: startOfDay(shiftStart), // correct local midnight
				};
			}
			dayGroups[dateStr].shifts.push(shift);
		});

		return Object.entries(dayGroups).map(([dateStr, group]) => {
			const first = group.shifts[0];
			return {
				id: `month_${dateStr}`,
				title: `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				start: group.dayStart,
				end: endOfDay(group.dayStart),
				allDay: true,
				_shifts: group.shifts,
				_count: group.shifts.length,
				_dayStart: group.dayStart,
				_dateStr: dateStr,
				_isMonthSummary: true,
			};
		});
	}, [shifts]);

	// ── WEEK / DAY VIEW: group overlapping shifts by exact time slot ──
	const weekDayEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
		const groups = {};
		shifts.forEach((shift) => {
			const start = new Date(shift.startTime);
			const end = new Date(shift.endTime);
			const key = `${format(start, "yyyy-MM-dd HH:mm")}_${format(end, "HH:mm")}`;
			if (!groups[key]) {
				groups[key] = { id: shift.id || shift._id, start, end, shifts: [shift] };
			} else {
				groups[key].shifts.push(shift);
			}
		});
		return Object.values(groups).map((g) => {
			const first = g.shifts[0];
			const cgId = first?.caregiver?.id || first?.caregiver?._id;
			return {
				...g,
				title: `${first?.caregiver?.firstName ?? ""} ${first?.caregiver?.lastName ?? ""}`.trim(),
				count: g.shifts.length,
				_caregiverId: cgId,
			};
		});
	}, [shifts]);

	// ── AGENDA VIEW: one event per shift, clickable to detail ──
	const agendaEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
		return shifts.map((shift) => {
			const start = new Date(shift.startTime);
			const dateStr = format(start, "yyyy-MM-dd");
			return {
				id: shift.id || shift._id,
				title: `${shift.caregiver?.firstName ?? ""} ${shift.caregiver?.lastName ?? ""}`.trim(),
				start,
				end: new Date(shift.endTime),
				_shift: shift,
				_dateStr: dateStr,
				_isAgenda: true,
			};
		});
	}, [shifts]);

	const eventsToShow =
		view === "month" ? monthEvents :
		view === "agenda" ? agendaEvents :
		weekDayEvents;

	// ── Navigation on event click ──
	const handleSelectEvent = (event) => {
		if (event._isAgenda) {
			// Go straight to shift detail
			const shiftId = event._shift?._id || event._shift?.id;
			if (shiftId) router.push(`/scheduling/${shiftId}`);
			return;
		}
		if (event._isMonthSummary) {
			// Pass the local date string — completely avoids timezone ambiguity
			router.push(`/scheduling/shift_list?date=${encodeURIComponent(event._dateStr)}`);
			return;
		}
		// Week/Day: exact slot navigation
		const startStr = event.start.toISOString();
		const endStr = event.end.toISOString();
		router.push(`/scheduling/shift_list?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`);
	};

	// ── Month event card ──
	const MonthEventComponent = ({ event }) => {
		const first = event._shifts?.[0];
		const extra = event._count - 1;
		const startTime = first?.startTime ? format(new Date(first.startTime), "HH:mm") : "";
		const endTime = first?.endTime ? format(new Date(first.endTime), "HH:mm") : "";
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

	// ── Week / Day event card ──
	const WeekDayEventComponent = ({ event }) => {
		const color = getCaregiverColor(event._caregiverId);
		const multi = event.count > 1;
		return (
			<div className={styles.weekEvent} style={{ "--ev-text": color.text }}>
				<div className={styles.weekEventBody}>
					<div className={styles.weekEventName}>
						{multi ? <Users size={11} /> : <User size={11} />}
						<span>{event.title}</span>
						{multi && <span className={styles.weekEventBadge}>+{event.count - 1}</span>}
					</div>
					<div className={styles.weekEventTime}>
						<Clock size={9} />
						<span>{format(event.start, "HH:mm")} – {format(event.end, "HH:mm")}</span>
					</div>
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

	// ── Agenda event (simple, per-shift) ──
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

	const CustomEvent = (props) => {
		if (props.event._isAgenda) return <AgendaEventComponent {...props} />;
		if (props.event._isMonthSummary) return <MonthEventComponent {...props} />;
		return <WeekDayEventComponent {...props} />;
	};

	// ── Dynamic event styles ──
	const eventStyleGetter = (event) => {
		if (event._isMonthSummary) {
			// Month pills have their own CSS styling
			return { style: { background: "transparent", border: "none", padding: 0 } };
		}
		if (event._isAgenda) {
			// Agenda: pastel background card, colored per calendar day
			const color = getDayColor(event._dateStr);
			return {
				style: {
					backgroundColor: color.bg,
					border: `1.5px solid ${color.border}`,
					borderLeft: `4px solid ${color.border}`,
					borderRadius: "8px",
					color: color.text,
					padding: "6px 12px",
					fontWeight: 600,
					fontSize: "0.83rem",
				},
			};
		}
		// Week/Day: pastel per caregiver
		const color = getCaregiverColor(event._caregiverId);
		return {
			style: {
				backgroundColor: color.bg,
				border: `1.5px solid ${color.border}`,
				borderLeft: `4px solid ${color.border}`,
				borderRadius: "10px",
				color: color.text,
				padding: 0,
			},
		};
	};

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					<div className={styles.titleRow}>
						<div>
							<h1 className={styles.heading}>Scheduling</h1>
							<p className={styles.subtitle}>
								{view === "month" && "Click any day to view all shifts"}
								{view === "week" && "Click a block to view shift details"}
								{view === "day" && "Click a block to view shift details"}
								{view === "agenda" && "Click any shift to view its detail"}
							</p>
						</div>
						<Link href="/scheduling/add_new_shift">
							<Button icon={<CalendarPlus size={16} />}>Create New Shift</Button>
						</Link>
					</div>

					<div className={styles.calendarCard}>
						<Calendar
							localizer={localizer}
							events={eventsToShow}
							startAccessor="start"
							endAccessor="end"
							onSelectEvent={handleSelectEvent}
							components={{ event: CustomEvent }}
							eventPropGetter={eventStyleGetter}
							date={date}
							onNavigate={setDate}
							view={view}
							onView={setView}
							className="my_calendar"
							step={30}
							timeslots={2}
							popup={false}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
