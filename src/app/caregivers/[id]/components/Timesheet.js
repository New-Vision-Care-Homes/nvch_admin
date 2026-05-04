import React, { useState, useEffect } from "react";
import { SquarePen, Calendar, Clock, Plus, Trash2 } from "lucide-react";
import styles from "./Timesheet.module.css";
import { Table, TableContent, TableCell, TableHeader } from "@components/UI/Table";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { Card, CardHeader, CardContent, InputFieldLR, InfoField } from "@components/UI/Card";
import { useParams, useRouter } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useHours } from "@/hooks/useHours";
import { useProfile } from "@/hooks/useProfile";
import { utcToFullDisplay } from "@/utils/timeHandling";


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];



// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups a flat array of availability slots (from the backend) into a
 * day-keyed structure ordered by DAYS_ORDER. Days with no slots get an
 * empty array so all seven days always appear in the UI.
 *
 * Input  (backend flat array):
 *   [{ day: "monday", startTime: "09:00", endTime: "13:00", ... }, ...]
 *
 * Output (grouped array):
 *   [{ day: "Monday", slots: [{ ... }] }, { day: "Tuesday", slots: [] }, ...]
 */
const groupAvailabilityByDay = (availabilityArray) => {
	// Seed every day with an empty slots array so all days are always rendered.
	const grouped = Object.fromEntries(DAYS_ORDER.map(day => [day, []]));

	availabilityArray.forEach(slot => {
		// Normalize casing: "monday" → "Monday"
		const dayName = slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase();
		if (grouped[dayName]) {
			grouped[dayName].push(slot);
		}
	});

	return DAYS_ORDER.map(day => ({ day, slots: grouped[day] }));
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Timesheet() {

	// ── Route Params & Navigation ───────────────────────────────────────────
	const { id } = useParams(); // Caregiver ID from the URL.
	const [status, setStatus] = useState(null); // { variant, text }

	// =========================================================================
	// CAREGIVER RELATED DATA & FUNCTIONS
	// =========================================================================
	// The following hooks and states manage caregiver-specific information,
	// such as their availability schedule and their work capacity (max hours).

	// 1. Caregiver Details Hook
	// Fetches the caregiver's profile data and provides the update function.
	const {
		caregiverDetail,
		isCaregiverLoading,
		caregiverFetchError,
		isCaregiverActionPending,
		caregiverActionError,
		updateCaregiver,
	} = useCaregivers(id);

	// 2. Caregiver Hours Hook
	// Fetches the caregiver's recorded hours and overtime data.
	const {
		hours,
		isHoursLoading,
		hourFetchError,
	} = useHours(id);

	// use user profile to get the timezone
	const { profile } = useProfile();

	// 3. Caregiver Local States
	// `availability` holds the live (possibly edited) schedule slots in the UI.
	// `originalAvailability` is kept to revert edits if the user clicks "Cancel".
	const [availability, setAvailability] = useState([]);
	const [originalAvailability, setOriginalAvailability] = useState([]);

	// `maxHours` and `lastPeriodHours` are used in the Work Capacity modal.
	// Similarly, original* values allow us to revert unsaved changes.
	const [maxHours, setMaxHours] = useState(0);
	const [originalMaxHours, setOriginalMaxHours] = useState(0);


	// =========================================================================
	// MODAL & UI STATES
	// =========================================================================
	// States to control whether specific popups/modals are currently visible.
	const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false); // Caregiver related
	const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);               // Caregiver related



	// =========================================================================
	// INITIAL DATA SYNC (CAREGIVER)
	// =========================================================================
	// Sync caregiver data from the backend into our local state variables once it has loaded.
	useEffect(() => {
		if (!caregiverDetail) return;

		const backendAvailability = caregiverDetail.availability || [];
		setAvailability(backendAvailability);
		setOriginalAvailability(backendAvailability);

		const backendMaxHours = caregiverDetail.biWeeklyWorkCapacity?.maxHours ?? 84;
		setMaxHours(backendMaxHours);
		setOriginalMaxHours(backendMaxHours);
	}, [caregiverDetail]);


	// =========================================================================
	// CAREGIVER EVENT HANDLERS (Availability & Work Capacity)
	// =========================================================================

	// --- Availability Handlers ---

	// Reverts any unsaved edits to availability and closes the modal.
	const handleAvailabilityCancel = () => {
		setAvailability(originalAvailability);
		setIsAvailabilityModalOpen(false);
	};

	// Persists the edited availability schedule to the backend via `updateCaregiver`.
	const handleAvailabilitySave = () => {
		setIsAvailabilityModalOpen(false);
		updateCaregiver(
			{ id, data: { ...caregiverDetail, availability: availability } },
			{
				onSuccess: () => {
					setOriginalAvailability(availability);
					setStatus({ variant: "success", text: "Caregiver's availability updated successfully!" });
				},
				onError: () => {
					setStatus({ variant: "error", text: caregiverActionError || "Failed to update caregiver's availability." });
				},
			}
		);
	};

	/**
	 * Updates the startTime or endTime of a single availability slot.
	 * @param {number} slotIndex - Index in the flat `availability` array.
	 * @param {"start"|"end"} field - Which time field to update (start or end).
	 * @param {string} value - New time value in "HH:MM" format.
	 */
	const handleTimeChange = (slotIndex, field, value) => {
		const updated = [...availability];
		updated[slotIndex][field === "start" ? "startTime" : "endTime"] = value;
		setAvailability(updated);
	};

	// Appends a new default slot for the given day name.
	const handleAddSlot = (dayName) => {
		setAvailability([
			...availability,
			{ day: dayName.toLowerCase(), startTime: "09:00", endTime: "17:00", isAvailable: true, notes: "" },
		]);
	};

	// Removes the slot at the given flat array index.
	const handleRemoveSlot = (slotIndex) => {
		setAvailability(availability.filter((_, i) => i !== slotIndex));
	};


	// --- Work Capacity (Hours) Handlers ---

	// Reverts any unsaved edits to the working hours and closes the modal.
	const handleHoursCancel = () => {
		setMaxHours(originalMaxHours);
		setIsHoursModalOpen(false);
	};

	// Persists the edited hours to the backend.
	const handleHoursSave = () => {
		setIsHoursModalOpen(false);
		updateCaregiver(
			{
				id,
				data: {
					...caregiverDetail,
					biWeeklyWorkCapacity: {
						...caregiverDetail.biWeeklyWorkCapacity,
						maxHours: Number(maxHours)
					}
				}
			},
			{
				onSuccess: () => {
					setOriginalMaxHours(maxHours);
					setStatus({ variant: "success", text: "Caregiver's max hours updated successfully!" });
				},
				onError: () => {
					setStatus({ variant: "error", text: caregiverActionError || "Failed to update caregiver's max hours." });
				},
			}
		);
	};


	// ─────────────────────────────────────────────────────────────────────────
	// DERIVED STATE
	// ─────────────────────────────────────────────────────────────────────────

	// Re-group whenever the flat availability array changes so the UI always
	// reflects the latest edits.
	const groupedAvailability = groupAvailabilityByDay(availability);



	if (isHoursLoading || hourFetchError || isCaregiverLoading || caregiverFetchError) {
		return (
			<ErrorState
				isLoading={isHoursLoading || isCaregiverLoading}
				errorMessage={hourFetchError || caregiverFetchError}
				onRetry={() => window.location.reload()}
			/>
		);
	}


	// ─────────────────────────────────────────────────────────────────────────
	// RENDER
	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div className={styles.container}>

			<div className={styles.topHeader}>
				<h2 className={styles.pageTitle}>Timesheet Overview</h2>
			</div>

			<ActionMessage variant={status?.variant} message={status?.text} />

			{/* ── Top section: Availability card + Work Capacity card + Stats ── */}
			<div className={styles.topSection}>

				{/* Availability card — shows grouped weekly availability slots */}
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
													{slot.startTime} – {slot.endTime}
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

				{/* Right column: Work Capacity card + quick-stat cards */}
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
							<InfoField label="Bi-weekly Max Hours" value={`${caregiverDetail?.biWeeklyWorkCapacity?.maxHours ?? 84} hours`} />
						</CardContent>
					</Card>

					{/* Quick-stat cards sourced from the useHours hook */}
					<div className={styles.statsGrid}>
						<Card className={styles.statCard}>
							<div className={styles.statLabel}>Total Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalHours ?? "N/A"}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.pending}`}>
							<div className={styles.statLabel}>Worked Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.currentHours ?? "N/A"}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.overtime}`}>
							<div className={styles.statLabel}>Other Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.otherHours ?? "N/A"}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
					</div>
				</div>
			</div>


			{/* ── Modal 1: Edit Availability ─────────────────────────────────── */}
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
												// Find the flat index so handleTimeChange and handleRemoveSlot
												// can update the correct entry in the `availability` array.
												const flatIndex = availability.findIndex(
													(s) =>
														s.day.toLowerCase() === dayItem.day.toLowerCase() &&
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
														<Button
															variant="ghost"
															size="icon"
															className={styles.removeBtn}
															onClick={() => handleRemoveSlot(flatIndex)}
														>
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


			{/* ── Modal 2: Edit Work Hours ───────────────────────────────────── */}
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
									Set the maximum bi-weekly hours for this caregiver.
								</p>
								<InputFieldLR
									label="Max Hours (Bi-weekly)"
									type="number"
									value={maxHours}
									placeholder={84 + " (Default)"}
									onChange={(e) => setMaxHours(e.target.value)}
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

			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>Pay Periods</h3>
				{hours?.payPeriods?.length > 0 && (
					<span className={styles.sectionCount}>{hours.payPeriods.length} period{hours.payPeriods.length !== 1 ? "s" : ""}</span>
				)}
			</div>

			<div className={styles.scrollableTable}>
				<Table>
					<TableHeader>
						<TableCell>Period Start</TableCell>
						<TableCell>Period End</TableCell>
						<TableCell>Total Hours</TableCell>
						<TableCell>Hours Worked</TableCell>
						<TableCell>Other Hours</TableCell>
					</TableHeader>

					{hours?.payPeriods && hours.payPeriods.length > 0 ? (
						hours.payPeriods.map((period, idx) => (
							<TableContent key={idx}>
								<TableCell>{utcToFullDisplay(period.periodStart, profile?.timezone || "America/Halifax")}</TableCell>
								<TableCell>{utcToFullDisplay(period.periodEnd, profile?.timezone || "America/Halifax")}</TableCell>
								<TableCell>
									<span className={styles.hoursNum}>{period.totalHours ?? "—"}</span>
									<span className={styles.hoursUnit}> hrs</span>
								</TableCell>
								<TableCell>
									<span className={styles.hoursNum}>{period.hours ?? "—"}</span>
									<span className={styles.hoursUnit}> hrs</span>
								</TableCell>
								<TableCell>
									<span className={styles.hoursNum}>{period.otherHours ?? "—"}</span>
									<span className={styles.hoursUnit}> hrs</span>
								</TableCell>
							</TableContent>
						))
					) : (
						<TableContent>
							<TableCell colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
								No pay periods found for this caregiver.
							</TableCell>
						</TableContent>
					)}
				</Table>
			</div>

		</div>
	);
}




