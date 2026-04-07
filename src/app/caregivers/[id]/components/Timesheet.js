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

	// --- Two separate modal states ---
	const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
	const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

	// --- State Initialization matching backend structure ---
	const defaultAvailability = [
		{ day: 'monday', startTime: '09:00', endTime: '13:00', isAvailable: true, notes: '' },
		{ day: 'tuesday', startTime: '10:00', endTime: '16:00', isAvailable: true, notes: '' },
	];

	const [availability, setAvailability] = useState(defaultAvailability);
	const [originalAvailability, setOriginalAvailability] = useState(defaultAvailability);

	const [maxHours, setMaxHours] = useState(80);
	const [originalMaxHours, setOriginalMaxHours] = useState(80);
	const [lastPeriodHours, setLastPeriodHours] = useState(72);
	const [originalLastPeriodHours, setOriginalLastPeriodHours] = useState(72);

	const { id } = useParams();
	const { caregiverDetail, isError, errorMessage, updateCaregiver } = useCaregivers(id);
	const { shifts, isError: shiftsError, errorMessage: shiftsErrorMessage } = useShifts({
		params: { caregiverId: id }
	});
	const { hours, hourHistory, isLoading, error } = useHours(id);

	useEffect(() => {
		if (caregiverDetail) {
			const backendAvailability = caregiverDetail.availability || [];
			setAvailability(backendAvailability);
			setOriginalAvailability(backendAvailability);

			const mh = caregiverDetail.maxHours || 80;
			const lph = caregiverDetail.lastPeriodHours || 72;
			setMaxHours(mh);
			setOriginalMaxHours(mh);
			setLastPeriodHours(lph);
			setOriginalLastPeriodHours(lph);
		}
	}, [caregiverDetail]);

	// --- Availability Modal Handlers ---
	const handleAvailabilityCancel = () => {
		setIsAvailabilityModalOpen(false);
		setAvailability(originalAvailability);
	};

	const handleAvailabilitySave = () => {
		setIsAvailabilityModalOpen(false);
		const submissionBody = { employeeId: id, availability };
		updateCaregiver(
			{ id, data: submissionBody },
			{
				onSuccess: () => {
					alert("✅ Availability updated successfully!");
					setOriginalAvailability(availability);
				},
				onError: (err) => {
					alert(err?.response?.data?.message || err.message || "Failed to update availability.");
				}
			}
		);
	};

	// --- Hours Modal Handlers ---
	const handleHoursCancel = () => {
		setIsHoursModalOpen(false);
		setMaxHours(originalMaxHours);
		setLastPeriodHours(originalLastPeriodHours);
	};

	const handleHoursSave = () => {
		setIsHoursModalOpen(false);
		const submissionBody = { employeeId: id, maxHours: Number(maxHours), lastPeriodHours: Number(lastPeriodHours) };
		updateCaregiver(
			{ id, data: submissionBody },
			{
				onSuccess: () => {
					alert("✅ Hours updated successfully!");
					setOriginalMaxHours(maxHours);
					setOriginalLastPeriodHours(lastPeriodHours);
				},
				onError: (err) => {
					alert(err?.response?.data?.message || err.message || "Failed to update hours.");
				}
			}
		);
	};

	// --- Availability slot helpers ---
	const handleTimeChange = (slotIndex, field, value) => {
		const updated = [...availability];
		const key = field === "start" ? "startTime" : "endTime";
		updated[slotIndex][key] = value;
		setAvailability(updated);
	};

	const handleAddSlot = (dayName) => {
		setAvailability([...availability, {
			day: dayName.toLowerCase(),
			startTime: "09:00",
			endTime: "17:00",
			isAvailable: true,
			notes: ""
		}]);
	};

	const handleRemoveSlot = (slotIndex) => {
		setAvailability(availability.filter((_, i) => i !== slotIndex));
	};

	const groupedAvailability = groupAvailabilityByDay(availability);

	return (
		<div className={styles.container}>
			<div className={styles.topHeader}>
				<h2 className={styles.pageTitle}>Timesheet Overview</h2>
			</div>

			<div className={styles.topSection}>
				{/* Availability Card */}
				<Card className={styles.availabilityCard}>
					<CardHeader className={styles.cardHeader}>
						<div className={styles.headerTitle}>
							<Calendar className={styles.icon} />
							<span>Availability</span>
						</div>
						<Button
							variant="ghost"
							className={styles.headerBtn}
							icon={<SquarePen size={14} />}
							onClick={() => setIsAvailabilityModalOpen(true)}
						>
							Edit
						</Button>
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
							<Button
								variant="ghost"
								className={styles.headerBtn}
								icon={<SquarePen size={14} />}
								onClick={() => setIsHoursModalOpen(true)}
							>
								Edit
							</Button>
						</CardHeader>
						<CardContent className={styles.capacityContent}>
							<InfoField label="Bi-weekly Max Hours" value={`${hours?.maxHours ?? 'N/A'} hours`} />
							<InfoField label="Last Period Total" value={`${hours?.previousPeriod?.totalHours ?? 'N/A'} hours`} />
						</CardContent>
					</Card>

					<div className={styles.statsGrid}>
						<Card className={styles.statCard}>
							<div className={styles.statLabel}>Current Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalHours ?? 'N/A'}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.overtime}`}>
							<div className={styles.statLabel}>Overtime</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalOvertime ?? 'N/A'}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.pending}`}>
							<div className={styles.statLabel}>Pending</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.pendingApprovals ?? 'N/A'}</div>
							<div className={styles.statUnit}>Approvals</div>
						</Card>
					</div>
				</div>
			</div>

			{/* ── Modal 1: Edit Availability ─────────────────────── */}
			<Modal isOpen={isAvailabilityModalOpen} onClose={handleAvailabilityCancel}>
				<Card className={styles.modalCard}>
					<CardHeader>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<Calendar size={18} style={{ color: "var(--color-secondary)", opacity: 0.8 }} />
							Edit Availability
						</div>
					</CardHeader>
					<CardContent>
						<div className={styles.modalContentWrapper}>
							<div className={styles.dayGrid}>
								{groupedAvailability.map((dayItem, dayIndex) => (
									<div key={dayIndex} className={styles.dayBlock}>
										<div className={styles.dayHeader}>
											<strong>{dayItem.day}</strong>
											<Button variant="outline" size="sm" onClick={() => handleAddSlot(dayItem.day)}>
												<Plus size={13} /> Add Slot
											</Button>
										</div>

										{dayItem.slots.length > 0 ? (
											dayItem.slots.map((slot, slotInnerIndex) => {
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
																onChange={(e) => handleTimeChange(flatIndex, "start", e.target.value)}
																className={styles.timeInput}
															/>
															<span className={styles.toSeparator}>—</span>
															<input
																type="time"
																value={slot.endTime}
																onChange={(e) => handleTimeChange(flatIndex, "end", e.target.value)}
																className={styles.timeInput}
															/>
														</div>
														<Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(flatIndex)} className={styles.removeBtn}>
															<Trash2 size={14} />
														</Button>
													</div>
												);
											})
										) : (
											<p className={styles.notAvailableText}>No slots — click Add Slot to set hours</p>
										)}
									</div>
								))}
							</div>
							<div className={styles.modalActions}>
								<Button variant="secondary" onClick={handleAvailabilityCancel}>Cancel</Button>
								<Button onClick={handleAvailabilitySave}>Save Changes</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</Modal>

			{/* ── Modal 2: Edit Hours ─────────────────────────────── */}
			<Modal isOpen={isHoursModalOpen} onClose={handleHoursCancel}>
				<Card className={styles.modalCard}>
					<CardHeader>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<Clock size={18} style={{ color: "var(--color-secondary)", opacity: 0.8 }} />
							Edit Work Hours
						</div>
					</CardHeader>
					<CardContent>
						<div className={styles.modalContentWrapper}>
							<div className={styles.inputCard}>
								<p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.5 }}>
									Set the maximum bi-weekly hours and record the last period's total hours for this caregiver.
								</p>
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
								<Button variant="secondary" onClick={handleHoursCancel}>Cancel</Button>
								<Button onClick={handleHoursSave}>Save Changes</Button>
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

				{shifts && shifts.length > 0 ? (
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




