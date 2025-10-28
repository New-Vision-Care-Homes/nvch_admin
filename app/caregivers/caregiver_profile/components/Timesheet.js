import React, { useState } from "react";
import { SquarePen, Calendar, Clock, Users, Plus, Trash2 } from "lucide-react";
import styles from "./Timesheet.module.css";
import { Table, TableContent, TableCell, TableHeader } from "@components/UI/Table";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";

export default function Timesheet() {

	const [isModalOpen, setIsModalOpen] = useState(false);

	const defaultAvailability = [
		{ day: "Monday", slots: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
		{ day: "Tuesday", slots: [{ start: "10:00", end: "16:00" }] },
		{ day: "Wednesday", slots: [] },
		{ day: "Thursday", slots: [{ start: "09:00", end: "12:00" }] },
		{ day: "Friday", slots: [{ start: "13:00", end: "17:00" }] },
		{ day: "Saturday", slots: [] },
		{ day: "Sunday", slots: [{ start: "10:00", end: "14:00" }] },
	];

	const [availability, setAvailability] = useState(defaultAvailability);

	const [stats, setStats] = useState([
		{ label: "Total Hours Worked (Bi-Weekly)", value: 40.5 },
		{ label: "Total Overtime Hours", value: 2.5 },
		{ label: "Pending Approvals", value: 3 },
	]);

	const [shifts, setShifts] = useState([
		{
			id: '1',
			status: "Confirmed",
			date: "Oct 29, 2024",
			shiftTimes: "11:00 AM - 4:00 PM",
			client: "Dr. Maria Lopez",
			services: "Companionship, Specialized Care",
			hoursWorked: 5.0,
			overtime: 0.0,
			approvalStatus: "Approved",
			supervisorComments: "Client very pleased with service.",
		},
		{
			id: '2',
			status: "Pending",
			date: "Oct 27, 2024",
			shiftTimes: "2:00 PM - 5:00 PM",
			client: "Mr. David Lee",
			services: "Medication Reminders, Light Housekeeping",
			hoursWorked: 3.0,
			overtime: 0.0,
			approvalStatus: "Pending",
			supervisorComments: "No comments",
		},
		{
			id: '3',
			status: "Confirmed",
			date: "Oct 26, 2024",
			shiftTimes: "9:00 AM - 1:00 PM",
			client: "Mrs. Eleanor Vance",
			services: "Companionship, Meal Prep",
			hoursWorked: 4.0,
			overtime: 0.0,
			approvalStatus: "Approved",
			supervisorComments: "Excellent work.",
		},
	]);

	const [maxHours, setMaxHours] = useState(80);
	const [lastPeriodHours, setLastPeriodHours] = useState(72);

	const handleCancel = () => {
		setIsModalOpen(false);
		setAvailability(defaultAvailability);
		setMaxHours(80);
		setLastPeriodHours(72);
	}

	const handleSave = () => {
		setIsModalOpen(false);
		alert("✅ Availability updated successfully!");
	};

	const handleTimeChange = (dayIndex, slotIndex, field, value) => {
		const updated = [...availability];
		updated[dayIndex].slots[slotIndex][field] = value;
		setAvailability(updated);
	};

	const handleAddSlot = (dayIndex) => {
		const updated = [...availability];
		updated[dayIndex].slots.push({ start: "09:00", end: "17:00" });
		setAvailability(updated);
	};

	const handleRemoveSlot = (dayIndex, slotIndex) => {
		const updated = [...availability];
		updated[dayIndex].slots.splice(slotIndex, 1);
		setAvailability(updated);
	};

	return (
		<div className={styles.container}>
			<div className={styles.time}>
				{/* LEFT SIDE */}
				<div className={styles.left}>
					<div className={styles.header}>
						<Calendar className={styles.icon} />
						<h2 className={styles.title}>Availability</h2>
					</div>

					<div className={styles.scheduleList}>
						{availability.map((item, index) => (
							<div key={index} className={styles.scheduleItem}>
								<div className={styles.day}>{item.day}:</div>
								<div className={styles.slotsContainer}>
									{item.slots.length > 0 ? (
										item.slots.map((slot, idx) => (
											<span key={idx} className={styles.slot}>
												{slot.start} - {slot.end}
											</span>
										))
									) : (
										<span className={styles.notAvailable}>Not Available</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* RIGHT */}
				<div className={styles.right}>
					<div className={styles.block}>
						<div className={styles.header}>
							<Clock className={styles.icon} />
							<h2 className={styles.title}>Bi-weekly Work Capacity</h2>
						</div>
						<div className={styles.content}>
							<div className={styles.label}>Max Hours:</div>
							<div className={styles.value}>{maxHours} hours</div>
						</div>
					</div>

					<div className={styles.block}>
						<div className={styles.header}>
							<Users className={styles.icon} />
							<h2 className={styles.title}>Previous Bi-weekly Work</h2>
						</div>
						<div className={styles.content}>
							<div className={styles.label}>Hours Worked (Last Period):</div>
							<div className={styles.value}>{lastPeriodHours} hours</div>
						</div>
					</div>

					<div className={styles.button}>
						<Button icon={<SquarePen />} onClick={() => setIsModalOpen(true)}>
							Edit
						</Button>
					</div>
				</div>
			</div>

			<div className={styles.hours}>
				{stats.map((stat, index) => (
					<div key={index} className={styles.hour}>
						<div className={styles.label}>{stat.label}</div>
						<div className={styles.value}>{stat.value}</div>
					</div>
				))}
			</div>

			<Modal isOpen={isModalOpen} onClose={handleCancel}>
				<h2>Edit Timesheet</h2>
				<div className={styles.modalContent}>
					<div>
						<h3 className={styles.sectionTitle}>Availability</h3>
						{availability.map((day, dayIndex) => (
							<div key={dayIndex} className={styles.dayBlock}>
								<div className={styles.dayHeader}>
									<strong>{day.day}</strong>
									<Button variant="outline" size="sm" onClick={() => handleAddSlot(dayIndex)}>
										<Plus size={14} /> Add Slot
									</Button>
								</div>

								{day.slots.length > 0 ? (
									day.slots.map((slot, slotIndex) => (
										<div key={slotIndex} className={styles.slotRow}>
											<input
												type="time"
												value={slot.start}
												onChange={(e) =>
													handleTimeChange(dayIndex, slotIndex, "start", e.target.value)
												}
												className={styles.timeInput}
											/>
											<span>to</span>
											<input
												type="time"
												value={slot.end}
												onChange={(e) =>
													handleTimeChange(dayIndex, slotIndex, "end", e.target.value)
												}
												className={styles.timeInput}
											/>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
											>
												<Trash2 size={14} />
											</Button>
										</div>
									))
								) : (
									<p className={styles.notAvailableText}>Not Available</p>
								)}
							</div>
						))}
					</div>

					<div>
						<h3 className={styles.sectionTitle}>Work Hours</h3>
						<div className={styles.inputGroup}>
							<label>Max Hours (Bi-weekly)</label>
							<input
								type="number"
								value={maxHours}
								onChange={(e) => setMaxHours(e.target.value)}
								className={styles.numberInput}
							/>
						</div>

						<div className={styles.inputGroup}>
							<label>Last Period Hours</label>
							<input
								type="number"
								value={lastPeriodHours}
								onChange={(e) => setLastPeriodHours(e.target.value)}
								className={styles.numberInput}
							/>
						</div>

						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleCancel}>
								Cancel
							</Button>
							<Button onClick={handleSave}>Save</Button>
						</div>
					</div>
				</div>
			</Modal>

			<Table>
				<TableHeader>
					<TableCell>Status</TableCell>
					<TableCell>Date</TableCell>
					<TableCell>Shift Times</TableCell>
					<TableCell>Client</TableCell>
					<TableCell>Hour Worked</TableCell>
					<TableCell>Overtime</TableCell>
					<TableCell>Approval Status</TableCell>
					<TableCell>Supervisor Comments</TableCell>
				</TableHeader>

				{shifts.map(c => (
					<TableContent key={c.id}>
						<TableCell>{c.status}</TableCell>
						<TableCell>{c.date}</TableCell>
						<TableCell>{c.shiftTimes}</TableCell>
						<TableCell>{c.client}</TableCell>
						<TableCell>{c.hoursWorked}</TableCell>
						<TableCell>{c.overtime}</TableCell>
						<TableCell>{c.approvalStatus}</TableCell>
						<TableCell>{c.supervisorComments}</TableCell>
					</TableContent>
				))}
			</Table>
		</div>
	);
};


