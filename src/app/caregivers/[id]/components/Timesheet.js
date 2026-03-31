import React, { useState, useEffect } from "react";
import { SquarePen, Calendar, Clock, Users, Plus, Trash2 } from "lucide-react";
import styles from "./Timesheet.module.css";
import { Table, TableContent, TableCell, TableHeader } from "@components/UI/Table";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { Card, CardHeader, CardContent, InputFieldLR, InfoField } from "@components/UI/Card";
import { useParams } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useShifts } from "@/hooks/useShifts";
import { useHours } from "@/hooks/useHours";

// Helper function to map day names and group slots for display.
// This transforms the flat backend array (e.g., slot 1, slot 2, slot 3...) 
// into a structured array grouped by day (e.g., Monday: [slot 1, slot 2], Tuesday: [slot 3]),
// which is required for UI rendering.
const groupAvailabilityByDay = (availabilityArray) => {
	const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
	const grouped = {};

	// 1. Initialize all days with empty slots
	daysOrder.forEach(day => {
		grouped[day] = [];
	});

	// 2. Group the backend slots by day
	availabilityArray.forEach(slot => {
		// Normalize day name: 'monday' -> 'Monday'
		const dayName = slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase();
		if (grouped[dayName]) {
			grouped[dayName].push(slot);
		}
	});

	// 3. Convert the grouped object back to an ordered array for rendering
	return daysOrder.map(day => ({
		day: day,
		slots: grouped[day] || []
	}));
};

export default function Timesheet() {

	const [isModalOpen, setIsModalOpen] = useState(false);

	// --- State Initialization matching backend structure ---
	const defaultAvailability = [
		// Example structure matching backend flat format
		{ day: 'monday', startTime: '09:00', endTime: '13:00', isAvailable: true, notes: '' },
		{ day: 'tuesday', startTime: '10:00', endTime: '16:00', isAvailable: true, notes: '' },
	];

	// availability stores the current editable data (raw flat array from backend)
	const [availability, setAvailability] = useState(defaultAvailability);
	// originalAvailability stores the data loaded from the backend for cancellation/reset
	const [originalAvailability, setOriginalAvailability] = useState(defaultAvailability);

	// --- Other States ---
	const [stats, setStats] = useState([
		{ label: "Total Hours Worked (Bi-Weekly)", value: 40.5 },
		{ label: "Total Overtime Hours", value: 2.5 },
		{ label: "Pending Approvals", value: 3 },
	]);

	const [maxHours, setMaxHours] = useState(80);
	const [lastPeriodHours, setLastPeriodHours] = useState(72);
	const { id } = useParams();
	const { caregiverDetail, isError, errorMessage, updateCaregiver } = useCaregivers(id);
	const { shifts, isError: shiftsError, errorMessage: shiftsErrorMessage } = useShifts({
		params: { caregiverId: id }
	});
	const { hours, hourHistory, isLoading, error } = useHours(id);
	console.log("shifts: ", shifts);

	useEffect(() => {
		if (caregiverDetail) {

			const backendAvailability = caregiverDetail.availability || [];
			setAvailability(backendAvailability);
			setOriginalAvailability(backendAvailability);



			setMaxHours(caregiverDetail.maxHours || 80);
			setLastPeriodHours(caregiverDetail.lastPeriodHours || 72);
		}
	}, [caregiverDetail]);


	// --- Modal Handlers ---

	// Handles closing the modal and reverting changes to original state
	const handleCancel = () => {
		setIsModalOpen(false);
		setAvailability(originalAvailability);
		// Reset maxHours/lastPeriodHours to their original loaded values if needed
		setMaxHours(80);
		setLastPeriodHours(72);
	}

	// Handles saving the changes (sends data back to backend in a real app)
	const handleSave = () => {
		setIsModalOpen(false);

		const submissionBody = {
			employeeId: id,
			availability: availability,
		};

		updateCaregiver(
			{ id, data: submissionBody },
			{
				onSuccess: () => {
					console.log("Availability to save:", availability);
					alert("✅ Availability updated successfully!");
					setOriginalAvailability(availability); // Update the original state after saving
				},
				onError: (err) => {
					console.error("Error updating availability:", err);
					alert(err?.response?.data?.message || err.message || "Failed to update schedule.");
				}
			}
		);
	};

	// Updates a specific time field (startTime or endTime) for a slot using its index in the flat array
	const handleTimeChange = (slotIndex, field, value) => {
		const updated = [...availability];
		const key = field === "start" ? "startTime" : "endTime"; // Map UI field to backend field
		updated[slotIndex][key] = value;
		setAvailability(updated);
	};

	// Adds a new default slot for a specific day to the flat array
	const handleAddSlot = (dayName) => {
		const newSlot = {
			day: dayName.toLowerCase(),
			startTime: "09:00",
			endTime: "17:00",
			isAvailable: true,
			notes: ""
		};
		setAvailability([...availability, newSlot]);
	};

	// Removes a slot using its index in the flat array
	const handleRemoveSlot = (slotIndex) => {
		const updated = availability.filter((_, index) => index !== slotIndex);
		setAvailability(updated);
	};

	// Use the helper function to prepare data for display/layout
	const groupedAvailability = groupAvailabilityByDay(availability);


	return (
		<div className={styles.container}>
			<div className={styles.topHeader}>
				<h2 className={styles.pageTitle}>Timesheet Overview</h2>
				<Button
					variant="primary"
					icon={<SquarePen size={18} />}
					onClick={() => setIsModalOpen(true)}
					className={styles.mainEditBtn}
				>
					Edit Hours
				</Button>
			</div>
			<div className={styles.topSection}>
				{/* Availability Card */}
				<Card className={styles.availabilityCard}>
					<CardHeader className={styles.cardHeader}>
						<div className={styles.headerTitle}>
							<Calendar className={styles.icon} />
							<span>Availability</span>
						</div>
					</CardHeader>
					<CardContent>
						<div className={styles.scheduleList}>
							{groupedAvailability.map((item, index) => (
								<div key={index} className={styles.scheduleItem}>
									<div className={styles.dayLabel}>{item.day}</div>
									<div className={styles.slotsWrapper}>
										{item.slots.length > 0 ? (
											item.slots.map((slot, idx) => (
												<span key={idx} className={styles.slotBadge}>
													{slot.startTime} - {slot.endTime}
												</span>
											))
										) : (
											<span className={styles.notAvailableBadge}>Not Available</span>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Work Capacity & Quick Stats */}
				<div className={styles.rightColumn}>
					<Card className={styles.capacityCard}>
						<CardHeader className={styles.cardHeader}>
							<div className={styles.headerTitle}>
								<Clock className={styles.icon} />
								<span>Work Capacity</span>
							</div>
						</CardHeader>
						<CardContent className={styles.capacityContent}>
							<InfoField label="Bi-weekly Max Hours" value={`${hours?.maxHours ? hours.maxHours : 'N/A'} hours`} />
							<InfoField label="Last Period Total" value={`${hours?.previousPeriod?.totalHours ? hours.previousPeriod.totalHours : 'N/A'} hours`} />
						</CardContent>
					</Card>

					{/* Highlight Stats */}
					<div className={styles.statsGrid}>
						<Card className={styles.statCard}>
							<div className={styles.statLabel}>Current Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalHours ? hours.currentPeriod.totalHours : 'N/A'}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.overtime}`}>
							<div className={styles.statLabel}>Overtime</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalOvertime ? hours.currentPeriod.totalOvertime : 'N/A'}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.pending}`}>
							<div className={styles.statLabel}>Pending</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.pendingApprovals ? hours.currentPeriod.pendingApprovals : 'N/A'}</div>
							<div className={styles.statUnit}>Approvals</div>
						</Card>
					</div>
				</div>
			</div>

			{/* Modal for Editing */}
			<Modal isOpen={isModalOpen} onClose={handleCancel}>
				<Card className={styles.modalCard}>
					<CardHeader>Edit Timesheet</CardHeader>
					<CardContent>
						<div className={styles.modalContent}>
							{/* Availability Editor (Left Column) */}
							<div className={styles.availabilityEditor}>
								<h3 className={styles.sectionTitle}>Availability</h3>
								<div className={styles.dayGrid}>
									{groupedAvailability.map((dayItem, dayIndex) => (
										<div key={dayIndex} className={styles.dayBlock}>
											<div className={styles.dayHeader}>
												<strong>{dayItem.day}</strong>
												<Button variant="outline" size="sm" onClick={() => handleAddSlot(dayItem.day)}>
													<Plus size={14} /> Add Slot
												</Button>
											</div>

											{dayItem.slots.length > 0 ? (
												dayItem.slots.map((slot, slotInnerIndex) => {
													// Find the actual index of this slot in the flat 'availability' array for mutation
													const flatIndex = availability.findIndex(
														s => s.day.toLowerCase() === dayItem.day.toLowerCase() &&
															s.startTime === slot.startTime &&
															s.endTime === slot.endTime
													);

													if (flatIndex === -1) return null;

													return (
														<div key={slotInnerIndex} className={styles.slotRow}>
															<div className={styles.timeInputs}>
																<input
																	type="time"
																	value={slot.startTime}
																	onChange={(e) =>
																		handleTimeChange(flatIndex, "start", e.target.value)
																	}
																	className={styles.timeInput}
																/>
																<span className={styles.toSeparator}>to</span>
																<input
																	type="time"
																	value={slot.endTime}
																	onChange={(e) =>
																		handleTimeChange(flatIndex, "end", e.target.value)
																	}
																	className={styles.timeInput}
																/>
															</div>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleRemoveSlot(flatIndex)}
																className={styles.removeBtn}
															>
																<Trash2 size={14} />
															</Button>
														</div>
													);
												})
											) : (
												<p className={styles.notAvailableText}>Not Available</p>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Work Hours Editor (Right Column) */}
							<div className={styles.workHoursEditor}>
								<h3 className={styles.sectionTitle}>Work Hours</h3>
								<div className={styles.inputCard}>
									<InputFieldLR
										label="Max Hours (Bi-weekly)"
										type="number"
										value={maxHours}
										onChange={(e) => setMaxHours(e.target.value)}
									/>

									<InputFieldLR
										label="Last Period Hours"
										type="number"
										value={lastPeriodHours}
										onChange={(e) => setLastPeriodHours(e.target.value)}
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
					</CardContent>
				</Card>
			</Modal>

			{/* Shifts Table Section */}
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

				{/* Conditional Rendering: Check if shifts array is populated */}
				{shifts && shifts.length > 0 ? (
					// Render shift rows
					shifts.map(c => (
						<TableContent key={c._id}>
							<TableCell>{c.status}</TableCell>
							<TableCell>{c.startTime.split("T")[0]}</TableCell>
							<TableCell>{c.startTime.split("T")[1] + " - " + c.endTime.split("T")[1]}</TableCell>
							<TableCell>{c.client.firstName + " " + c.client.lastName}</TableCell>
							<TableCell>n/a</TableCell>
							<TableCell>n/a</TableCell>
							<TableCell>n/a</TableCell>
							<TableCell>n/a</TableCell>
						</TableContent>
					))
				) : (
					// Render "No Shifts" message
					<TableContent>
						<TableCell colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
							No shifts found for this user.
						</TableCell>
					</TableContent>
				)}
			</Table>
		</div>
	);
};

