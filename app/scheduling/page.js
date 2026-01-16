"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

import { useQueryClient } from "@tanstack/react-query";
import { useShifts } from "@/hooks/useShifts";

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

	const queryClient = useQueryClient();
	const { data: shifts = [], isLoading, isError, error } = useShifts();
	const router = useRouter();
	console.log("shifts: ", shifts);

	/**
	 * Aggregates shifts by date and caregiver to avoid calendar clutter.
	 * If a caregiver has multiple shifts on the same day, they are grouped into one event.
	*/
	const aggregatedEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];

		const groups = {};

		shifts.forEach((shift) => {
			// Generate a unique key based on Date and Caregiver ID
			const dateStr = format(new Date(shift.startTime), "yyyy-MM-dd");
			const caregiverId = shift.caregiver._id || shift.caregiver.id;
			const groupKey = `${dateStr}_${caregiverId}`;

			if (!groups[groupKey]) {
				// Initialize the group with the first shift found
				groups[groupKey] = {
					...shift,
					start: new Date(shift.startTime),
					end: new Date(shift.endTime),
					title: `${shift.caregiver.firstName} ${shift.caregiver.lastName}`,
					count: 1, // Counter for additional shifts
				};
			} else {
				// Increment the counter for existing groups
				groups[groupKey].count += 1;
				
				// Optional: Update the end time to the latest shift of the day
				if (new Date(shift.endTime) > groups[groupKey].end) {
					groups[groupKey].end = new Date(shift.endTime);
				}
			}
		});

		return Object.values(groups);
	}, [shifts]);

	/**
	 * Custom event component to display the caregiver's name 
	 * and a badge indicating extra shifts (e.g., +2).
	 */
	const CustomEvent = ({ event }) => (
		<div style={{ 
			display: 'flex', 
			justifyContent: 'space-between', 
			alignItems: 'center', 
			width: '100%',
			color: 'white', // Ensure text is visible
			fontSize: '11px'
		}}>
			<span style={{ 
				overflow: 'hidden', 
				textOverflow: 'ellipsis', 
				whiteSpace: 'nowrap' 
			}}>
				{event.title}
			</span>
			
			{event.count > 1 && (
				<span style={{
					backgroundColor: '#ff4d4f', // Bright Red
					color: 'white',
					borderRadius: '8px',
					padding: '0 5px',
					fontSize: '10px',
					fontWeight: 'bold',
					marginLeft: '4px',
					boxShadow: '0 0 2px rgba(0,0,0,0.5)',
					flexShrink: 0
				}}>
					+{event.count - 1}
				</span>
			)}
		</div>
	);

	/**
	 * Handles the click event on a calendar shift.
	 * Redirects the admin to the specific caregiver's timesheet/detail page.
	 */
	const handleSelectEvent = (event) => {
		const caregiverId = event.caregiver._id || event.caregiver.id;
		if (caregiverId) {
			router.push(`/caregivers/${caregiverId}`);
		}
	};

	const getEvents = useMemo(() => {
		if (!shifts || !Array.isArray(shifts)) return [];
	
		return shifts.map((shift) => ({
			...shift,
			start: new Date(shift.startTime), 
			end: new Date(shift.endTime),
			title: `${shift.caregiver.firstName} ${shift.caregiver.lastName}`, 
			location: shift.clientAddress
		}));
	}, [shifts]);

    // --- 1. ADD STATE FOR CALENDAR VIEW ---
    const [view, setView] = useState('week'); // Default to 'week' or 'month'
	const [date, setDate] = useState(new Date());


    // ... (Your existing state for openShifts, approvals, and alerts remain the same)
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
                    {/* --- 2. BIND VIEW AND ONVIEW HANDLER TO CALENDAR --- */}
					<Calendar
						localizer={localizer}
						events={aggregatedEvents}
						startAccessor="start"
						endAccessor="end"
						onSelectEvent={handleSelectEvent} // Trigger navigation on click
						components={{
							event: CustomEvent, // Use our custom-styled event entry
						}}
						// Calendar View Settings
						date={date}
						onNavigate={(newDate) => setDate(newDate)}
						view={view}
						onView={setView}
						views={['month', 'week', 'day', 'agenda']}
						step={60}           // 1-hour intervals
						timeslots={1}       // Number of divisions per step
						className="my_calendar"
					/>
                </div>
                
                {/* ... (Your existing sidebar content remains the same) }
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
				{*/}
            </div>
        </div>
    );
}

