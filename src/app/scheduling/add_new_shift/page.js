"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Plus, X, Clock } from "lucide-react";

import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useHomes } from "@/hooks/useHomes";
import { useShifts } from "@/hooks/useShifts";
import GeofenceMap from "@/components/UI/GeofenceMap";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";

import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import styles from "./add_new_shift.module.css";
import cardStyles from "@components/UI/Card.module.css";

import { IdRule, nameRule, phoneRule, shortTextRule, longTextRule } from "@/utils/validation";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function joinAddress(addressObj) {
	if (!addressObj) return "";
	if (typeof addressObj === "string") return addressObj;
	return [
		addressObj.street,
		addressObj.city,
		addressObj.state || addressObj.province,
		addressObj.pinCode || addressObj.postalCode,
	].filter(Boolean).join(", ");
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = yup.object({
	caregiverId: IdRule.required("Please select a caregiver"),
	clientId: yup.string().test("exclusive", "Please select a client", function (value) {
		return !!value || !!this.parent.homeId;
	}),
	homeId: yup.string().test("exclusive", "Please select a home", function (value) {
		return !!value || !!this.parent.clientId;
	}),
	startTime: yup.string().required("Start time is required")
		.test("is-future", "Start time must be in the future", (v) => !v || new Date(v) > new Date()),
	endTime: yup.string().required("End time is required")
		.test("is-after-start", "End time must be after start time", function (v) {
			return !v || !this.parent.startTime || new Date(v) > new Date(this.parent.startTime);
		}),
	// Contact person — display only, not submitted
	/*
	contactFName: nameRule.optional(),
	contactLName: nameRule.optional(),
	contactPhone: phoneRule.optional(),
	*/
	shiftNotes: shortTextRule.optional(),

	// Address fields for geofence
	geofenceStreet: longTextRule.required("Please search and select a service address"),
	geofenceCity: shortTextRule.required("City is required"),
	geofenceProvince: shortTextRule.required("Province is required"),
	geofencePostalCode: shortTextRule.required("Postal Code is required"),
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddNewShiftPage() {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		control,
		formState: { errors },
	} = useForm({ resolver: yupResolver(schema) });

	const selectedStartTime = watch("startTime");
	const selectedEndTime = watch("endTime");

	// ── Target type (Client or Home) ───────────────────────────────────────────

	const [targetType, setTargetType] = useState("client"); // "client" | "home"

	function handleTargetChange(type) {
		setTargetType(type);
		// Clear the other target when switching
		if (type === "client") {
			setSelectedHome(null);
			setHomeInput("");
			setValue("homeId", "");
		} else {
			setSelectedClient(null);
			setClientInput("");
			setClientSearch("");
			setValue("clientId", "");
		}
	}

	// ── Map & address state ────────────────────────────────────────────────────

	const [mapCenter, setMapCenter] = useState({ lat: 44.6488, lng: -63.5752 });
	const [hasAddressSelected, setHasAddressSelected] = useState(false);
	const [geofenceAddress, setGeofenceAddress] = useState("");
	const mapRefsRef = useRef(null);

	const handleAddressSelect = useCallback((data) => {
		const { street, city, state, postalCode, country, latitude, longitude } = data;

		// Fill individual split fields
		if (street) setValue("geofenceStreet", street, { shouldValidate: false });
		if (city) setValue("geofenceCity", city, { shouldValidate: false });
		if (state) setValue("geofenceProvince", state, { shouldValidate: false });
		if (postalCode) setValue("geofencePostalCode", postalCode, { shouldValidate: false });

		const fullAddress = [street, city, state, postalCode, country].filter(Boolean).join(", ");
		setGeofenceAddress(fullAddress);
		setHasAddressSelected(true);

		if (latitude && longitude) {
			const newCenter = { lat: latitude, lng: longitude };
			setMapCenter(newCenter);
			if (mapRefsRef.current) {
				const { mapInstance, marker, circle } = mapRefsRef.current;
				mapInstance?.panTo(newCenter);
				mapInstance?.setZoom(15);
				marker?.setPosition(newCenter);
				circle?.setCenter(newCenter);
			}
		}
	}, [setValue]);

	// ── Client search ──────────────────────────────────────────────────────────

	const [clientInput, setClientInput] = useState("");
	const [clientSearch, setClientSearch] = useState("");
	const [selectedClient, setSelectedClient] = useState(null);
	const [showClientDropdown, setShowClientDropdown] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setClientSearch(clientInput), 400);
		return () => clearTimeout(timer);
	}, [clientInput]);

	const { clients } = useClients({ params: { page: 1, limit: 5, search: clientSearch } });

	function handleSelectClient(client) {
		setSelectedClient(client);
		setClientInput(`${client.firstName} ${client.lastName}`);
		setShowClientDropdown(false);
		setValue("clientId", client.id);
	}

	function handleClearClient() {
		setSelectedClient(null);
		setClientInput("");
		setClientSearch("");
		setShowClientDropdown(false);
		setValue("clientId", "");
	}

	// ── Home search ────────────────────────────────────────────────────────────

	const [homeInput, setHomeInput] = useState("");
	const [homeSearch, setHomeSearch] = useState("");
	const [selectedHome, setSelectedHome] = useState(null);
	const [showHomeDropdown, setShowHomeDropdown] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setHomeSearch(homeInput), 400);
		return () => clearTimeout(timer);
	}, [homeInput]);

	const { homes } = useHomes({ page: 1, limit: 50, search: homeSearch });

	function handleSelectHome(home) {
		setSelectedHome(home);
		setHomeInput(home.name || home.homeName || `Home ${home.id}`);
		setShowHomeDropdown(false);
		setValue("homeId", home.id || home._id);
	}

	function handleClearHome() {
		setSelectedHome(null);
		setHomeInput("");
		setHomeSearch("");
		setShowHomeDropdown(false);
		setValue("homeId", "");
	}

	// ── Caregiver search ───────────────────────────────────────────────────────

	const [caregiverInput, setCaregiverInput] = useState("");
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [selectedCaregiver, setSelectedCaregiver] = useState(null);
	const [showCaregiverDropdown, setShowCaregiverDropdown] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setCaregiverSearch(caregiverInput), 400);
		return () => clearTimeout(timer);
	}, [caregiverInput]);

	const caregiverParams = { page: 1, limit: 10, search: caregiverSearch, isActive: true };
	if (selectedStartTime) {
		const startDate = new Date(selectedStartTime);
		caregiverParams.availabilityDay = DAY_NAMES[startDate.getDay()];
		caregiverParams.availabilityStartTime = startDate.toTimeString().slice(0, 5);
		if (selectedEndTime) {
			caregiverParams.availabilityEndTime = new Date(selectedEndTime).toTimeString().slice(0, 5);
		}
	}

	const { caregivers } = useCaregivers({ params: caregiverParams });

	function handleSelectCaregiver(cg) {
		setSelectedCaregiver(cg);
		setCaregiverInput(`${cg.firstName} ${cg.lastName}`);
		setShowCaregiverDropdown(false);
		setValue("caregiverId", cg.id);
	}

	function handleClearCaregiver() {
		setSelectedCaregiver(null);
		setCaregiverInput("");
		setCaregiverSearch("");
		setShowCaregiverDropdown(false);
		setValue("caregiverId", "");
	}

	// ── Task list ──────────────────────────────────────────────────────────────

	const [tasks, setTasks] = useState([]);
	const [newTaskText, setNewTaskText] = useState("");

	function addTask() {
		const text = newTaskText.trim();
		if (!text) return;
		setTasks((prev) => [...prev, { id: Date.now(), text }]);
		setNewTaskText("");
	}

	function removeTask(id) {
		setTasks((prev) => prev.filter((t) => t.id !== id));
	}

	// ── Submit ─────────────────────────────────────────────────────────────────

	const { addShift, isShiftActionPending, actionShiftError } = useShifts();

	async function onSubmit(data) {
		const geofenceStreet = data.geofenceStreet;
		const geofenceCity = data.geofenceCity;

		const shiftData = {
			caregiverId: data.caregiverId,
			startTime: data.startTime,
			endTime: data.endTime,
			timezone: "America/Halifax",
			notes: data.shiftNotes || undefined,
			tasks: tasks.map((t) => ({ description: t.text, completed: false })),
		};

		// Exactly one target
		if (targetType === "client" && data.clientId) {
			shiftData.clientId = data.clientId;
		} else if (targetType === "home" && data.homeId) {
			shiftData.homeId = data.homeId;
		}

		// Geofence — only include if user selected an address
		if (hasAddressSelected && (geofenceStreet || geofenceCity)) {
			shiftData.geofence = {
				center: {
					latitude: mapCenter.lat,
					longitude: mapCenter.lng,
				},
				radius: 100,
				shape: "circle",
				address: geofenceAddress || undefined,
			};
		}

		try {
			await addShift(shiftData);
			router.push("/scheduling");
		} catch {
			// error stored in actionShiftError
		}
	}

	// ── Min values for time pickers (recalculate each render) ─────────────────
	const nowLocal = new Date().toISOString().slice(0, 16);

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<PageLayout>

			{/* Page header */}
			<div className={styles.header}>
				<h1>Create New Shift</h1>
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/scheduling")}>Cancel</Button>
					<Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isShiftActionPending}>
						{isShiftActionPending ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			{actionShiftError && <ActionMessage variant="error" message={actionShiftError} />}

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.cards}>

					{/* ── Left: Target (Client / Home) ── */}
					<Card>
						<CardHeader>Assign to Client or Home</CardHeader>
						<CardContent>

							{/* Selector dropdown */}
							<div className={styles.card_row_1}>
								<label className={styles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>
									Shift Target
								</label>
								<select
									className={styles.input}
									style={{ paddingLeft: '0.75rem' }}
									value={targetType}
									onChange={(e) => handleTargetChange(e.target.value)}
								>
									<option value="client">Client</option>
									<option value="home">Home</option>
								</select>
							</div>

							{/* ── CLIENT mode ── */}
							{targetType === "client" && (
								<>
									<div className={styles.searchContainer}>
										<label className={styles.label}>Search Client</label>
										<div className={styles.searchWrapper}>
											<Search className={styles.searchIcon} />
											<input
												type="text"
												placeholder="Type to search clients..."
												className={`${styles.input} ${errors.clientId ? cardStyles.input_error : ""}`}
												value={clientInput}
												onChange={(e) => { setClientInput(e.target.value); setShowClientDropdown(true); }}
												onFocus={() => setShowClientDropdown(true)}
												onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
												readOnly={!!selectedClient}
												style={selectedClient ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
											/>
											{selectedClient && (
												<X size={16} style={{ position: "absolute", right: 10, cursor: "pointer", color: "#6b7280" }} onClick={handleClearClient} />
											)}
										</div>
										{showClientDropdown && !selectedClient && clients?.length > 0 && (
											<div className={styles.searchResultsDropdown}>
												{clients.map((client) => (
													<div key={client.id} className={styles.searchResultItem} onMouseDown={() => handleSelectClient(client)}>
														{client.firstName} {client.lastName} — {client.email}
													</div>
												))}
											</div>
										)}
										{errors.clientId && (
											<p className={cardStyles.error_text}>{errors.clientId.message}</p>
										)}
									</div>

									{/* Autofilled client info */}
									{selectedClient && (
										<>
											<div className={styles.card_row_2}>
												<input type="hidden" {...register("clientId")} />
												<InputField label="Client ID" name="clientDisplayId" register={register} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} value={selectedClient.clientId || ""} />
												<InputField label="Client Phone" name="clientPhone" register={register} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} value={selectedClient.phone || ""} />
											</div>
											<div className={styles.card_row_1}>
												<div style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", border: "1px solid #dee1e6", padding: "0.55rem 0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
													<span style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: "0.2rem" }}>Client Address</span>
													{joinAddress(selectedClient.address) || "—"}
												</div>
											</div>
										</>
									)}
								</>
							)}

							{/* ── HOME mode ── */}
							{targetType === "home" && (
								<>
									<div className={styles.searchContainer}>
										<label className={styles.label}>Search Home</label>
										<div className={styles.searchWrapper}>
											<Search className={styles.searchIcon} />
											<input
												type="text"
												placeholder="Type to search homes..."
												className={`${styles.input} ${errors.homeId ? cardStyles.input_error : ""}`}
												value={homeInput}
												onChange={(e) => { setHomeInput(e.target.value); setShowHomeDropdown(true); }}
												onFocus={() => setShowHomeDropdown(true)}
												onBlur={() => setTimeout(() => setShowHomeDropdown(false), 150)}
												readOnly={!!selectedHome}
												style={selectedHome ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
											/>
											{selectedHome && (
												<X size={16} style={{ position: "absolute", right: 10, cursor: "pointer", color: "#6b7280" }} onClick={handleClearHome} />
											)}
										</div>
										{showHomeDropdown && !selectedHome && (
											<div className={styles.searchResultsDropdown}>
												{homes?.length > 0 ? homes.map((home) => (
													<div key={home.id || home._id} className={styles.searchResultItem} onMouseDown={() => handleSelectHome(home)}>
														{home.name || home.homeName || `Home ${home.id || home._id}`}
													</div>
												)) : (
													<div className={styles.searchResultItem} style={{ color: "#9ca3af" }}>
														{homeInput.length > 0 ? "No homes found" : "Type to search..."}
													</div>
												)}
											</div>
										)}
										{errors.homeId && (
											<p className={cardStyles.error_text}>{errors.homeId.message}</p>
										)}
									</div>

									{/* Autofilled home info */}
									{selectedHome && (
										<>
											<div className={styles.card_row_2}>
												<InputField label="Home Name" name="homeName" register={register} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} value={selectedHome.name || selectedHome.homeName || ""} />
												<InputField label="Home ID" name="homeId" register={register} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} />
											</div>
											<div className={styles.card_row_1}>
												<div style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", border: "1px solid #dee1e6", padding: "0.55rem 0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
													<span style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: "0.2rem" }}>Home Address</span>
													{joinAddress(selectedHome.address) || "—"}
												</div>
											</div>
										</>
									)}
								</>
							)}

							{/* Contact person (display only, not submitted)
							<div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
								<p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: "0.75rem" }}>Contact Person (optional)</p>
								<div className={styles.card_row_2}>
									<InputField label="First Name" name="contactFName" register={register} error={errors.contactFName} />
									<InputField label="Last Name" name="contactLName" register={register} error={errors.contactLName} />
								</div>
								<div className={styles.card_row_1}>
									<InputField label="Phone" name="contactPhone" type="phone" register={register} error={errors.contactPhone} />
								</div>
							</div>
							*/}

						</CardContent>
					</Card>

					{/* ── Right column ── */}
					<div className={styles.column}>

						{/* Shift details */}
						<Card>
							<CardHeader>Shift Information</CardHeader>
							<CardContent>

								{/* Atlantic timezone notice */}
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									backgroundColor: "#eff6ff",
									border: "1px solid #bfdbfe",
									borderRadius: "6px",
									padding: "0.65rem 0.9rem",
									marginBottom: "1.25rem",
									fontSize: "0.85rem",
									color: "#1e40af",
								}}>
									<Clock size={15} style={{ flexShrink: 0 }} />
									<span>You are creating this shift based on <strong>Atlantic Time (America/Halifax)</strong>.</span>
								</div>

								<div className={styles.card_row_2}>
									<InputField
										label="Start Time"
										type="datetime-local"
										name="startTime"
										register={register}
										control={control}
										error={errors.startTime}
										min={nowLocal}
									/>
									<InputField
										label="End Time"
										type="datetime-local"
										name="endTime"
										register={register}
										control={control}
										error={errors.endTime}
										min={selectedStartTime || nowLocal}
									/>
								</div>
								<InputField label="Shift Notes" name="shiftNotes" register={register} />
							</CardContent>
						</Card>

						{/* Caregiver assignment */}
						<Card>
							<CardHeader>Caregiver Assignment</CardHeader>
							<CardContent>
								<div className={styles.searchContainer}>
									<label className={styles.label}>Search Caregiver</label>
									<div className={styles.searchWrapper}>
										<Search className={styles.searchIcon} />
										<input
											type="text"
											placeholder="Type to search caregivers..."
											className={`${styles.input} ${errors.caregiverId ? cardStyles.input_error : ""}`}
											value={caregiverInput}
											onChange={(e) => { setCaregiverInput(e.target.value); setShowCaregiverDropdown(true); }}
											onFocus={() => setShowCaregiverDropdown(true)}
											onBlur={() => setTimeout(() => setShowCaregiverDropdown(false), 150)}
											readOnly={!!selectedCaregiver}
											style={selectedCaregiver ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
										/>
										{selectedCaregiver && (
											<X size={16} style={{ position: "absolute", right: 10, cursor: "pointer", color: "#6b7280" }} onClick={handleClearCaregiver} />
										)}
									</div>
									{showCaregiverDropdown && !selectedCaregiver && caregivers?.length > 0 && (
										<div className={styles.searchResultsDropdown}>
											{caregivers.map((cg) => (
												<div key={cg.id} className={styles.searchResultItem} onMouseDown={() => handleSelectCaregiver(cg)}>
													{cg.firstName} {cg.lastName}
												</div>
											))}
										</div>
									)}
									{errors.caregiverId && (
										<p className={cardStyles.error_text}>{errors.caregiverId.message}</p>
									)}
								</div>
							</CardContent>
						</Card>

					</div>
				</div>

				{/* ── Task list ── */}
				<div className={styles.cards}>
					<Card>
						<CardHeader>Task List</CardHeader>
						<div className={styles.taskInputGroup}>
							<input
								className={styles.input}
								style={{ paddingLeft: "0.75rem" }}
								value={newTaskText}
								onChange={(e) => setNewTaskText(e.target.value)}
								placeholder="Add a task..."
								onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
							/>
							<Button type="button" onClick={addTask}><Plus size={16} /></Button>
						</div>
						<div className={styles.taskList}>
							{tasks.map((t) => (
								<div key={t.id} className={styles.taskItem}>
									<span>{t.text}</span>
									<button type="button" className={styles.iconButton} onClick={() => removeTask(t.id)}>
										<Trash2 size={16} />
									</button>
								</div>
							))}
						</div>
					</Card>
				</div>

				{/* ── Service Location ── */}
				<Card>
					<CardHeader>Service Location</CardHeader>
					<div className={styles.gps}>
						<div className={styles.left}>
							<div style={{ position: "relative", width: "100%", height: "350px", border: "1px solid #DEE1E6FF", borderRadius: "8px", overflow: "hidden" }}>
								<GeofenceMap
									center={mapCenter}
									radius={100}
									onMapReady={(refs) => { mapRefsRef.current = refs; }}
									height="100%"
								/>
							</div>
						</div>
						<div className={styles.right}>
							<AddressAutocomplete
								label="Search Service Address"
								onAddressSelect={handleAddressSelect}
								placeholder="Start typing an address..."
								id="shift-address-autocomplete"
								register={register}
								error={errors.geofenceStreet?.message}
								mode="split"
								fieldNames={{
									street: "geofenceStreet",
									city: "geofenceCity",
									state: "geofenceProvince",
									postalCode: "geofencePostalCode",
									country: null,
								}}
							/>
						</div>
					</div>
				</Card>

			</form>
		</PageLayout>
	);
}