"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { format } from "date-fns";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import {
	Clock, MapPin, User, ShieldCheck, Phone,
	FileText, AlertCircle, Undo2, Tag, CheckCircle2,
	Repeat, ChevronRight, Navigation, Mail, Hash,
	Edit, Save, X, Plus, Trash2
} from "lucide-react";
import styles from "./shift_detail.module.css";

export default function ShiftDetailPage() {
	const { id } = useParams();
	const router = useRouter();
	const {
		shiftDetail,
		isActionPending,
		isError,
		errorMessage,
		updateShift
	} = useShifts(id);

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({});

	useEffect(() => {
		if (shiftDetail && !isEditing) {
			setFormData({
				clientAddress: shiftDetail.clientAddress || "",
				clientPhone: shiftDetail.clientPhone || "",
				contactPerson: {
					name: shiftDetail.contactPerson?.name || "",
					phone: shiftDetail.contactPerson?.phone || ""
				},
				// Input date fields require YYYY-MM-DDTHH:MM formatted strings
				startTime: shiftDetail.startTime ? new Date(shiftDetail.startTime).toISOString().slice(0, 16) : "",
				endTime: shiftDetail.endTime ? new Date(shiftDetail.endTime).toISOString().slice(0, 16) : "",
				servicesRequired: shiftDetail.servicesRequired ? shiftDetail.servicesRequired.join(", ") : "",
				geofence: {
					center: {
						latitude: shiftDetail.geofence?.center?.latitude || 0,
						longitude: shiftDetail.geofence?.center?.longitude || 0
					},
					radius: shiftDetail.geofence?.radius || 500,
					shape: shiftDetail.geofence?.shape || "circle",
					alertOnEntry: shiftDetail.geofence?.alertOnEntry || false,
					alertOnExit: shiftDetail.geofence?.alertOnExit || false
				},
				tasks: shiftDetail.tasks ? shiftDetail.tasks.map(t => ({ ...t })) : [],
				recurringShift: {
					isRecurring: shiftDetail.recurringShift?.isRecurring || false
				},
				tags: shiftDetail.tags ? shiftDetail.tags.join(", ") : "",
				notes: shiftDetail.notes || ""
			});
		}
	}, [shiftDetail, isEditing]);

	if (isError) return <PageLayout><div className={styles.error}>{errorMessage}</div></PageLayout>;
	if (!shiftDetail) return <PageLayout><div className={styles.loading}>Loading...</div></PageLayout>;

	const shift = shiftDetail; // Alias for read-only view parts
	const statusClass = styles[`status_${shift.status}`] || styles.status_default;

	const handleSave = async () => {
		try {
			const payload = { ...formData };
			// Convert strings back to arrays
			payload.servicesRequired = payload.servicesRequired.split(",").map(s => s.trim()).filter(Boolean);
			payload.tags = payload.tags.split(",").map(s => s.trim()).filter(Boolean);

			// Format ISO dates
			if (payload.startTime) payload.startTime = new Date(payload.startTime).toISOString();
			if (payload.endTime) payload.endTime = new Date(payload.endTime).toISOString();

			await updateShift({ id: shift._id, data: payload });
			setIsEditing(false);
		} catch (error) {
			alert(error.message || "Failed to update shift details.");
		}
	};

	const handleChange = (e, fieldPath) => {
		// e.g. fieldPath could be "geofence.center.latitude"
		const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

		setFormData(prev => {
			const updated = { ...prev };
			const keys = fieldPath.split(".");
			let current = updated;
			for (let i = 0; i < keys.length - 1; i++) {
				current[keys[i]] = { ...current[keys[i]] };
				current = current[keys[i]];
			}
			current[keys[keys.length - 1]] = val;
			return updated;
		});
	};

	const renderField = (label, path, type = "text") => {
		const keys = path.split(".");
		let value = formData;
		for (const key of keys) {
			if (value) value = value[key];
		}

		if (type === "checkbox") {
			return (
				<label className={styles.checkboxLabel}>
					<input
						type="checkbox"
						className={styles.checkboxInput}
						checked={value || false}
						onChange={(e) => handleChange(e, path)}
					/>
					{label}
				</label>
			);
		}

		if (type === "textarea") {
			return (
				<div style={{ width: '100%' }}>
					{label && <label className={styles.label}>{label}</label>}
					<textarea
						className={styles.textareaField}
						value={value || ""}
						onChange={(e) => handleChange(e, path)}
					/>
				</div>
			);
		}

		return (
			<div style={{ flex: 1 }}>
				{label && <label className={styles.label}>{label}</label>}
				<input
					type={type}
					className={styles.inputField}
					value={value || ""}
					onChange={(e) => handleChange(e, path)}
				/>
			</div>
		);
	};

	return (
		<PageLayout>
			<header className={styles.header}>
				<div className={styles.headerTitleArea}>
					<div className={styles.badgeRow}>
						<div className={`${styles.statusBadge} ${statusClass}`}>
							{shift.status?.replace('_', ' ')}
						</div>
						{(!isEditing && shift.isRecurring) && (
							<div className={styles.recurringBadge}>
								<Repeat size={14} /> Recurring Shift
							</div>
						)}
					</div>
					<h1>Shift Details</h1>
					<p className={styles.shiftId}>ID: {shift._id}</p>
				</div>
				<div style={{ display: 'flex', gap: '10px' }}>
					{isEditing ? (
						<>
							<Button icon={<X size={16} />} onClick={() => setIsEditing(false)} variant="secondary">Cancel</Button>
							<Button icon={<Save size={16} />} onClick={handleSave} disabled={isActionPending} variant="primary">
								{isActionPending ? "Saving..." : "Save"}
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

			<div className={styles.mainFlexWrapper}>
				<div className={styles.mainColumn}>
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Clock size={18} /> Time & Schedule</h3>
						{isEditing ? (
							<div className={styles.flexInnerRow}>
								{renderField("Start Time", "startTime", "datetime-local")}
								{renderField("End Time", "endTime", "datetime-local")}
							</div>
						) : (
							<div className={styles.flexInnerRow}>
								<div className={styles.flexHalf}>
									<label className={styles.label}>Start Time</label>
									<p className={styles.boldVal}>{shift.startTime ? format(new Date(shift.startTime), "PPP p") : "N/A"}</p>
								</div>
								<div className={styles.flexHalf}>
									<label className={styles.label}>End Time</label>
									<p className={styles.boldVal}>{shift.endTime ? format(new Date(shift.endTime), "PPP p") : "N/A"}</p>
								</div>
							</div>
						)}
						{isEditing && renderField("Recurring Shift", "recurringShift.isRecurring", "checkbox")}
					</section>

					<section className={styles.card}>
						<h3 className={styles.cardTitle}><CheckCircle2 size={18} /> Shift Tasks</h3>
						<div className={styles.taskList}>
							{isEditing ? (
								<>
									{formData.tasks?.map((task, index) => (
										<div key={index} className={styles.multiInputRow} style={{ alignItems: 'center' }}>
											<input
												type="checkbox"
												checked={task.completed || false}
												onChange={(e) => {
													const newTasks = [...formData.tasks];
													newTasks[index].completed = e.target.checked;
													setFormData({ ...formData, tasks: newTasks });
												}}
												className={styles.checkboxInput}
											/>
											<input
												className={styles.inputField}
												value={task.description || task.title || task.name || ""}
												placeholder="Task Description"
												onChange={(e) => {
													const newTasks = [...formData.tasks];
													newTasks[index].description = e.target.value;
													setFormData({ ...formData, tasks: newTasks });
												}}
											/>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													const newTasks = formData.tasks.filter((_, i) => i !== index);
													setFormData({ ...formData, tasks: newTasks });
												}}
											>
												<Trash2 size={16} />
											</Button>
										</div>
									))}
									<div>
										<Button
											variant="outline"
											size="sm"
											icon={<Plus size={14} />}
											onClick={() => {
												setFormData({ ...formData, tasks: [...formData.tasks, { description: "", completed: false }] });
											}}
										>
											Add Task
										</Button>
									</div>
								</>
							) : (
								shift.tasks?.length > 0 ? (
									shift.tasks.map((task, index) => (
										<div key={index} className={styles.taskItem}>
											<div className={styles.taskIndex}>{index + 1}</div>
											<div className={styles.taskContent}>
												<p className={styles.taskName} style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#9ca3af' : 'inherit' }}>
													{task.title || task.name || task.description}
												</p>
											</div>
											<ChevronRight size={16} className={styles.taskArrow} />
										</div>
									))
								) : (
									<p className={styles.emptyText}>No specific tasks assigned.</p>
								)
							)}
						</div>
					</section>

					<div className={styles.flexInnerRow}>
						<section className={`${styles.card} ${styles.flexHalf}`}>
							<h3 className={styles.cardTitle}><User size={18} /> Client</h3>
							<div className={styles.personInfo}>
								<p className={styles.mediumVal}>{shift.client?.fullName}</p>
								<div className={styles.subDetail}><Mail size={12} /> {shift.client?.email}</div>
								<div className={styles.subDetail}><Hash size={12} /> {shift.client?.id}</div>
							</div>
						</section>

						<section className={`${styles.card} ${styles.flexHalf}`}>
							<h3 className={styles.cardTitle}><User size={18} /> Caregiver</h3>
							<div className={styles.personInfo}>
								<p className={styles.mediumVal}>{shift.caregiver?.fullName}</p>
								<div className={styles.subDetail}><Mail size={12} /> {shift.caregiver?.email}</div>
								<div className={styles.subDetail}><Hash size={12} /> ID: {shift.caregiver?.employeeId || "N/A"}</div>
							</div>
						</section>
					</div>
				</div>

				<aside className={styles.sideColumn}>
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Tag size={18} /> Shift Labels</h3>
						{isEditing ? (
							renderField("Comma Separated Tags", "tags", "text")
						) : (
							<div className={styles.tagWrapper}>
								{shift.tags?.map((tag, index) => (
									<span key={index} className={styles.customTag}>{tag}</span>
								))}
								{!shift.tags?.length && <p className={styles.emptyText}>No tags assigned</p>}
							</div>
						)}
					</section>

					<section className={styles.card}>
						<h3 className={styles.cardTitle}><ShieldCheck size={18} /> Compliance</h3>
						<div className={styles.metaInfoList}>
							<div className={styles.metaItem}>
								<span className={styles.subText}>Check-in State:</span>
								<strong className={styles.dangerText} style={{ marginLeft: 8 }}>{shift.locationEnforcement?.state?.replace(/_/g, ' ') || "N/A"}</strong>
							</div>

							{isEditing ? (
								<div style={{ marginTop: '1rem' }}>
									<label className={styles.label}>Geofence Settings</label>
									<div className={styles.multiInputRow}>
										{renderField("Latitude", "geofence.center.latitude", "number")}
										{renderField("Longitude", "geofence.center.longitude", "number")}
									</div>
									<div className={styles.multiInputRow}>
										{renderField("Radius (m)", "geofence.radius", "number")}
										{renderField("Shape", "geofence.shape", "text")}
									</div>
									{renderField("Alert On Entry", "geofence.alertOnEntry", "checkbox")}
									{renderField("Alert On Exit", "geofence.alertOnExit", "checkbox")}
								</div>
							) : (
								<div className={styles.metaItem} style={{ marginTop: 8 }}>
									<span className={styles.subText}>Geofence:</span>
									<span style={{ marginLeft: 8 }}>{shift.geofence?.radius}m ({shift.geofence?.shape})</span>
								</div>
							)}
						</div>
					</section>

					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Navigation size={18} /> Services</h3>
						{isEditing ? (
							renderField("Comma Separated Services", "servicesRequired", "text")
						) : (
							<div className={styles.chipBox}>
								{shift.servicesRequired?.map((service, index) => (
									<span key={index} className={styles.serviceChip}>{service}</span>
								))}
							</div>
						)}
					</section>

					<section className={styles.card}>
						<h3 className={styles.cardTitle}><FileText size={18} /> Internal Notes</h3>
						{isEditing ? (
							renderField("", "notes", "textarea")
						) : (
							<p className={styles.notesContent}>{shift.notes || "No additional notes."}</p>
						)}
					</section>
				</aside>
			</div>

			<section className={`${styles.card} ${styles.fullWidthCard}`}>
				<h3 className={styles.cardTitle}><MapPin size={18} /> Location & Navigation</h3>
				<div className={styles.mapGrid}>
					<div className={styles.mapContainerPlaceholder}>
						<div className={styles.mapInterfaceHint}>
							<Navigation size={48} strokeWidth={1} />
							<p>Google Maps Integration Layer</p>
						</div>
					</div>

					<div className={styles.locationSidebar}>
						<div className={styles.addressBlock}>
							{isEditing ? (
								renderField("Service Address", "clientAddress", "textarea")
							) : (
								<>
									<label className={styles.label}>Service Address</label>
									<p className={styles.addressText}>{shift.clientAddress}</p>
								</>
							)}
						</div>

						<div className={styles.contactGrid}>
							<div className={styles.contactBox}>
								<label className={styles.label}><Phone size={12} /> Client Phone</label>
								{isEditing ? (
									renderField("", "clientPhone", "text")
								) : (
									<p className={styles.mediumVal}>{shift.clientPhone}</p>
								)}
							</div>
							<div className={styles.contactBox}>
								<label className={styles.label}>Emergency Contact</label>
								{isEditing ? (
									<>
										{renderField("Name", "contactPerson.name", "text")}
										<div style={{ marginTop: 8 }}>{renderField("Phone", "contactPerson.phone", "text")}</div>
									</>
								) : (
									<>
										<p className={styles.mediumVal}>{shift.contactPerson?.name}</p>
										<p className={styles.subText}>{shift.contactPerson?.phone}</p>
									</>
								)}
							</div>
						</div>

						{!isEditing && (
							<Button className={styles.navButton} variant="primary">
								Get Directions
							</Button>
						)}
					</div>
				</div>
			</section>
		</PageLayout>
	);
}