"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useShifts } from "@/hooks/useShifts";
import { utcToFullDisplay } from "@/utils/timeHandling";
import GeofenceMap from "@/components/UI/GeofenceMap";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import Modal from "@components/UI/Modal";
import ActionMessage from "@components/UI/ActionMessage";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import {
	Clock, MapPin, User, FileText, Undo2, Edit,
	UserCheck, AlertTriangle, Home, Flag,
	CheckCircle2, Loader, History, XCircle,
	Timer, ClipboardList, CalendarDays, LogIn, LogOut, Hourglass,
} from "lucide-react";
import styles from "./shift_detail.module.css";
import { HOME_TYPE_COLORS, REGION_COLORS, COLOR_FALLBACK } from "@/utils/dropdown_list";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function personName(obj) {
	if (!obj) return "—";
	const full = `${obj.firstName || ""} ${obj.lastName || ""}`.trim();
	return full || obj.email || "—";
}

function joinAddress(addr) {
	if (!addr) return null;
	if (typeof addr === "string") return addr;
	return [addr.unit, addr.street, addr.city, addr.state || addr.province, addr.pinCode || addr.postalCode, addr.country]
		.filter(Boolean).join(", ") || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ShiftDetailPage() {
	const { id } = useParams();
	const router = useRouter();

	const [showCancelModal, setShowCancelModal] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [cancelReasonError, setCancelReasonError] = useState("");
	const [cancelSuccess, setCancelSuccess] = useState(false);

	const { shiftDetail, fetchShiftError, isShiftLoading, cancelShift, isCancelPending, cancelShiftError } = useShifts(id);

	// ── Loading & Error states ─────────────────────────────────────────────
	if (isShiftLoading || fetchShiftError || !shiftDetail) return (
		<PageLayout>
			<ErrorState isLoading={isShiftLoading || (!shiftDetail && !fetchShiftError)} errorMessage={fetchShiftError} />
		</PageLayout>
	);

	const shift = shiftDetail;
	const hasHome = !!shift.home;
	const hasClient = !!shift.client;

	const mapCenter = shift.geofence?.center
		? { lat: shift.geofence.center.latitude, lng: shift.geofence.center.longitude }
		: { lat: 44.6476, lng: -63.5728 };

	// Build address display string from geofence address or home/client address
	const geofenceAddressStr = shift.geofence?.address || null;

	const statusClass = styles[`status_${shift.status}`] || styles.status_default;

	return (
		<PageLayout>

			{/* ═══════════════════════════════════ HEADER */}
			<div className={styles.pageHeader}>
				<div>
					<div className={styles.badgeRow}>
						<span className={`${styles.statusBadge} ${statusClass}`}>
							{shift.status?.replace(/_/g, " ")}
						</span>
					</div>
					<h1>Shift Details</h1>
					<p className={styles.shiftId}>ID: {shift._id}</p>
					<div className={styles.assignedBy}>
						<UserCheck size={13} />
						<span>Assigned by <strong>{personName(shift.assignedBy)}</strong></span>
						{shift.createdAt && (
							<>
								<span className={styles.metaSep}>·</span>
								<CalendarDays size={13} />
								<span>Created <strong>{utcToFullDisplay(shift.createdAt, "America/Halifax")}</strong></span>
							</>
						)}
						{shift.updatedAt && (
							<>
								<span className={styles.metaSep}>·</span>
								<Clock size={13} />
								<span>Updated <strong>{utcToFullDisplay(shift.updatedAt, "America/Halifax")}</strong></span>
							</>
						)}
					</div>
				</div>
				<div className={styles.headerActions}>
					<Button icon={<Undo2 size={16} />} onClick={() => router.push("/scheduling")} variant="secondary">Back</Button>
					{!["cancelled", "completed", "in_progress", "missed"].includes(shift.status) && (
						<Button icon={<XCircle size={16} />} onClick={() => setShowCancelModal(true)} variant="danger">Cancel Shift</Button>
					)}
					{shift.status !== "cancelled" && (
						<Button icon={<Edit size={16} />} onClick={() => router.push(`/scheduling/${id}/edit`)} variant="primary">Edit</Button>
					)}
				</div>
			</div>

			{/* ═══════════════════════════════════ ACTION FEEDBACK */}
			<ActionMessage variant="success" message={cancelSuccess ? "Shift cancelled successfully." : null} onClose={() => setCancelSuccess(false)} />

			{/* ═══════════════════════════════════ CANCELLED BANNER */}
			{shift.status === "cancelled" && (
				<div className={styles.cancelledBanner} role="alert">
					<XCircle size={18} className={styles.cancelledBannerIcon} />
					<div className={styles.cancelledBannerBody}>
						<span className={styles.cancelledBannerTitle}>Shift Cancelled</span>
						<span className={styles.cancelledBannerMsg}>No further changes can be made to this shift.</span>
						{shift.cancelReason && (
							<span className={styles.cancelledBannerReason}>
								<span className={styles.cancelledBannerReasonLabel}>Reason:</span>
								{shift.cancelReason}
							</span>
						)}
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════ END EARLY BANNER */}
			{shift.endEarlyReason && (
				<div className={styles.endEarlyBanner} role="alert">
					<Timer size={18} className={styles.endEarlyBannerIcon} />
					<div className={styles.endEarlyBannerBody}>
						<span className={styles.endEarlyBannerTitle}>Shift Ended Early</span>
						<span className={styles.endEarlyBannerReason}>{shift.endEarlyReason}</span>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════ MAIN 2-COLUMN */}
			<div className={styles.mainRow}>

				{/* ── LEFT col: Caregiver + Client/Home + Time */}
				<div className={styles.colLeft}>

					{/* Time & Schedule */}
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><Clock size={15} /> Time &amp; Schedule</span>
						</CardHeader>
						<CardContent>
							<div className={styles.timeSlotStack}>
							<div className={styles.timeGrid}>
								<div className={`${styles.timeSlot} ${styles.tsBlue}`}>
									<div className={`${styles.timeSlotIcon} ${styles.tsBlueIcon}`}><CalendarDays size={14} /></div>
									<div className={styles.timeSlotBody}>
										<p className={`${styles.timeSlotLabel} ${styles.tsBlueLabel}`}>Scheduled Start</p>
										<p className={`${styles.timeSlotVal} ${styles.tsBlueVal}`}>{utcToFullDisplay(shift.startTime, "America/Halifax")}</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</div>
								</div>
								<div className={`${styles.timeSlot} ${styles.tsBlue}`}>
									<div className={`${styles.timeSlotIcon} ${styles.tsBlueIcon}`}><CalendarDays size={14} /></div>
									<div className={styles.timeSlotBody}>
										<p className={`${styles.timeSlotLabel} ${styles.tsBlueLabel}`}>Scheduled End</p>
										<p className={`${styles.timeSlotVal} ${styles.tsBlueVal}`}>{utcToFullDisplay(shift.endTime, "America/Halifax")}</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</div>
								</div>
							</div>

							{(shift.actualStartTime || shift.actualEndTime) && (
								<div className={styles.timeGrid}>
									<div className={`${styles.timeSlot} ${styles.tsGreen}`}>
										<div className={`${styles.timeSlotIcon} ${styles.tsGreenIcon}`}><LogIn size={14} /></div>
										<div className={styles.timeSlotBody}>
											<p className={`${styles.timeSlotLabel} ${styles.tsGreenLabel}`}>Actual Start Time</p>
											<p className={`${styles.timeSlotVal} ${styles.tsGreenVal}`}>{shift.actualStartTime ? utcToFullDisplay(shift.actualStartTime, "America/Halifax") : "—"}</p>
											<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
										</div>
									</div>
									<div className={`${styles.timeSlot} ${styles.tsGreen}`}>
										<div className={`${styles.timeSlotIcon} ${styles.tsGreenIcon}`}><LogOut size={14} /></div>
										<div className={styles.timeSlotBody}>
											<p className={`${styles.timeSlotLabel} ${styles.tsGreenLabel}`}>Actual End Time</p>
											<p className={`${styles.timeSlotVal} ${styles.tsGreenVal}`}>{shift.actualEndTime ? utcToFullDisplay(shift.actualEndTime, "America/Halifax") : "—"}</p>
											<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
										</div>
									</div>
								</div>
							)}

							{shift.hoursWorked != null && (
								<div className={`${styles.timeSlot} ${styles.tsRose}`}>
									<div className={`${styles.timeSlotIcon} ${styles.tsRoseIcon}`}><Hourglass size={14} /></div>
									<div className={styles.timeSlotBody}>
										<p className={`${styles.timeSlotLabel} ${styles.tsRoseLabel}`}>Hours Worked</p>
										<p className={`${styles.timeSlotVal} ${styles.tsRoseVal}`}>{shift.hoursWorked} hrs</p>
									</div>
								</div>
							)}

							{shift.reportingTime && (
								<div className={`${styles.timeSlot} ${styles.tsPurple}`}>
									<div className={`${styles.timeSlotIcon} ${styles.tsPurpleIcon}`}><ClipboardList size={14} /></div>
									<div className={styles.timeSlotBody}>
										<p className={`${styles.timeSlotLabel} ${styles.tsPurpleLabel}`}>Reporting Time</p>
										<p className={`${styles.timeSlotVal} ${styles.tsPurpleVal}`}>{utcToFullDisplay(shift.reportingTime, "America/Halifax")}</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</div>
								</div>
							)}
							</div>
						</CardContent>
					</Card>

					{/* Caregiver */}
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><User size={15} /> Caregiver</span>
						</CardHeader>
						<CardContent>
							<div className={styles.personGrid}>
								<InfoField label="Name" value={personName(shift.caregiver)} />
								{shift.caregiver?.email && <InfoField label="Email" value={shift.caregiver.email} />}
								{shift.caregiver?.employeeId && <InfoField label="Employee ID" value={shift.caregiver.employeeId} />}
							</div>
						</CardContent>
					</Card>

					{/* Client OR Home */}
					{hasClient && (
						<Card>
							<CardHeader>
								<span className={styles.cardTitleInner}><User size={15} /> Client</span>
							</CardHeader>
							<CardContent>
								<div className={styles.personGrid}>
									<InfoField label="Name" value={personName(shift.client)} />
									{shift.client?.email && <InfoField label="Email" value={shift.client.email} />}
									{shift.client?.clientId && <InfoField label="Client ID" value={shift.client.clientId} />}
								</div>
							</CardContent>
						</Card>
					)}

					{hasHome && (
						<Card>
							<CardHeader>
								<span className={styles.cardTitleInner}><Home size={15} /> Home</span>
							</CardHeader>
							<CardContent>
								<div className={styles.personGrid}>
									<InfoField label="Home Name" value={shift.home.name || "—"} />
									{shift.home.region && (
										<InfoField label="Region">
											{(() => { const c = REGION_COLORS[shift.home.region] ?? COLOR_FALLBACK; return <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap" }}>{shift.home.region}</span>; })()}
										</InfoField>
									)}
									<InfoField label="Status">
										<span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", ...(shift.home.isActive ? { background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46" } : { background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" }) }}>
											{shift.home.isActive ? "Active" : "Inactive"}
										</span>
									</InfoField>
									{shift.home.homeType && (
										<InfoField label="Home Type">
											{(() => { const c = HOME_TYPE_COLORS[shift.home.homeType] ?? COLOR_FALLBACK; return <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap" }}>{shift.home.homeType}</span>; })()}
										</InfoField>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{!hasClient && !hasHome && (
						<Card>
							<CardHeader><span className={styles.cardTitleInner}><User size={15} /> Assignment</span></CardHeader>
							<CardContent><p className={styles.emptyText}>No client or home assigned.</p></CardContent>
						</Card>
					)}
				</div>

				{/* ── RIGHT col: Tasks + Notes */}
				<div className={styles.colRight}>

					{/* Shift Tasks */}
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><CheckCircle2 size={15} /> Shift Tasks</span>
						</CardHeader>
						<CardContent>
							{shift.tasks?.length > 0 ? (
								<div className={styles.taskList}>
									{shift.tasks.map((task, i) => (
										<div key={i} className={styles.taskItem}>
											<span className={`${styles.taskIndex} ${task.completed ? styles.taskIndexDone : ""}`}>{i + 1}</span>
											<p className={styles.taskName}
												style={{ textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "#9ca3af" : undefined }}>
												{task.description || task.title || task.name}
											</p>
											{task.completed && <span className={styles.doneBadge}>Done</span>}
										</div>
									))}
								</div>
							) : (
								<p className={styles.emptyText}>No tasks assigned.</p>
							)}
						</CardContent>
					</Card>

					{/* Shift Flags */}

					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><Flag size={15} /> Shift Flags</span>
						</CardHeader>
						<CardContent>
							{shift.flags?.length > 0 ? (
								<div className={styles.flagList}>
									{shift.flags.map((flag) => (
										<div key={flag} className={styles.flagItem}>
											<AlertTriangle size={15} className={styles.flagIcon} />
											<span className={styles.flagText}>
												{flag.replace(/_/g, " ")}
											</span>
										</div>
									))}
								</div>
							) : (
								<p className={styles.emptyText}>No flags assigned.</p>
							)}
						</CardContent>
					</Card>


					{/* Notes */}
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><FileText size={15} /> Notes</span>
						</CardHeader>
						<CardContent>
							{shift.notes ? (
								<p className={styles.notesContent}>{shift.notes}</p>
							) : (
								<p className={styles.emptyText}>No notes added.</p>
							)}
						</CardContent>
					</Card>

				</div>
			</div>

			{/* ═══════════════════════════════════ SERVICE LOCATION */}
			<div style={{ marginTop: "1.5rem" }}>
				<Card>
					<CardHeader>
						<span className={styles.cardTitleInner}><MapPin size={15} /> Service Location</span>
					</CardHeader>
					<CardContent>
						{shift.geofence ? (
							<div className={styles.locationLayout}>
								{/* Address info panel */}
								<div className={styles.locationInfo}>
									{geofenceAddressStr && (
										<div className={`${styles.addrBlock} ${styles.addrBlockBlue}`}>
											<div className={styles.addrBlockIcon}><MapPin size={13} /></div>
											<div>
												<p className={styles.addrBlockLabel}>Service Address</p>
												<p className={styles.addrBlockVal}>{geofenceAddressStr}</p>
											</div>
										</div>
									)}
									{shift.startLocation?.address && (
										<div className={`${styles.addrBlock} ${styles.addrBlockGreen}`}>
											<div className={styles.addrBlockIcon}><LogIn size={13} /></div>
											<div>
												<p className={styles.addrBlockLabel}>Clock In Address</p>
												<p className={styles.addrBlockVal}>{shift.startLocation.address}</p>
											</div>
										</div>
									)}
									{shift.endLocation?.address && (
										<div className={`${styles.addrBlock} ${styles.addrBlockRed}`}>
											<div className={styles.addrBlockIcon}><LogOut size={13} /></div>
											<div>
												<p className={styles.addrBlockLabel}>Clock Out Address</p>
												<p className={styles.addrBlockVal}>{shift.endLocation.address}</p>
											</div>
										</div>
									)}
									{!geofenceAddressStr && !shift.startLocation?.address && !shift.endLocation?.address && (
										<p className={styles.emptyText}>No address recorded.</p>
									)}
								</div>
								{/* Map */}
								<div className={styles.mapWrap}>
									<GeofenceMap
										center={mapCenter}
										radius={shift.geofence.radius || 100}
										height="300px"
										clockInLocation={shift.startLocation ?? null}
										clockOutLocation={shift.endLocation ?? null}
									/>
								</div>
							</div>
						) : (
							<p className={styles.emptyText}>No location data available for this shift.</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* ═══════════════════════════════════ HOURS ADJUSTMENTS */}
			{shift.hoursAdjustments?.length > 0 && (
				<div style={{ marginTop: "1.5rem" }}>
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><History size={15} /> Hours Adjustments</span>
						</CardHeader>
						<CardContent>
							<div className={styles.adjustmentList}>
								{shift.hoursAdjustments.map((adj, i) => (
									<div key={i} className={styles.adjustmentRow}>
										<div className={styles.adjustmentIndex}>{i + 1}</div>
										<div className={styles.adjustmentBody}>
											<div className={styles.adjustmentTimes}>
												<div className={styles.adjustmentTimeBlock}>
													<span className={styles.adjustmentTimeLabel}>Actual Start</span>
													<span className={styles.adjustmentTimeVal}>{adj.actualStartTime ? utcToFullDisplay(adj.actualStartTime, "America/Halifax") : "—"}</span>
												</div>
												<div className={styles.adjustmentArrow}>→</div>
												<div className={styles.adjustmentTimeBlock}>
													<span className={styles.adjustmentTimeLabel}>Actual End</span>
													<span className={styles.adjustmentTimeVal}>{adj.actualEndTime ? utcToFullDisplay(adj.actualEndTime, "America/Halifax") : "—"}</span>
												</div>
											</div>
											{adj.reason && (
												<p className={styles.adjustmentReason}>
													<span className={styles.adjustmentReasonLabel}>Reason: </span>
													{adj.reason}
												</p>
											)}
											{adj.adjustedAt && (
												<p className={styles.adjustmentMeta}>
													Recorded {utcToFullDisplay(adj.adjustedAt, "America/Halifax")}
													{adj.adjustedBy ? ` · by ${adj.adjustedBy}` : ""}
												</p>
											)}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* ═══════════════════════════════════ CANCEL MODAL */}
			<Modal isOpen={showCancelModal} onClose={() => { setShowCancelModal(false); setCancelReason(""); }}>
				<div className={styles.cancelModal}>
					<div className={styles.cancelModalIcon}>
						<XCircle size={32} strokeWidth={1.5} />
					</div>
					<h2 className={styles.cancelModalTitle}>Cancel Shift</h2>
					<p className={styles.cancelModalDesc}>
						Are you sure you want to cancel this shift? This action cannot be undone.
					</p>

					<ActionMessage variant="error" message={cancelShiftError} />

					<div className={styles.cancelReasonField}>
						<label className={styles.cancelReasonLabel} htmlFor="cancel_reason">
							Reason <span style={{ color: "#dc2626" }}>*</span>
						</label>
						<textarea
							id="cancel_reason"
							className={`${styles.cancelReasonTextarea} ${cancelReasonError ? styles.cancelReasonTextareaError : ""}`}
							rows={3}
							placeholder="Enter a reason for cancellation…"
							value={cancelReason}
							onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelReasonError(""); }}
						/>
						{cancelReasonError && (
							<span className={styles.cancelReasonErrorMsg}>{cancelReasonError}</span>
						)}
					</div>

					<div className={styles.cancelModalActions}>
						<Button
							variant="secondary"
							onClick={() => { setShowCancelModal(false); setCancelReason(""); setCancelReasonError(""); }}
							disabled={isCancelPending}
						>
							Keep Shift
						</Button>
						<Button
							variant="danger"
							icon={isCancelPending ? <Loader size={15} className={styles.spinnerIcon} /> : <XCircle size={15} />}
							disabled={isCancelPending}
							onClick={async () => {
								if (!cancelReason.trim()) {
									setCancelReasonError("Please provide a reason for cancellation.");
									return;
								}
								try {
									await cancelShift({ id, reason: cancelReason });
									setShowCancelModal(false);
									setCancelReason("");
									setCancelReasonError("");
									setCancelSuccess(true);
								} catch (_) {
									// cancelShiftError is populated by React Query and shown in the modal
								}
							}}
						>
							{isCancelPending ? "Cancelling…" : "Cancel Shift"}
						</Button>
					</div>
				</div>
			</Modal>

		</PageLayout>
	);
}