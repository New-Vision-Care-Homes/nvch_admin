"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enCA from "date-fns/locale/en-CA";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Plus, Star, AlertTriangle, CalendarPlus } from "lucide-react";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./scheduling.module.css";
import "./calendar.css";
import Button from "@components/UI/Button";
import Link from "next/link";

const locales = {
	"en-CA": enCA,
};

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
});

export default function SchedulingPage() {
  const [events, setEvents] = useState([
    {
      id: 1,
      title: "Morning Shift - Maria Lopez",
      start: new Date(2025, 9, 29, 9, 0),
      end: new Date(2025, 9, 29, 13, 0),
      employee: "Maria Lopez",
      location: "202 Elm St",
    },
    {
      id: 2,
      title: "Evening Shift - David Lee",
      start: new Date(2025, 9, 30, 17, 0),
      end: new Date(2025, 9, 30, 21, 0),
      employee: "David Lee",
      location: "45 Pine St",
    },
    {
      id: 3,
      title: "Afternoon Shift - Eleanor Vance",
      start: new Date(2025, 10, 3, 13, 0),
      end: new Date(2025, 10, 3, 17, 0),
      employee: "Eleanor Vance",
      location: "123 Oak Ave",
    },
    {
      id: 4,
      title: "Night Shift - Robert Green",
      start: new Date(2025, 10, 5, 22, 0),
      end: new Date(2025, 10, 6, 6, 0),
      employee: "Robert Green",
      location: "101 Cedar Dr",
    },
    {
      id: 5,
      title: "Morning Shift - Susan Chen",
      start: new Date(2025, 10, 8, 8, 0),
      end: new Date(2025, 10, 8, 12, 0),
      employee: "Susan Chen",
      location: "789 Birch Ln",
    },
    {
      id: 6,
      title: "Afternoon Shift - James Wilson",
      start: new Date(2025, 10, 15, 13, 0),
      end: new Date(2025, 10, 15, 18, 0),
      employee: "James Wilson",
      location: "456 Maple Rd",
    },
    {
      id: 7,
      title: "Morning Shift - Patricia Brown",
      start: new Date(2025, 10, 22, 9, 0),
      end: new Date(2025, 10, 22, 13, 0),
      employee: "Patricia Brown",
      location: "321 Willow Way",
    },
    {
      id: 8,
      title: "Evening Shift - Michael Scott",
      start: new Date(2025, 11, 1, 17, 0),
      end: new Date(2025, 11, 1, 21, 0),
      employee: "Michael Scott",
      location: "200 Spruce Ave",
    },
    {
      id: 9,
      title: "Morning Shift - Angela White",
      start: new Date(2025, 11, 10, 8, 0),
      end: new Date(2025, 11, 10, 12, 0),
      employee: "Angela White",
      location: "600 Aspen Dr",
    },
    {
      id: 10,
      title: "Double Shift - Kevin Baker",
      start: new Date(2025, 11, 20, 9, 0),
      end: new Date(2025, 11, 20, 19, 0),
      employee: "Kevin Baker",
      location: "78 Poplar Ct",
    },
	{
		id: 11,
		title: "Double Shift - test",
		start: new Date(2025, 11, 20, 9, 0),
		end: new Date(2025, 11, 20, 19, 0),
		employee: "test",
		location: "78 Poplar Ct",
	  },
	]);

	const handleSelectEvent = (event) => {
		alert(
			`📋 ${event.title}\n👩‍⚕️ Employee: ${event.employee}\n📍 Location: ${event.location}\n🕒 ${format(
				event.start,
				"p"
			)} - ${format(event.end, "p")}`
		);
	};

	const [openShifts, setOpenShifts] = useState([
		{ id: "1", name: "Mr. David Lee", date: "Sep 9", time: "3:00 PM - 7:00 PM" },
		{ id: "2", name: "Ms. Grace Kim", date: "Sep 12", time: "2:00 PM - 6:00 PM" },
	]);
	
	const [approvals, setApprovals] = useState([
		{ id: "1", name: "Bob Johnson", request: "Requests to swap Oct 24 morning shift." },
		{ id: "2", name: "Charlie Brown", request: "Requests time off for Oct 27." },
	]);
	
	const [alerts, setAlerts] = useState([
		{ id: "1", message: "Caregiver Alice Smith is scheduled for 10+ hours this week.", type: "critical" },
		{ id: "2", message: "Conflict: Caregiver Bob Johnson is double-booked on Oct 26, 1 PM.", type: "critical" },
		{ id: "3", message: "Unassigned shift for Mr. David Lee on Oct 24 afternoon.", type: "critical" },
	]);

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					<div className={styles.title}>
						<h1>Scheduling Overview</h1>
						<Link href="/scheduling/add_new_shift">
							<Button icon={<CalendarPlus />}>Cteate New Shift</Button>
						</Link>
					</div>
					<Calendar
						localizer={localizer}
						events={events}
						startAccessor="start"
						endAccessor="end"
						className="my_calendar"
						onSelectEvent={handleSelectEvent}
					/>
				</div>
				
				<div className={styles.sidebar}>
					{/* Open Shifts */}
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

					{/* Shift Approvals */}
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

					{/* Alerts */}
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
			</div>
		</div>
	);
}

