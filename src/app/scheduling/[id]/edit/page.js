"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useHomes } from "@/hooks/useHomes";
import { toHalifaxInputValue, halifaxInputToUTC } from "@/utils/timeUtils";
import GeofenceMap from "@/components/UI/GeofenceMap";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import cardStyles from "@components/UI/Card.module.css";
import {
	Clock, MapPin, FileText, Save, X, Plus, Trash2,
	CheckCircle2, AlertTriangle, Loader, User, Search,
} from "lucide-react";
import shiftStyles from "../shift_detail.module.css";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { shortTextRule, longTextRule, IdRule } from "@/utils/validation";
import styles from "./edit_shift.module.css";

// ── Status helpers ────────────────────────────────────────────────────────────
const SCHEDULED_STATUSES = ["scheduled"];
const COMPLETED_STATUSES = ["completed", "missed", "late", "no_show"];
const IN_PROGRESS_STATUSES = ["in_progress", "started"];

// ── Schemas ───────────────────────────────────────────────────────────────────
const scheduledSchema = yup.object({
	caregiverId: IdRule.required("Please select a caregiver"),
	clientId: yup.string().optional(),
	homeId: yup.string().optional(),
	startTime: yup.string().required("Start time is required"),
	endTime: yup.string().required("End time is required")
		.test("after-start", "End time must be after start time", function (v) {
			return !v || !this.parent.startTime || new Date(v) > new Date(this.parent.startTime);
		}),
	notes: shortTextRule.optional(),
	geofenceStreet: longTextRule.optional(),
	geofenceCity: shortTextRule.optional(),
	geofenceProvince: shortTextRule.optional(),
	geofencePostalCode: shortTextRule.optional(),
});

const completedSchema = yup.object({
	actualStartTime: yup.string().required("Actual start time is required"),
	actualEndTime: yup.string().required("Actual end time is required")
		.test("after-start", "Actual end time must be after start time", function (v) {
			return !v || !this.parent.actualStartTime || new Date(v) > new Date(this.parent.actualStartTime);
		}),
	reason: shortTextRule.required("Please provide a reason for the adjustment"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function personName(obj) {
	if (!obj) return "—";
	const full = `${obj.firstName || ""} ${obj.lastName || ""}`.trim();
	return full || obj.email || "—";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EditShiftPage() {
	const { id } = useParams();
	const router = useRouter();

	const {
		shiftDetail,
		fetchShiftError,
		isShiftLoading,
		isShiftActionPending,
		actionShiftError,
		updateUpcommingShift,
		updateCompletedShift,
	} = useShifts(id);

	const [showInProgressModal, setShowInProgressModal] = useState(false);
	const [saveError, setSaveError] = useState(null);

	// ── Determine mode from status ────────────────────────────────────────
	const status = shiftDetail?.status;
	const isScheduled = SCHEDULED_STATUSES.includes(status);
	const isCompleted = COMPLETED_STATUSES.includes(status);
	const isInProgress = IN_PROGRESS_STATUSES.includes(status);

	// ── Scheduled mode state ──────────────────────────────────────────────
	const [tasks, setTasks] = useState([]);
	const [mapCenter, setMapCenter] = useState({ lat: 44.6488, lng: -63.5752 });
	const [geofenceAddress, setGeofenceAddress] = useState("");
	const [geofenceCoords, setGeofenceCoords] = useState(null);
	const mapRefsRef = useRef(null);

	// Target (client / home)
	const [targetType, setTargetType] = useState("client");

	// Caregiver search
	const [caregiverInput, setCaregiverInput] = useState("");
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [selectedCaregiver, setSelectedCaregiver] = useState(null);
	const [showCaregiverDropdown, setShowCaregiverDropdown] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setCaregiverSearch(caregiverInput), 400);
		return () => clearTimeout(t);
	}, [caregiverInput]);
	const { caregivers } = useCaregivers({ params: { page: 1, limit: 10, search: caregiverSearch, isActive: true } });

	// Client search
	const [clientInput, setClientInput] = useState("");
	const [clientSearch, setClientSearch] = useState("");
	const [selectedClient, setSelectedClient] = useState(null);
	const [showClientDropdown, setShowClientDropdown] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setClientSearch(clientInput), 400);
		return () => clearTimeout(t);
	}, [clientInput]);
	const { clients } = useClients({ params: { page: 1, limit: 5, search: clientSearch } });

	// Home search
	const [homeInput, setHomeInput] = useState("");
	const [homeSearch, setHomeSearch] = useState("");
	const [selectedHome, setSelectedHome] = useState(null);
	const [showHomeDropdown, setShowHomeDropdown] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setHomeSearch(homeInput), 400);
		return () => clearTimeout(t);
	}, [homeInput]);
	const { homes } = useHomes({ page: 1, limit: 50, search: homeSearch });

	// ── Forms ─────────────────────────────────────────────────────────────
	const scheduledForm = useForm({ resolver: yupResolver(scheduledSchema) });
	const completedForm = useForm({ resolver: yupResolver(completedSchema) });

	const { register, handleSubmit, setValue, reset, watch, control, formState: { errors } } =
		isCompleted ? completedForm : scheduledForm;

	const selectedStartTime = scheduledForm.watch("startTime");

	// ── Populate from shiftDetail ─────────────────────────────────────────
	useEffect(() => {
		if (!shiftDetail) return;

		if (isInProgress) {
			setShowInProgressModal(true);
			return;
		}

		if (isScheduled) {
			scheduledForm.reset({
				caregiverId: shiftDetail.caregiver?._id || shiftDetail.caregiver?.id || "",
				clientId: shiftDetail.client?._id || shiftDetail.client?.id || "",
				homeId: shiftDetail.home?._id || shiftDetail.home?.id || "",
				startTime: toHalifaxInputValue(shiftDetail.startTime),
				endTime: toHalifaxInputValue(shiftDetail.endTime),
				notes: shiftDetail.notes || "",
			});
			setTasks(shiftDetail.tasks?.map(t => ({ ...t })) ?? []);

			// Pre-fill caregiver display
			if (shiftDetail.caregiver) {
				setSelectedCaregiver(shiftDetail.caregiver);
				setCaregiverInput(personName(shiftDetail.caregiver));
			}

			// Pre-fill client or home display
			if (shiftDetail.home) {
				setTargetType("home");
				setSelectedHome(shiftDetail.home);
				setHomeInput(shiftDetail.home.name || shiftDetail.home._id || "");
			} else if (shiftDetail.client) {
				setTargetType("client");
				setSelectedClient(shiftDetail.client);
				setClientInput(personName(shiftDetail.client));
			}

			// Pre-fill geofence
			if (shiftDetail.geofence?.center) {
				const { latitude, longitude } = shiftDetail.geofence.center;
				setMapCenter({ lat: latitude, lng: longitude });
				setGeofenceCoords({ latitude, longitude });
			}
			if (shiftDetail.geofence?.address) {
				setGeofenceAddress(shiftDetail.geofence.address);
			}
		}

		if (isCompleted) {
			completedForm.reset({
				actualStartTime: toHalifaxInputValue(shiftDetail.actualStartTime || shiftDetail.startTime),
				actualEndTime: toHalifaxInputValue(shiftDetail.actualEndTime || shiftDetail.endTime),
				reason: "",
			});
		}
	}, [shiftDetail, isScheduled, isCompleted, isInProgress]);

	// ── Address handler ───────────────────────────────────────────────────
	const handleAddressSelect = useCallback((data) => {
		const { street, city, state, postalCode, country, latitude, longitude } = data;
		const full = [street, city, state, postalCode, country].filter(Boolean).join(", ");
		setGeofenceAddress(full);
		if (latitude && longitude) {
			setGeofenceCoords({ latitude, longitude });
			const nc = { lat: latitude, lng: longitude };
			setMapCenter(nc);
			if (mapRefsRef.current) {
				const { mapInstance, marker, circle } = mapRefsRef.current;
				mapInstance?.panTo(nc); mapInstance?.setZoom(15);
				marker?.setPosition(nc); circle?.setCenter(nc);
			}
		}
		if (street) scheduledForm.setValue("geofenceStreet", street);
		if (city) scheduledForm.setValue("geofenceCity", city);
		if (state) scheduledForm.setValue("geofenceProvince", state);
		if (postalCode) scheduledForm.setValue("geofencePostalCode", postalCode);
	}, [scheduledForm]);

	// ── Submit: scheduled ─────────────────────────────────────────────────
	async function onSubmitScheduled(data) {
		setSaveError(null);
		const payload = {
			caregiverId: data.caregiverId,
			startTime: halifaxInputToUTC(data.startTime),
			endTime: halifaxInputToUTC(data.endTime),
			timezone: "America/Halifax",
			notes: data.notes || undefined,
			tasks: tasks.map(t => ({ description: t.description || t.title || "", completed: t.completed || false })),
		};
		// Client or home — exactly one
		if (targetType === "client" && data.clientId) payload.clientId = data.clientId;
		else if (targetType === "home" && data.homeId) payload.homeId = data.homeId;
		else { payload.clientId = null; payload.homeId = null; }

		if (geofenceCoords) {
			payload.geofence = { center: geofenceCoords, radius: 100, shape: "circle", address: geofenceAddress || undefined };
		}
		try {
			await updateUpcommingShift({ id: shiftDetail._id, data: payload });
			router.push(`/scheduling/${id}`);
		} catch (err) { setSaveError(err?.message || "Failed to save."); }
	}

	// ── Submit: completed ─────────────────────────────────────────────────
	async function onSubmitCompleted(data) {
		setSaveError(null);
		const payload = {
			actualStartTime: halifaxInputToUTC(data.actualStartTime),
			actualEndTime: halifaxInputToUTC(data.actualEndTime),
			reason: data.reason || undefined,
		};
		try {
			await updateCompletedShift({ id: shiftDetail._id, data: payload });
			router.push(`/scheduling/${id}`);
		} catch (err) { setSaveError(err?.message || "Failed to save."); }
	}

	// ── Guards ────────────────────────────────────────────────────────────
	if (isShiftLoading || (!shiftDetail && !fetchShiftError)) return (
		<PageLayout>
			<div className={shiftStyles.stateBox}>
				<Loader size={28} className={shiftStyles.spinnerIcon} />
				<p>Loading shift…</p>
			</div>
		</PageLayout>
	);

	if (fetchShiftError) return (
		<PageLayout>
			<div className={shiftStyles.stateBox}>
				<AlertTriangle size={32} className={shiftStyles.errorIcon} />
				<p>{fetchShiftError}</p>
			</div>
		</PageLayout>
	);

	const nowLocal = new Date().toISOString().slice(0, 16);
	const statusClass = shiftStyles[`status_${status}`] || shiftStyles.status_default;

	// ── In-progress modal ─────────────────────────────────────────────────
	if (showInProgressModal) return (
		<PageLayout>
			<div className={styles.modalOverlay}>
				<div className={styles.modal}>
					<div className={styles.modalIcon}><AlertTriangle size={32} /></div>
					<h2 className={styles.modalTitle}>Shift In Progress</h2>
					<p className={styles.modalBody}>
						This shift is currently <strong>in progress</strong> and cannot be edited.
						Please wait until the shift is completed before making changes.
					</p>
					<Button variant="primary" onClick={() => router.push(`/scheduling/${id}`)}>
						View Shift
					</Button>
				</div>
			</div>
		</PageLayout>
	);

	// ── Shared header ─────────────────────────────────────────────────────
	const Header = ({ onSave }) => (
		<div className={shiftStyles.pageHeader}>
			<div>
				<div className={shiftStyles.badgeRow}>
					<span className={`${shiftStyles.statusBadge} ${statusClass}`}>
						{status?.replace(/_/g, " ")}
					</span>
					<span className={styles.editModeBadge}>
						{isCompleted ? "Editing Timesheet" : "Editing Shift"}
					</span>
				</div>
				<h1>Edit Shift</h1>
				<p className={shiftStyles.shiftId}>ID: {shiftDetail._id}</p>
			</div>
			<div className={shiftStyles.headerActions}>
				<Button icon={<X size={16} />} onClick={() => router.push(`/scheduling/${id}`)} variant="secondary">Cancel</Button>
				<Button icon={<Save size={16} />} onClick={onSave} disabled={isShiftActionPending} variant="primary">
					{isShiftActionPending ? "Saving…" : "Save Changes"}
				</Button>
			</div>
		</div>
	);

	// ─────────────────────────────────────────────────────────────────────
	// COMPLETED SHIFT FORM
	// ─────────────────────────────────────────────────────────────────────
	if (isCompleted) {
		const { register: creg, handleSubmit: cSubmit, control: cctrl, formState: { errors: cerrors } } = completedForm;
		return (
			<PageLayout>
				<Header onSave={cSubmit(onSubmitCompleted)} />
				{(saveError || actionShiftError) && <ActionMessage variant="error" message={saveError || actionShiftError} />}

				<div className={styles.completedNotice}>
					<Clock size={15} style={{ flexShrink: 0 }} />
					<span>
						This shift has been <strong>{status?.replace(/_/g, " ")}</strong>.
						You can only adjust the actual recorded times and provide a reason.
						All other shift details are locked.
					</span>
				</div>

				<div className={styles.completedGrid}>
					<Card>
						<CardHeader><span className={shiftStyles.cardTitleInner}><Clock size={15} /> Actual Times</span></CardHeader>
						<CardContent>
							<div className={styles.tzBadge}>
								<Clock size={13} /> All times in <strong>Atlantic Time (Halifax)</strong>
							</div>
							<div className={shiftStyles.twoCol} style={{ marginTop: "1rem" }}>
								<InputField label="Actual Start Time" type="datetime-local" name="actualStartTime" register={creg} control={cctrl} error={cerrors.actualStartTime} />
								<InputField label="Actual End Time" type="datetime-local" name="actualEndTime" register={creg} control={cctrl} error={cerrors.actualEndTime} />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader><span className={shiftStyles.cardTitleInner}><FileText size={15} /> Adjustment Reason</span></CardHeader>
						<CardContent>
							<InputField label="Reason" name="reason" type="textarea" rows={5} register={creg} error={cerrors.reason} placeholder="e.g. Adjusted after verifying timesheet with supervisor" />
						</CardContent>
					</Card>
				</div>
			</PageLayout>
		);
	}

	// ─────────────────────────────────────────────────────────────────────
	// SCHEDULED SHIFT FORM
	// ─────────────────────────────────────────────────────────────────────
	const { register: sreg, handleSubmit: sSubmit, formState: { errors: serrors }, control: sctrl } = scheduledForm;

	return (
		<PageLayout>
			<Header onSave={sSubmit(onSubmitScheduled)} />
			{(saveError || actionShiftError) && <ActionMessage variant="error" message={saveError || actionShiftError} />}

			<form onSubmit={sSubmit(onSubmitScheduled)}>
				{/* ═══════════════════ ROW 1: 2-column — left wider */}
				<div className={styles.scheduledRow}>

					{/* ── LEFT: Time + Tasks + Notes */}
					<div className={styles.scheduledMain}>

						{/* Time & Schedule */}
						<Card>
							<CardHeader><span className={shiftStyles.cardTitleInner}><Clock size={15} /> Time &amp; Schedule</span></CardHeader>
							<CardContent>
								<div className={styles.tzBadge}>
									<Clock size={13} /> All times in <strong>Atlantic Time (America/Halifax)</strong>
								</div>
								<div className={shiftStyles.twoCol} style={{ marginTop: "1rem" }}>
									<InputField label="Start Time" type="datetime-local" name="startTime" register={sreg} control={sctrl} error={serrors.startTime} />
									<InputField label="End Time" type="datetime-local" name="endTime" register={sreg} control={sctrl} error={serrors.endTime} min={selectedStartTime} />
								</div>
							</CardContent>
						</Card>

						{/* Shift Tasks */}
						<Card>
							<CardHeader><span className={shiftStyles.cardTitleInner}><CheckCircle2 size={15} /> Shift Tasks</span></CardHeader>
							<CardContent>
								<div className={shiftStyles.taskEditList}>
									{tasks.map((task, i) => (
										<div key={i} className={shiftStyles.taskEditRow}>
											<input type="checkbox" className={shiftStyles.checkboxInput}
												checked={task.completed || false}
												onChange={e => { const t = [...tasks]; t[i] = { ...t[i], completed: e.target.checked }; setTasks(t); }} />
											<input className={`${shiftStyles.inputField} ${shiftStyles.flex1}`}
												value={task.description || task.title || ""}
												placeholder="Task description"
												onChange={e => { const t = [...tasks]; t[i] = { ...t[i], description: e.target.value }; setTasks(t); }} />
											<button type="button" className={shiftStyles.iconBtn}
												onClick={() => setTasks(tasks.filter((_, j) => j !== i))}>
												<Trash2 size={14} />
											</button>
										</div>
									))}
									<div style={{ marginTop: 8 }}>
										<Button variant="outline" size="sm" type="button" icon={<Plus size={14} />}
											onClick={() => setTasks([...tasks, { description: "", completed: false }])}>
											Add Task
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Notes */}
						<Card>
							<CardHeader><span className={shiftStyles.cardTitleInner}><FileText size={15} /> Notes</span></CardHeader>
							<CardContent>
								<InputField label="" name="notes" type="textarea" rows={4} register={sreg} error={serrors.notes} />
							</CardContent>
						</Card>

					</div>

					{/* ── RIGHT: Caregiver + Assigned To */}
					<div className={styles.scheduledSide}>

						{/* Caregiver */}
						<Card>
							<CardHeader><span className={shiftStyles.cardTitleInner}><User size={15} /> Caregiver</span></CardHeader>
							<CardContent>
								<div className={styles.searchContainer}>
									<label className={cardStyles.label}>Caregiver</label>
									<div className={styles.searchWrap}>
										<Search size={15} className={styles.searchIcon} />
										<input
											className={`${styles.searchInput} ${serrors.caregiverId ? cardStyles.input_error : ""}`}
											value={caregiverInput}
											onChange={e => { setCaregiverInput(e.target.value); setShowCaregiverDropdown(true); }}
											onFocus={() => setShowCaregiverDropdown(true)}
											onBlur={() => setTimeout(() => setShowCaregiverDropdown(false), 150)}
											readOnly={!!selectedCaregiver}
											style={selectedCaregiver ? { background: "#f3f4f6", cursor: "not-allowed" } : {}}
											placeholder="Search caregiver..."
										/>
										{selectedCaregiver && (
											<X size={15} className={styles.clearBtn} onClick={() => {
												setSelectedCaregiver(null); setCaregiverInput(""); setCaregiverSearch("");
												scheduledForm.setValue("caregiverId", "");
											}} />
										)}
									</div>
									{showCaregiverDropdown && !selectedCaregiver && caregivers?.length > 0 && (
										<div className={styles.dropdown}>
											{caregivers.map(cg => (
												<div key={cg.id} className={styles.dropdownItem} onMouseDown={() => {
													setSelectedCaregiver(cg); setCaregiverInput(personName(cg));
													setShowCaregiverDropdown(false); scheduledForm.setValue("caregiverId", cg.id);
												}}>{personName(cg)}</div>
											))}
										</div>
									)}
									{serrors.caregiverId && <p className={cardStyles.error_text}>{serrors.caregiverId.message}</p>}
								</div>
							</CardContent>
						</Card>

						{/* Assigned To */}
						<Card>
							<CardHeader><span className={shiftStyles.cardTitleInner}><User size={15} /> Assigned To</span></CardHeader>
							<CardContent>
								<div style={{ marginBottom: "1rem" }}>
									<label className={cardStyles.label}>Shift Target</label>
									<select className={cardStyles.input}
										value={targetType}
										onChange={e => {
											const t = e.target.value;
											setTargetType(t);
											if (t === "client") { setSelectedHome(null); setHomeInput(""); scheduledForm.setValue("homeId", ""); }
											else { setSelectedClient(null); setClientInput(""); setClientSearch(""); scheduledForm.setValue("clientId", ""); }
										}}>
										<option value="client">Client</option>
										<option value="home">Home</option>
									</select>
								</div>

								{targetType === "client" && (
									<div className={styles.searchContainer}>
										<label className={cardStyles.label}>Client</label>
										<div className={styles.searchWrap}>
											<Search size={15} className={styles.searchIcon} />
											<input
												className={styles.searchInput}
												value={clientInput}
												onChange={e => { setClientInput(e.target.value); setShowClientDropdown(true); }}
												onFocus={() => setShowClientDropdown(true)}
												onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
												readOnly={!!selectedClient}
												style={selectedClient ? { background: "#f3f4f6", cursor: "not-allowed" } : {}}
												placeholder="Search client..."
											/>
											{selectedClient && <X size={15} className={styles.clearBtn} onClick={() => {
												setSelectedClient(null); setClientInput(""); setClientSearch("");
												scheduledForm.setValue("clientId", "");
											}} />}
										</div>
										{showClientDropdown && !selectedClient && clients?.length > 0 && (
											<div className={styles.dropdown}>
												{clients.map(c => (
													<div key={c.id} className={styles.dropdownItem} onMouseDown={() => {
														setSelectedClient(c); setClientInput(personName(c));
														setShowClientDropdown(false); scheduledForm.setValue("clientId", c.id);
													}}>{personName(c)} — {c.email}</div>
												))}
											</div>
										)}
									</div>
								)}

								{targetType === "home" && (
									<div className={styles.searchContainer}>
										<label className={cardStyles.label}>Home</label>
										<div className={styles.searchWrap}>
											<Search size={15} className={styles.searchIcon} />
											<input
												className={styles.searchInput}
												value={homeInput}
												onChange={e => { setHomeInput(e.target.value); setShowHomeDropdown(true); }}
												onFocus={() => setShowHomeDropdown(true)}
												onBlur={() => setTimeout(() => setShowHomeDropdown(false), 150)}
												readOnly={!!selectedHome}
												style={selectedHome ? { background: "#f3f4f6", cursor: "not-allowed" } : {}}
												placeholder="Search home..."
											/>
											{selectedHome && <X size={15} className={styles.clearBtn} onClick={() => {
												setSelectedHome(null); setHomeInput("");
												scheduledForm.setValue("homeId", "");
											}} />}
										</div>
										{showHomeDropdown && !selectedHome && (
											<div className={styles.dropdown}>
												{homes?.length > 0 ? homes.map(h => (
													<div key={h.id || h._id} className={styles.dropdownItem} onMouseDown={() => {
														setSelectedHome(h); setHomeInput(h.name || h._id);
														setShowHomeDropdown(false); scheduledForm.setValue("homeId", h.id || h._id);
													}}>{h.name || h._id}</div>
												)) : <div className={styles.dropdownItem} style={{ color: "#9ca3af" }}>No homes found</div>}
											</div>
										)}
									</div>
								)}
							</CardContent>
						</Card>

					</div>
				</div>

				{/* ═══════════════════ ROW 2: Service Location (full width) */}
				<div style={{ marginTop: "1.5rem" }}>
					<Card>
						<CardHeader><span className={shiftStyles.cardTitleInner}><MapPin size={15} /> Service Location</span></CardHeader>
						<CardContent>
							<div className={styles.locationRow}>
								<div className={styles.mapBlock}>
									<GeofenceMap center={mapCenter} radius={100} onMapReady={refs => { mapRefsRef.current = refs; }} height="100%" />
								</div>
								<div className={styles.addressBlock}>
									<AddressAutocomplete
										label="Search Service Address"
										onAddressSelect={handleAddressSelect}
										placeholder="Start typing an address..."
										id="edit-shift-address"
										register={sreg}
										mode="split"
										fieldNames={{ street: "geofenceStreet", city: "geofenceCity", state: "geofenceProvince", postalCode: "geofencePostalCode", country: null }}
										isEditing={true}
										currentAddress={geofenceAddress}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</form>
		</PageLayout>
	);
}