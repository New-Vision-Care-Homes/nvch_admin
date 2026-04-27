"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { useJsApiLoader } from "@react-google-maps/api";
import GeofenceMap from "@/components/UI/GeofenceMap";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import { formatHalifaxTime, toHalifaxInputValue } from "@/utils/timeUtils";
import {
	Clock, MapPin, User, ShieldCheck, Phone,
	FileText, Undo2, CheckCircle2, ChevronRight,
	Mail, Hash, Edit, Save, X, Plus, Trash2,
	UserCheck, AlertTriangle,
} from "lucide-react";
import styles from "./shift_detail.module.css";

// Stable reference — must live outside the component
const GOOGLE_LIBRARIES = ["places", "geometry"];

// ─────────────────────────────────────────────────────────────────────────────
export default function ShiftDetailPage() {
	const { id } = useParams();
	const router = useRouter();

	const {
		shiftDetail,
		isShiftActionPending,
		fetchShiftError,
		actionShiftError,
		updateShift,
	} = useShifts(id);

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({});
	const [saveError, setSaveError] = useState(null);

	// ── Load Google Maps API (shared by GeofenceMap + AddressAutocomplete) ────
	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
		libraries: GOOGLE_LIBRARIES,
	});

	// Imperative refs into the GeofenceMap's internal instances
	// so we can pan/update marker from the parent when the address changes.
	const mapRefsRef = useRef(null);

	const handleMapReady = useCallback((refs) => {
		mapRefsRef.current = refs;
	}, []);

	// ── Address selected in edit mode ─────────────────────────────────────────
	const handleAddressSelect = useCallback((data) => {
		const { street, city, state, postalCode, latitude, longitude } = data;

		setFormData(prev => ({
			...prev,
			clientAddress: [street, city, state, postalCode].filter(Boolean).join(", ") || prev.clientAddress,
			geofence: {
				...prev.geofence,
				center: latitude && longitude
					? { latitude, longitude }
					: prev.geofence?.center,
			},
		}));

		// Imperatively pan the map
		if (latitude && longitude && mapRefsRef.current) {
			const newCenter = { lat: latitude, lng: longitude };
			const { mapInstance, marker, circle } = mapRefsRef.current;
			mapInstance?.panTo(newCenter);
			mapInstance?.setZoom(15);
			marker?.setPosition(newCenter);
			circle?.setCenter(newCenter);
		}
	}, []);

	// ── Populate formData from shiftDetail (on load & on cancel-edit) ─────────
	useEffect(() => {
		if (shiftDetail && !isEditing) {
			setFormData({
				clientAddress: shiftDetail.clientAddress || "",
				contactPerson: {
					name: shiftDetail.contactPerson?.name || "",
					phone: shiftDetail.contactPerson?.phone || "",
					email: shiftDetail.contactPerson?.email || "",
				},
				startTime: toHalifaxInputValue(shiftDetail.startTime),
				endTime: toHalifaxInputValue(shiftDetail.endTime),
				geofence: {
					center: {
						latitude: shiftDetail.geofence?.center?.latitude || 0,
						longitude: shiftDetail.geofence?.center?.longitude || 0,
					},
					radius: shiftDetail.geofence?.radius || 500,
					shape: shiftDetail.geofence?.shape || "circle",
				},
				tasks: shiftDetail.tasks?.map(t => ({ ...t })) ?? [],
				notes: shiftDetail.notes || "",
			});
		}
	}, [shiftDetail, isEditing]);

	// ── Guards ────────────────────────────────────────────────────────────────
	if (fetchShiftError) return (
		<PageLayout>
			<div className={styles.stateBox}>
				<AlertTriangle size={32} className={styles.errorIcon} />
				<p>{fetchShiftError}</p>
			</div>
		</PageLayout>
	);

	if (!shiftDetail) return (
		<PageLayout>
			<div className={styles.stateBox}>
				<div className={styles.spinner} />
				<p>Loading shift details…</p>
			</div>
		</PageLayout>
	);

	const shift = shiftDetail;
	const statusClass = styles[`status_${shift.status}`] || styles.status_default;
	const createdByName = shift.createdBy
		? (typeof shift.createdBy === 'string'
			? shift.createdBy
			: `${shift.createdBy?.firstName || ""} ${shift.createdBy?.lastName || ""}`.trim() || shift.createdBy?.email || "Unknown")
		: "Unknown";

	// ── Save ──────────────────────────────────────────────────────────────────
	const handleSave = async () => {
		setSaveError(null);
		try {
			await updateShift({
				id: shift._id,
				data: {
					clientAddress: formData.clientAddress,
					contactPerson: formData.contactPerson,
					startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
					endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined,
					geofence: formData.geofence,
					tasks: formData.tasks,
					notes: formData.notes,
				},
			});
			setIsEditing(false);
		} catch (err) {
			setSaveError(err?.message || "Failed to save changes.");
		}
	};

	const handleCancel = () => { setIsEditing(false); setSaveError(null); };

	// ── Helpers ───────────────────────────────────────────────────────────────
	// Generic deep-update for formData via a dot-separated path
	const handleChange = (e, path) => {
		const val = e.target.value;
		setFormData(prev => {
			const next = { ...prev };
			const keys = path.split(".");
			let cur = next;
			for (let i = 0; i < keys.length - 1; i++) {
				cur[keys[i]] = { ...cur[keys[i]] };
				cur = cur[keys[i]];
			}
			cur[keys[keys.length - 1]] = val;
			return next;
		});
	};

	// Resolves a dot-path value from formData
	const getVal = (path) => {
		return path.split(".").reduce((obj, k) => obj?.[k], formData);
	};

	// Render a labelled input field (text / number / datetime-local / textarea)
	const Field = ({ label, path, type = "text" }) => (
		<div className={styles.fieldGroup}>
			{label && <label className={styles.label}>{label}</label>}
			{type === "textarea" ? (
				<textarea
					className={styles.inputField}
					value={getVal(path) || ""}
					onChange={(e) => handleChange(e, path)}
					rows={3}
				/>
			) : (
				<input
					type={type}
					className={styles.inputField}
					value={getVal(path) || ""}
					onChange={(e) => handleChange(e, path)}
				/>
			)}
		</div>
	);

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<PageLayout>

			{/* ════════════════════════════════════════════ HEADER */}
			<header className={styles.header}>
				<div>
					<div className={styles.badgeRow}>
						<span className={`${styles.statusBadge} ${statusClass}`}>
							{shift.status?.replace(/_/g, " ")}
						</span>
					</div>
					<h1 className={styles.title}>Shift Details</h1>
					<p className={styles.shiftId}>ID: {shift._id}</p>
					<div className={styles.createdBy}>
						<UserCheck size={13} />
						<span>Created by <strong>{createdByName}</strong></span>
					</div>
				</div>
				<div className={styles.headerActions}>
					{isEditing ? (
						<>
							<Button icon={<X size={16} />} onClick={handleCancel} variant="secondary">Cancel</Button>
							<Button icon={<Save size={16} />} onClick={handleSave} disabled={isShiftActionPending} variant="primary">
								{isShiftActionPending ? "Saving…" : "Save Changes"}
							</Button>
						</>
					) : (
						<>
							<Button icon={<Undo2 size={16} />} onClick={() => router.back()} variant="outline">Back</Button>
							<Button icon={<Edit size={16} />} onClick={() => setIsEditing(true)} variant="secondary">Edit</Button>
						</>
					)}
				</div>
			</header>

			{/* Error banner */}
			{(saveError || actionShiftError) && (
				<ActionMessage variant="error" message={saveError || actionShiftError} />
			)}

			{/* ════════════════════════════════════════════ ROW 1 — 2-column */}
			<div className={styles.row}>

				{/* ── LEFT: Time, Tasks */}
				<div className={styles.colMain}>

					{/* Time & Schedule */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Clock size={16} /> Time & Schedule</h3>
						<div className={styles.twoCol}>
							{isEditing ? (
								<>
									<Field label="Start Time (Halifax)" path="startTime" type="datetime-local" />
									<Field label="End Time (Halifax)" path="endTime" type="datetime-local" />
								</>
							) : (
								<>
									<div>
										<label className={styles.label}>Start Time</label>
										<p className={styles.boldVal}>{formatHalifaxTime(shift.startTime)}</p>
										<p className={styles.tzNote}>Halifax · ADT / AST</p>
									</div>
									<div>
										<label className={styles.label}>End Time</label>
										<p className={styles.boldVal}>{formatHalifaxTime(shift.endTime)}</p>
										<p className={styles.tzNote}>Halifax · ADT / AST</p>
									</div>
								</>
							)}
						</div>
					</section>

					{/* Emergency Contact */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Phone size={16} /> Emergency Contact</h3>
						<div className={styles.emergencyGrid}>
							{isEditing ? (
								<>
									<Field label="Name" path="contactPerson.name" />
									<Field label="Phone" path="contactPerson.phone" />
									<Field label="Email" path="contactPerson.email" />
								</>
							) : (
								<>
									<div className={styles.emergencyItem}>
										<User size={14} className={styles.contactIcon} />
										<div className={styles.contactDetails}>
											<span className={styles.contactName}>{shift.contactPerson?.name || "—"}</span>
											<span className={styles.contactVal}>
												<Phone size={10} style={{ display: "inline", marginRight: 4 }} />
												{shift.contactPerson?.phone || "—"}
												&nbsp;&nbsp;·&nbsp;&nbsp;
												<Mail size={10} style={{ display: "inline", marginRight: 4 }} />
												{shift.contactPerson?.email || "—"}
											</span>
										</div>
									</div>
								</>
							)}
						</div>
					</section>
				</div>

				{/* ── RIGHT: People + Notes */}
				<aside className={styles.colSide}>

					{/* Client */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><User size={16} /> Client</h3>
						<p className={styles.personName}>{shift.client?.fullName || "—"}</p>
						{shift.client?.email && <div className={styles.subDetail}><Mail size={12} />{shift.client.email}</div>}
						{shift.client?.id && <div className={styles.subDetail}><Hash size={12} />{shift.client.id}</div>}
					</section>

					{/* Caregiver */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><User size={16} /> Caregiver</h3>
						<p className={styles.personName}>{shift.caregiver?.fullName || "—"}</p>
						{shift.caregiver?.email && <div className={styles.subDetail}><Mail size={12} />{shift.caregiver.email}</div>}
						{shift.caregiver?.employeeId && <div className={styles.subDetail}><Hash size={12} />ID: {shift.caregiver.employeeId}</div>}
					</section>

					{/* Notes */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><FileText size={16} /> Notes</h3>
						{isEditing
							? <Field label="" path="notes" type="textarea" />
							: <p className={styles.notesContent}>{shift.notes || "No additional notes."}</p>
						}
					</section>
				</aside>
			</div>

			{/* ════════════════════════════════════════════ ROW 2 — Shift Tasks */}
			<section className={styles.card} style={{ marginTop: 20 }}>
				<h3 className={styles.cardTitle}><CheckCircle2 size={16} /> Shift Tasks</h3>
				{isEditing ? (
					<div className={styles.taskEditList}>
						{formData.tasks?.map((task, i) => (
							<div key={i} className={styles.taskEditRow}>
								<input
									type="checkbox"
									className={styles.checkboxInput}
									checked={task.completed || false}
									onChange={(e) => {
										const t = [...formData.tasks];
										t[i] = { ...t[i], completed: e.target.checked };
										setFormData({ ...formData, tasks: t });
									}}
								/>
								<input
									className={`${styles.inputField} ${styles.flex1}`}
									value={task.description || task.title || task.name || ""}
									placeholder="Task description"
									onChange={(e) => {
										const t = [...formData.tasks];
										t[i] = { ...t[i], description: e.target.value };
										setFormData({ ...formData, tasks: t });
									}}
								/>
								<button
									type="button"
									className={styles.iconBtn}
									onClick={() => setFormData({ ...formData, tasks: formData.tasks.filter((_, j) => j !== i) })}
								>
									<Trash2 size={14} />
								</button>
							</div>
						))}
						<div style={{ marginTop: 8 }}>
							<Button
								variant="outline"
								size="sm"
								type="button"
								icon={<Plus size={14} />}
								onClick={() => setFormData({ ...formData, tasks: [...formData.tasks, { description: "", completed: false }] })}
							>
								Add Task
							</Button>
						</div>
					</div>
				) : (
					shift.tasks?.length > 0 ? (
						<div className={styles.taskList}>
							{shift.tasks.map((task, i) => (
								<div key={i} className={styles.taskItem}>
									<span className={styles.taskIndex}>{i + 1}</span>
									<p className={styles.taskName} style={{ textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "#9ca3af" : undefined }}>
										{task.title || task.name || task.description}
									</p>
									<ChevronRight size={15} className={styles.taskArrow} />
								</div>
							))}
						</div>
					) : (
						<p className={styles.emptyText}>No tasks assigned.</p>
					)
				)}
			</section>

			{/* ════════════════════════════════════════════ ROW 3 — Location & Map */}
			<section className={styles.card} style={{ marginTop: 20 }}>
				<h3 className={styles.cardTitle}><MapPin size={16} /> Location</h3>

				{isEditing && (
					<div style={{ marginBottom: 16 }}>
						<AddressAutocomplete
							label="Search Address"
							onAddressSelect={handleAddressSelect}
							placeholder="Start typing to search…"
							id="shift-edit-address"
						/>
					</div>
				)}

				<div className={styles.mapRow}>
					<GeofenceMap
						isLoaded={isLoaded}
						loadError={loadError}
						center={isEditing ? formData.geofence?.center : shift.geofence?.center}
						radius={isEditing ? formData.geofence?.radius : shift.geofence?.radius}
						onMapReady={handleMapReady}
						height="340px"
						className={styles.mapBlock}
					/>

					<div className={styles.mapInfo}>
						<label className={styles.label}>Service Address</label>
						{isEditing ? (
							<Field label="" path="clientAddress" type="textarea" />
						) : (
							<p className={styles.addressText}>{shift.clientAddress || "—"}</p>
						)}

						{isEditing && (
							<div className={styles.geofenceSettings}>
								<label className={styles.label}>Geofence Settings</label>
								<div className={styles.twoCol} style={{ gap: 8, marginTop: 8 }}>
									<Field label="Radius (m)" path="geofence.radius" type="number" />
									<div className={styles.fieldGroup}>
										<label className={styles.label}>Shape</label>
										<select
											className={styles.inputField}
											value={formData.geofence?.shape || "circle"}
											onChange={(e) => handleChange(e, "geofence.shape")}
										>
											<option value="circle">Circle</option>
											<option value="polygon">Polygon</option>
										</select>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

		</PageLayout>
	);
}