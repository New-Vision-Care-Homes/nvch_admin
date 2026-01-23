"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enCA from "date-fns/locale/en-CA";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarPlus } from "lucide-react";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./scheduling.module.css";
import "./calendar.css";
import Button from "@components/UI/Button";
import Link from "next/link";
import { useShifts } from "@/hooks/useShifts";

const locales = { "en-CA": enCA };
const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
});

export default function SchedulingPage() {
	const router = useRouter();
	const { data: shifts = [] } = useShifts();
	const [view, setView] = useState("week");
	const [date, setDate] = useState(new Date());

	// --- DATA AGGREGATION (MONTH) ---
	const aggregatedEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
		const groups = {};
		shifts.forEach((shift) => {
			const dateStr = format(new Date(shift.startTime), "yyyy-MM-dd");
			const caregiverId = shift.caregiver?.id || shift.caregiver?._id;
			const groupKey = `${dateStr}_${caregiverId}`;
			if (!groups[groupKey]) {
				groups[groupKey] = {
					...shift,
					start: new Date(shift.startTime),
					end: new Date(shift.endTime),
					title: `${shift.caregiver?.firstName} ${shift.caregiver?.lastName}`,
					count: 1,
				};
			} else {
				groups[groupKey].count += 1;
				if (new Date(shift.endTime) > groups[groupKey].end)
				groups[groupKey].end = new Date(shift.endTime);
			}
		});
		return Object.values(groups);
	}, [shifts]);

	// --- DATA AGGREGATION (WEEK/DAY) ---
	const weekDayEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
		const groups = {};

		shifts.forEach((shift) => {
			const start = new Date(shift.startTime);
			const end = new Date(shift.endTime);
			const key = `${format(start, "yyyy-MM-dd HH:mm")}_${format(end, "HH:mm")}`;
			if (!groups[key]) {
				groups[key] = {
					id: shift.id || shift._id,
					start,
					end,
					shifts: [shift],
				};
			} else {
				groups[key].shifts.push(shift);
			}
		});

		return Object.values(groups).map((group) => ({
		...group,
		title:
			group.shifts.length === 1
			? `${group.shifts[0].caregiver?.firstName} ${group.shifts[0].caregiver?.lastName}`
			: `${group.shifts[0].caregiver?.firstName} ${group.shifts[0].caregiver?.lastName}`,
		count: group.shifts.length,
		}));
	}, [shifts]);

	const eventsToShow = view === "month" ? aggregatedEvents : weekDayEvents;

	const handleSelectEvent = (event) => {
		if (view === "month") {
			router.push(`/caregivers/${event.caregiver?.id || event.caregiver?._id}`);
		} else {
			router.push(`/scheduling/shift/${event.id}`);
		}
	};

	const CustomEvent = ({ event }) => {
		const isMonth = view === "month";

		return (
		<div className={styles.eventWrapper}>
			<div className={styles.weekEventContent}>
				<strong className={styles.eventTitle}>{event.title}</strong>
				{!isMonth && (
					<>
						<div className={styles.eventTime}>
							{format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
						</div>
						{event.count > 1 && (
							<div className={styles.hoverDetail}>
								{event.shifts.map((s, idx) => (
									<div key={idx} className={styles.shiftItem}>
										<strong>
											{s.caregiver?.firstName} {s.caregiver?.lastName}
										</strong>
										<div className={styles.shiftLocation}>{s.clientAddress}</div>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>
			{event.count > 1 && <div className={styles.countInline}>+ {event.count - 1} more shifts</div>}
		</div>
		);
	};

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					<div className={styles.title}>
						<h1>Scheduling Overview</h1>
						<Link href="/scheduling/add_new_shift">
							<Button icon={<CalendarPlus />}>Create New Shift</Button>
						</Link>
					</div>
					<Calendar
						localizer={localizer}
						events={eventsToShow}
						startAccessor="start"
						endAccessor="end"
						onSelectEvent={handleSelectEvent}
						components={{ event: CustomEvent }}
						date={date}
						onNavigate={setDate}
						view={view}
						onView={setView}
						className="my_calendar"
					/>
				</div>
			</div>
		</div>
	);
}

                
                /* ... (Your existing sidebar content remains the same) }
                <div className={styles.sidebar}>
                    {/* Open Shifts }
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Open Shifts</h2>
                        </div>

                        <div className={styles.sectionContent}>
                            {openShifts.map((shift) => (
                                <div key={shift.id} className={styles.shiftCard}>
                                    <div className={styles.shiftInfo}>
                                        <h3 className={styles.shiftName}>{shift.name}</h3>
                                        <div className={styles.shiftDetails}>
                                            <span className={styles.shiftDate}>{shift.date}</span>
                                            <span className={styles.dot}>•</span>
                                            <span className={styles.shiftTime}>{shift.time}</span>
                                        </div>
                                    </div>
                                    <button className={styles.assignButton}>
                                        <Star size={14} style={{ marginRight: "4px" }} />
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shift Approvals }
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Shift Approvals</h2>
                            <div className={styles.badge}>2 Pending</div>
                        </div>

                        <div className={styles.sectionContent}>
                            {approvals.map((approval) => (
                                <div key={approval.id} className={styles.approvalCard}>
                                    <h3 className={styles.approvalName}>{approval.name}</h3>
                                    <p className={styles.approvalRequest}>{approval.request}</p>
                                    <div className={styles.approvalActions}>
                                        <button className={`${styles.approveButton}`}>Approve</button>
                                        <button className={`${styles.rejectButton}`}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts }
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Alerts</h2>
                            <div className={styles.badge}>3 Critical</div>
                        </div>

                        <div className={styles.sectionContent}>
                            {alerts.map((alert) => (
                                <div key={alert.id} className={styles.alertCard}>
                                    <AlertTriangle className={styles.alertIcon} />
                                    <p className={styles.alertMessage}>{alert.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
				{*/

