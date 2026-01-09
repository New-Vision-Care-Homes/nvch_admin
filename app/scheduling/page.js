"use client";

import React, { useState, useMemo } from "react";
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
	console.log("shifts: ", shifts);

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


    const handleSelectEvent = (event) => {
        alert(
            `📋 ${event.title}\n📍 Location: ${event.location}\n🕒 ${format(
                event.start,
                "p"
            )} - ${format(event.end, "p")}`
        );
    };

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
                        events={getEvents}
                        startAccessor="start"
                        endAccessor="end"
                        className="my_calendar"
                        onSelectEvent={handleSelectEvent}

						date={date} 
    					onNavigate={(newDate) => setDate(newDate)}
                        view={view} 
                        onView={setView} // This updates the view state when the user clicks the view buttons
                        views={['month', 'week', 'day', 'agenda']} 

						allDayMaxRows={0}
						showAllDayEvents={false}
						tooltipAccessor={null}
						step={60}           
						timeslots={1}
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

