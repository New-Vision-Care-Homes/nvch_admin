"use client";

import React, { useState } from "react";
import styles from "./History.module.css";
import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";


export default function History() {
	// State
	const [caregiverFilter, setCaregiverFilter] = useState(""); // Filter by caregiver name
	const [dateFilter, setDateFilter] = useState(""); // Filter by date
	const [sortField, setSortField] = useState("visitDate"); // Field to sort
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'

	// Mock data
	const mockData = [
		{
			id: "1",
			visitDate: "2023-10-26",
			caregiverName: "Alice Johnson",
			visitNotes: "Routine check-up, client was cooperative and in good spirits.",
			incidents: "No incidents. Client expressed satisfaction with care."
		},
		{
			id: "2",
			visitDate: "2023-11-01",
			caregiverName: "Bob Williams",
			visitNotes: "Medication administration and light housekeeping. Client seemed a bit tired.",
			incidents: "Minor complaint about evening meal. Discussed with family."
		},
		{
			id: "3",
			visitDate: "2023-11-15",
			caregiverName: "Alice Johnson",
			visitNotes: "Companionship visit, read a book together. Client was engaged.",
			incidents: "None."
		},
		{
			id: "4",
			visitDate: "2023-12-03",
			caregiverName: "Charlie Brown",
			visitNotes: "Assisted with personal care and meal preparation. Noted some stiffness in joints.",
			incidents: "Client mentioned mild discomfort in right knee. Documented and reported."
		},
		{
			id: "5",
			visitDate: "2024-01-10",
			caregiverName: "Dana Lee",
			visitNotes: "Follow-up on physical therapy exercises. Client demonstrated good progress.",
			incidents: "None. Positive feedback from client regarding progress."
		}
	];

	// Sorting handler
	function handleSort(field) {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	}

	// Filter + sort data
	function getFilteredAndSortedData() {
		let filtered = mockData.slice(); // copy array

		if (caregiverFilter) {
			filtered = filtered.filter(record =>
				record.caregiverName.toLowerCase().includes(caregiverFilter.toLowerCase())
			);
		}

		if (dateFilter) {
			filtered = filtered.filter(record => record.visitDate === dateFilter);
		}

		filtered.sort((a, b) => {
			const aValue = a[sortField];
			const bValue = b[sortField];

			if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
			if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});

		return filtered;
	}

	const filteredData = getFilteredAndSortedData();

	// Sort icon
	const SortIcon = (field) => {
		if (sortField !== field) return null;

		return sortDirection === "asc" ? (
			<ArrowUpNarrowWide size={16} />
		) : (
			<ArrowDownWideNarrow size={16} />
		);
	};


	const CustomInput = forwardRef(({ value, onClick }, ref) => (
		<div className={styles.dateWrapper} onClick={onClick} ref={ref}>
			<input
				type="text"
				value={value}
				readOnly
				placeholder="Filter by visit date"
				className={styles.dateButton}
			/>
			<Calendar className={styles.dateIcon} />
		</div>
	));
	CustomInput.displayName = "HistoryDatePickerInput";

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2>Visit History</h2>
				<h6>View and manage past visit records for the client.</h6>
			</div>

			<div className={styles.filters}>
				<input
					type="text"
					placeholder="Filter by caregiver name"
					className={styles.searchInput}
					value={caregiverFilter}
					onChange={e => setCaregiverFilter(e.target.value)}
				/>
				<DatePicker
					selected={dateFilter ? new Date(dateFilter) : null}
					onChange={date => setDateFilter(date.toISOString().split("T")[0])}
					customInput={<CustomInput />}
				/>
			</div>

			<div className={styles.tableWrapper}>
				<table className={styles.table}>
					<thead className={styles.tableHeader}>
						<tr>
							<th className={styles.sortableHeader} onClick={() => handleSort("visitDate")}>
								Visit Date {SortIcon("visitDate")}
							</th>
							<th className={styles.sortableHeader} onClick={() => handleSort("caregiverName")}>
								Caregiver Name {SortIcon("caregiverName")}
							</th>
							<th>Visit Notes</th>
							<th>Incidents/Feedback</th>
						</tr>
					</thead>
					<tbody className={styles.tableBody}>
						{filteredData.length > 0
							? filteredData.map(record => (
								<tr key={record.id}>
									<td className={styles.visitDate}>{record.visitDate}</td>
									<td className={styles.caregiverName}>{record.caregiverName}</td>
									<td className={styles.visitNotes}>{record.visitNotes}</td>
									<td className={styles.incidents}>{record.incidents}</td>
								</tr>
							))
							: (
								<tr>
									<td colSpan="4" className={styles.emptyState}>
										No visit records found.
									</td>
								</tr>
							)}
					</tbody>
				</table>
			</div>
		</div>
	);
}


