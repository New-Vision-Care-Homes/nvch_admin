"use client";

import React, { useState, useMemo } from "react";
import styles from "./Shifts.module.css";
import { Trash2, CirclePlus, Funnel } from "lucide-react";
import { Table, TableHeader, TableCell, TableContent} from "@components/UI/Table";
import Button from "@components/UI/Button";

export default function Shifts() {

	const [activeTab, setActiveTab] = useState("upcoming");
	const [shifts, setShifts] = useState(
	[
		{
			id: '1',
			status: 'confirmed',
			date: 'Oct 29, 2025',
			time: '11:00 AM - 4:00 PM',
			client: 'Dr. Maria Lopez',
			location: '202 Elm St, Anytown',
			services: 'Companionship, Specialized Care',
		},
		{
			id: '2',
			status: 'canceled',
			date: 'Oct 28, 2024',
			time: '1:00 PM - 3:00 PM',
			client: 'Mr. Robert Green',
			location: '101 Cedar Dr, Anytown',
			services: 'Errands, Transportation',
		},
		{
			id: '3',
			status: 'pending',
			date: 'Oct 27, 2024',
			time: '2:00 PM - 5:00 PM',
			client: 'Mr. David Lee',
			location: '45 Pine St, Anytown',
			services: 'Medication Reminders, Light Housekeeping',
		},
		{
			id: '4',
			status: 'confirmed',
			date: 'Oct 26, 2024',
			time: '9:00 AM - 1:00 PM',
			client: 'Mrs. Eleanor Vance',
			location: '123 Oak Ave, Anytown',
			services: 'Companionship, Meal Prep',
		},
		{
			id: '5',
			status: 'completed',
			date: 'Oct 25, 2024',
			time: '10:00 AM - 12:00 PM',
			client: 'Ms. Susan Chen',
			location: '789 Birch Ln, Anytown',
			services: 'Personal Care',
		},
		{
			id: '6',
			status: 'completed',
			date: 'Oct 24, 2024',
			time: '8:00 AM - 12:00 PM',
			client: 'Mr. James Wilson',
			location: '456 Maple Rd, Anytown',
			services: 'Transportation, Errands',
		},
		{
			id: '7',
			status: 'completed',
			date: 'Oct 23, 2024',
			time: '3:00 PM - 7:00 PM',
			client: 'Mrs. Patricia Brown',
			location: '321 Willow Way, Anytown',
			services: 'Companionship, Light Housekeeping',
		},
	]);

	const { pastShifts, upcomingShifts } = useMemo(() => {
		const today = new Date();
	
		const past = [];
		const upcoming = [];
	
		shifts.forEach((shift) => {
			const shiftDate = new Date(shift.date);
		
			if (shiftDate < today) {
				past.push(shift);
			} else {
				upcoming.push(shift);
			}
		});
	
		return { pastShifts: past, upcomingShifts: upcoming };
	}, [shifts]);
	
	const currentShifts = activeTab === "upcoming" ? upcomingShifts : pastShifts;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2>Shifts & Schedule</h2>
			</div>
			<div className={styles.buttons}>
				<div className={styles.tabContainer}>
					<button
						onClick={() => setActiveTab("upcoming")}
						className={`${styles.tabButton} ${
							activeTab === "upcoming" ? styles.active : ""
						}`}
					>
						Upcoming Shifts
					</button>

					<button
						onClick={() => setActiveTab("past")}
						className={`${styles.tabButton} ${
							activeTab === "past" ? styles.active : ""
						}`}
					>
						Past Shifts
					</button>
				</div>
				<div>
					<Funnel />
				</div>
			</div>

			<Table>
				<TableHeader>
					<TableCell>STATUS</TableCell>
					<TableCell>CLIENT</TableCell>
					<TableCell>DATE</TableCell>
					<TableCell>TIME</TableCell>
					<TableCell>LOCATION</TableCell>
					<TableCell>SERVICES</TableCell>
				</TableHeader>

				{currentShifts.map(c => (
					<TableContent key={c.id}>
						<TableCell>{c.status}</TableCell>
						<TableCell>{c.client}</TableCell>
						<TableCell>{c.date}</TableCell>
						<TableCell>{c.time}</TableCell>
						<TableCell>{c.location}</TableCell>
						<TableCell>{c.services}</TableCell>
					</TableContent>
				))}
			</Table>
		</div>
	);
}