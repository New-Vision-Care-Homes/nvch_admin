"use client";

import React, { useState, useMemo } from "react";
import styles from "./Shifts.module.css";
import { Trash2, CirclePlus, Funnel } from "lucide-react";
import { Table, TableHeader, TableCell, TableContent} from "@components/UI/Table";
import Button from "@components/UI/Button";
import { useShift } from "@/hooks/useShifts";
import { useParams } from "next/navigation";

export default function Shifts() {
	const [activeTab, setActiveTab] = useState("upcoming");

	const { id } = useParams();
	const { data: shifts, isLoading, isError, error } = useShift(id);
	console.log("shifts: ", shifts);
	

	const { pastShifts, upcomingShifts } = useMemo(() => {
		const today = new Date();
	
		const past = [];
		const upcoming = [];
	
		if(shifts){
			shifts.forEach((shift) => {
				const shiftDate = new Date(shift.date);
			
				if (shiftDate < today) {
					past.push(shift);
				} else {
					upcoming.push(shift);
				}
			});
		}
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
					<TableCell>LOCATION</TableCell>
					<TableCell>SERVICES</TableCell>
				</TableHeader>
				{currentShifts.length === 0 ? (
					<TableContent>
						<TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
							No shifts found.
						</TableCell>
					</TableContent>
				):(
					currentShifts.map(c => (
						<TableContent key={c._id}>
							<TableCell>{c.status}</TableCell>
							<TableCell>{c.client.fullName}</TableCell>
							<TableCell>{c.startTime}</TableCell>
							<TableCell>{c.clientAddress}</TableCell>
							<TableCell>{c.servicesRequired}</TableCell>
						</TableContent>
					))
				)}
			</Table>
		</div>
	);
}