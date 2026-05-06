"use client";

import { useParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { formatHalifaxTime } from "@/utils/timeUtils";
import GeofenceMap from "@/components/UI/GeofenceMap";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import {
	Clock, MapPin, User, FileText, Undo2, Edit,
	UserCheck, AlertTriangle, Home,
	CheckCircle2, Loader, History,
} from "lucide-react";
import styles from "./shift_detail.module.css";

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
	return [addr.street, addr.city, addr.state || addr.province, addr.pinCode || addr.postalCode, addr.country]
		.filter(Boolean).join(", ") || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ShiftDetailPage() {
	const { id } = useParams();
	const router = useRouter();

	const { shiftDetail, fetchShiftError, isLoading } = useShifts(id);

	// ── Loading state ──────────────────────────────────────────────────────
	if (isLoading || (!shiftDetail && !fetchShiftError)) return (
		<PageLayout>
			<div className={styles.stateBox}>
				<Loader size={28} className={styles.spinnerIcon} />
				<p>Loading shift details…</p>
			</div>
		</PageLayout>
	);

	// ── Error state ────────────────────────────────────────────────────────
	if (fetchShiftError) return (
		<PageLayout>
			<div className={styles.stateBox}>
				<AlertTriangle size={32} className={styles.errorIcon} />
				<p>{fetchShiftError}</p>
			</div>
		</PageLayout>
	);

	const shift = shiftDetail;
	const hasHome = !!shift.home;
	const hasClient = !!shift.client;

	const mapCenter = shift.geofence?.center
		? { lat: shift.geofence.center.latitude, lng: shift.geofence.center.longitude }
		: { lat: 44.6488, lng: -63.5752 };

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
					</div>
				</div>
				<div className={styles.headerActions}>
					<Button icon={<Undo2 size={16} />} onClick={() => router.push("/scheduling")} variant="secondary">Back</Button>
					<Button icon={<Edit size={16} />} onClick={() => router.push(`/scheduling/${id}/edit`)} variant="primary">Edit</Button>
				</div>
			</div>

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
							<div className={styles.twoCol}>
								<InfoField label="Start Time">
									<p className={styles.boldVal}>{formatHalifaxTime(shift.startTime)}</p>
									<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
								</InfoField>
								<InfoField label="End Time">
									<p className={styles.boldVal}>{formatHalifaxTime(shift.endTime)}</p>
									<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
								</InfoField>
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
									<InfoField label="Home ID" value={shift.home._id || "—"} />
									{shift.home.region && <InfoField label="Region" value={shift.home.region} />}
									<InfoField label="Status" value={shift.home.isActive ? "Active" : "Inactive"} />
								</div>
								{shift.home.programTypes?.length > 0 && (
									<div style={{ marginTop: "1rem" }}>
										<p className={styles.miniLabel}>Program Types</p>
										<div className={styles.pillRow}>
											{shift.home.programTypes.map((pt) => (
												<span key={pt} className={styles.pill}>{pt}</span>
											))}
										</div>
									</div>
								)}
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

					{/* Notes */}
					<Card>
						<CardHeader>
							<span className={styles.cardTitleInner}><FileText size={15} /> Notes</span>
						</CardHeader>
						<CardContent>
							<p className={styles.notesContent}>{shift.notes || "No additional notes."}</p>
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
									{geofenceAddressStr ? (
										<InfoField label="Service Address" value={geofenceAddressStr} />
									) : (
										<InfoField label="Service Address">
											<p className={styles.emptyText}>No address recorded</p>
										</InfoField>
									)}
								</div>
								{/* Map */}
								<div className={styles.mapWrap}>
									<GeofenceMap
										center={mapCenter}
										radius={shift.geofence.radius || 100}
										height="100%"
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
													<span className={styles.adjustmentTimeVal}>{adj.actualStartTime ? formatHalifaxTime(adj.actualStartTime) : "—"}</span>
												</div>
												<div className={styles.adjustmentArrow}>→</div>
												<div className={styles.adjustmentTimeBlock}>
													<span className={styles.adjustmentTimeLabel}>Actual End</span>
													<span className={styles.adjustmentTimeVal}>{adj.actualEndTime ? formatHalifaxTime(adj.actualEndTime) : "—"}</span>
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
													Recorded {formatHalifaxTime(adj.adjustedAt)}
													{adj.adjustedBy ? ` · by ${adj.adjustedBy?.firstName ?? ""} ${adj.adjustedBy?.lastName ?? ""}`.trim() : ""}
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

		</PageLayout>
	);
}