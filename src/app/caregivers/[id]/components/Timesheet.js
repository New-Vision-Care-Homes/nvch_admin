import React, { useState, useEffect } from "react";
import { SquarePen, Calendar, Clock, Plus, Trash2, ExternalLink } from "lucide-react";
import styles from "./Timesheet.module.css";
import { Table, TableContent, TableCell, TableHeader } from "@components/UI/Table";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import ActionMessage from "@components/UI/ActionMessage";
import { Card, CardHeader, CardContent, InputFieldLR, InfoField } from "@components/UI/Card";
import { useParams, useRouter } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useShifts } from "@/hooks/useShifts";
import { useHours } from "@/hooks/useHours";
import { useProfile } from "@/hooks/useProfile";
import { utcToFullDisplay } from "@/utils/timeHandling";
import ReactPaginate from "react-paginate";


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ITEMS_PER_PAGE = 5;

// Shift status options used in the <select> dropdown in the shifts table.
const SHIFT_STATUS_OPTIONS = [
	{ value: "scheduled", label: "Scheduled" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "completed", label: "Completed" },
	{ value: "cancelled", label: "Cancelled" },
];


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

/**
 * Formats an ISO date string to a short date like "Apr 5, 2025".
 * Returns "N/A" when the input is falsy.
 */
const formatDateOnly = (isoString) => {
	if (!isoString) return "N/A";
	return new Date(isoString).toLocaleDateString("en-US", {
		month: "short", day: "numeric", year: "numeric",
	});
};

/**
 * Formats an ISO date string to a 12-hour time like "9:00 AM".
 * Returns "N/A" when the input is falsy.
 */
const formatTimeOnly = (isoString) => {
	if (!isoString) return "N/A";
	return new Date(isoString).toLocaleTimeString("en-US", {
		hour: "numeric", minute: "2-digit", hour12: true,
	});
};

/**
 * Converts a snake_case or lowercase status string to Title Case for display.
 * Example: "in_progress" → "In Progress"
 */
const formatStatusLabel = (status = "") =>
	status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Timesheet() {

	// ── Route Params & Navigation ───────────────────────────────────────────
	const { id } = useParams(); // Caregiver ID from the URL.
	const router = useRouter(); // Used for navigating to other pages (e.g. shift detail page).

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
		isCaregiverActionPending,
		caregiverActionError,
		updateCaregiver,
	} = useCaregivers(id);

	// 2. Caregiver Hours Hook
	// Fetches the caregiver's recorded hours and overtime data.
	const {
		hours,       // Contains { maxHours, currentPeriod, previousPeriod }
		hourHistory,
		updateCompletedHour,
		isLoading: isHoursLoading,
		error: hoursError,
	} = useHours(id);
	console.log("hourHistory", hourHistory);

	// use user profile to get the timezone
	const { profile } = useProfile();

	// 3. Caregiver Local States
	// `availability` holds the live (possibly edited) schedule slots in the UI.
	// `originalAvailability` is kept to revert edits if the user clicks "Cancel".
	const [availability, setAvailability] = useState([]);
	const [originalAvailability, setOriginalAvailability] = useState([]);

	// `maxHours` and `lastPeriodHours` are used in the Work Capacity modal.
	// Similarly, original* values allow us to revert unsaved changes.
	const [maxHours, setMaxHours] = useState(80);
	const [originalMaxHours, setOriginalMaxHours] = useState(80);
	const [lastPeriodHours, setLastPeriodHours] = useState(72);
	const [originalLastPeriodHours, setOriginalLastPeriodHours] = useState(72);


	// =========================================================================
	// SHIFT RELATED DATA & FUNCTIONS
	// =========================================================================
	// The following hooks and states are strictly related to the shifts table,
	// managing the display, status updates, and pagination of shifts.

	const [currentPage, setCurrentPage] = useState(1);

	// 1. Shifts Fetching Hook
	// Retrieves the shifts specifically assigned to this caregiver, paginated.
	const {
		shifts,
		totalPages,
		fetchShiftError,
		actionShiftError,
		isShiftLoading,
		isShiftActionPending,
		updateShift,
		refetch,
	} = useShifts({ params: { caregiverId: id, page: currentPage, limit: ITEMS_PER_PAGE } });


	// =========================================================================
	// MODAL & UI STATES
	// =========================================================================
	// States to control whether specific popups/modals are currently visible.
	const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false); // Caregiver related
	const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);               // Caregiver related
	const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);             // Shift related

	// Stores { shiftId, newStatus } temporarily while the shift confirmation modal is open.
	const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
	// Stores success/error messages after actions (like updating a shift).
	const [actionMsg, setActionMsg] = useState(null);


	// =========================================================================
	// INITIAL DATA SYNC (CAREGIVER)
	// =========================================================================
	// Sync caregiver data from the backend into our local state variables once it has loaded.
	useEffect(() => {
		if (!caregiverDetail) return;

		const backendAvailability = caregiverDetail.availability || [];
		setAvailability(backendAvailability);
		setOriginalAvailability(backendAvailability);

		const mh = caregiverDetail.maxHours || 80;
		const lph = caregiverDetail.lastPeriodHours || 72;
		setMaxHours(mh); setOriginalMaxHours(mh);
		setLastPeriodHours(lph); setOriginalLastPeriodHours(lph);
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
					alert("✅ Availability updated successfully!");
				},
				onError: () => {
					alert(caregiverActionError);
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
		setLastPeriodHours(originalLastPeriodHours);
		setIsHoursModalOpen(false);
	};

	// Persists the edited hours to the backend.
	const handleHoursSave = () => {
		setIsHoursModalOpen(false);
		updateCaregiver(
			{ id, data: { ...caregiverDetail, employeeId: id, maxHours: Number(maxHours), lastPeriodHours: Number(lastPeriodHours) } },
			{
				onSuccess: () => {
					setOriginalMaxHours(maxHours);
					setOriginalLastPeriodHours(lastPeriodHours);
					alert("✅ Hours updated successfully!");
				},
				onError: () => {
					alert(caregiverActionError);
				},
			}
		);
	};


	// =========================================================================
	// SHIFT EVENT HANDLERS (Status updates & Pagination)
	// =========================================================================

	// Opens the confirmation modal before actually mutating a shift's status in the db.
	const handleStatusChangeRequest = (shiftId, newStatus) => {
		setPendingStatusUpdate({ shiftId, newStatus });
		setIsStatusModalOpen(true);
	};

	// Discards the pending status change and closes the shift status confirmation modal.
	const handleStatusCancel = () => {
		setPendingStatusUpdate(null);
		setIsStatusModalOpen(false);
	};

	// Commits the currently pending shift status change to the backend API.
	const handleStatusConfirm = () => {
		if (!pendingStatusUpdate) return;
		const { shiftId, newStatus } = pendingStatusUpdate;

		setActionMsg(null); // Clear any previous success/error messages
		updateShift({ id: shiftId, data: { status: newStatus } })
			.then(() => {
				setPendingStatusUpdate(null);
				setIsStatusModalOpen(false);
				setActionMsg({ variant: "success", text: "Successfully updated shift status." });
				refetch(); // Re-fetch shifts so the shifts table reflects the new database state.
			})
			.catch((err) => {
				const errorTxt = err?.response?.data?.message || err.message || "Failed to update shift status.";
				setActionMsg({ variant: "error", text: errorTxt });
				setPendingStatusUpdate(null);
				setIsStatusModalOpen(false);
			});
	};

	// Handles pagination for the Shifts Table.
	// Note: ReactPaginate uses a 0-based page index; our API uses a 1-based index limit.
	const handlePageClick = (event) => {
		setCurrentPage(event.selected + 1);
	};


	// ─────────────────────────────────────────────────────────────────────────
	// DERIVED STATE
	// ─────────────────────────────────────────────────────────────────────────

	// Re-group whenever the flat availability array changes so the UI always
	// reflects the latest edits.
	const groupedAvailability = groupAvailabilityByDay(availability);


	// ─────────────────────────────────────────────────────────────────────────
	// EARLY RETURNS — loading & error states from hooks
	// ─────────────────────────────────────────────────────────────────────────
	// NOTE: We rely on the loading/error values exposed by each hook rather
	// than defining separate local state variables. This avoids duplication
	// and keeps the source of truth in one place.

	if (isShiftLoading || isHoursLoading || isCaregiverLoading) {
		return <div className={styles.container}><p>Loading…</p></div>;
	}

	/*
	if (fetchShiftError || hoursError) {
		const message = fetchShiftError?.message
			|| hoursError?.message
			|| "An error occurred.";
		return <div className={styles.container}><p className={styles.errorText}>{message}</p></div>;
	}

	*/

	// ─────────────────────────────────────────────────────────────────────────
	// RENDER
	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div className={styles.container}>

			<div className={styles.topHeader}>
				<h2 className={styles.pageTitle}>Timesheet Overview</h2>
			</div>

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
								disabled={true}
								className={styles.headerBtn}
								icon={<SquarePen size={14} />}
								onClick={() => setIsHoursModalOpen(true)}
							>
								Edit
							</Button>
						</CardHeader>
						<CardContent className={styles.capacityContent}>
							<InfoField label="Bi-weekly Max Hours" value={`${hours?.maxHours ?? "N/A"} hours`} />
							<InfoField label="Last Period Total" value={`${hours?.previousPeriod?.totalHours ?? "N/A"} hours`} />
						</CardContent>
					</Card>

					{/* Quick-stat cards sourced from the useHours hook */}
					<div className={styles.statsGrid}>
						<Card className={styles.statCard}>
							<div className={styles.statLabel}>Current Hours</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalHours ?? "N/A"}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.overtime}`}>
							<div className={styles.statLabel}>Overtime</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.totalOvertime ?? "N/A"}</div>
							<div className={styles.statUnit}>Hours</div>
						</Card>
						<Card className={`${styles.statCard} ${styles.pending}`}>
							<div className={styles.statLabel}>Pending</div>
							<div className={styles.statValue}>{hours?.currentPeriod?.pendingApprovals ?? "N/A"}</div>
							<div className={styles.statUnit}>Approvals</div>
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
									Set the maximum bi-weekly hours and record the last period&apos;s total hours for this caregiver.
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


			{/* ── Shifts table ───────────────────────────────────────────────── */}
			{actionMsg && (
				<div style={{ marginBottom: "1rem" }}>
					<ActionMessage variant={actionMsg.variant} message={actionMsg.text} onClose={() => setActionMsg(null)} />
				</div>
			)}
			<Table>
				<TableHeader>
					<TableCell>Period Start</TableCell>
					<TableCell>Period End</TableCell>
					<TableCell>Total Hours</TableCell>
					<TableCell>Hours Worked</TableCell>
					<TableCell>Other Hours</TableCell>
				</TableHeader>

				{hourHistory?.payPeriods && hourHistory.payPeriods.length > 0 ? (
					hourHistory.payPeriods.map((period) => {

						return (
							<TableContent>
								<TableCell>{utcToFullDisplay(period.periodStart, profile?.timezone || "America/Halifax")}</TableCell>
								<TableCell>{utcToFullDisplay(period.periodEnd, profile?.timezone || "America/Halifax")}</TableCell>
								<TableCell>{period.totalHours}</TableCell>
								<TableCell>{period.hours}</TableCell>
								<TableCell>{period.otherHours}</TableCell>
							</TableContent>
						);
					})
				) : (
					<TableContent>
						<TableCell colSpan={9} style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
							No shifts found for this caregiver.
						</TableCell>
					</TableContent>
				)}
			</Table>

			{/* Pagination — only rendered when there is more than one page */}
			{totalPages > 1 && (
				<ReactPaginate
					pageCount={Math.max(totalPages, 1)}
					forcePage={currentPage - 1}
					onPageChange={handlePageClick}
					pageRangeDisplayed={3}
					marginPagesDisplayed={1}
					previousLabel="Prev"
					nextLabel="Next"
					containerClassName={styles.pagination}
					pageClassName={styles.pageItem}
					pageLinkClassName={styles.pageLink}
					previousClassName={styles.pageItem}
					previousLinkClassName={styles.pageLink}
					nextClassName={styles.pageItem}
					nextLinkClassName={styles.pageLink}
					activeClassName={styles.active}
				/>
			)}


			{/* ── Modal 3: Confirm shift status change ───────────────────────── */}
			<Modal isOpen={isStatusModalOpen} onClose={handleStatusCancel}>
				<Card className={styles.modalCard}>
					<CardHeader>Confirm Status Update</CardHeader>
					<CardContent>
						<p style={{ margin: 0, fontSize: "0.95rem", color: "#374151", marginBottom: "1.5rem" }}>
							Are you sure you want to change the status of this shift to{" "}
							<strong>{formatStatusLabel(pendingStatusUpdate?.newStatus)}</strong>?
						</p>
						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleStatusCancel} disabled={isShiftActionPending}>
								Cancel
							</Button>
							<Button variant="primary" onClick={handleStatusConfirm} disabled={isShiftActionPending}>
								{isShiftActionPending ? "Updating…" : "Confirm Update"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</Modal>

		</div>
	);
}




