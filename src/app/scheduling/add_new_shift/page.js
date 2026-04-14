"use client";

// ─── Step 1: Import libraries ──────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Plus, X } from "lucide-react";

// ─── Step 2: Import our project's custom Hooks (these connect to the API) ───────
import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useShifts } from "@/hooks/useShifts";
import { useGoogleMap } from "@/hooks/useGoogleMap";

// ─── Step 3: Import UI components ───────────────────────────────────────────────
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import ActionMessage from "@components/UI/ActionMessage";
import styles from "./add_new_shift.module.css";
import cardStyles from "@components/UI/Card.module.css";

// ─── Step 4: Form validation rules ──────────────────────────────────────────────
import { IdRule, nameRule, phoneRule, shortTextRule, longTextRule } from "@/utils/validation";

const now = new Date().toISOString().slice(0, 16);

const schema = yup.object({
	caregiverId: IdRule.required("Please select a caregiver"),
	clientId: IdRule.required("Please select a client"),
	clientPhone: phoneRule.required("Client phone is required"),
	clientAddress: longTextRule.optional(),
	startTime: yup.string().required("Start time is required")
		.test("is-future", "Start time must be in the future", (v) => new Date(v) > new Date()),
	endTime: yup.string().required("End time is required")
		.test("is-after-start", "End time must be after start time", function (v) {
			return new Date(v) > new Date(this.parent.startTime);
		}),
	serviceInput: shortTextRule.required("Services required field cannot be empty"),
	contactFName: nameRule.optional(),
	contactLName: nameRule.optional(),
	contactPhone: phoneRule.optional(),
	shiftNotes: shortTextRule.optional(),
	geofenceRadius: yup.number().optional(),
	alertOnEntry: yup.boolean().notRequired(),
	alertOnExit: yup.boolean().notRequired(),
});

// ─── Utility functions ───────────────────────────────────────────────────────────
// Joins an address object into a single string
function joinAddress({ street, city, state, pinCode } = {}) {
	return [street, city, state, pinCode].filter(Boolean).join(", ");
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const QUICK_TAGS = ["Urgent", "New Client"];

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function AddNewShiftPage() {
	const router = useRouter();

	// ── 1. Form management (react-hook-form) ────────────────────────────────────────
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm({ resolver: yupResolver(schema) });

	// Watch these fields for conditional logic
	const selectedStartTime = watch("startTime");
	const selectedEndTime = watch("endTime");
	const geofenceRadius = watch("geofenceRadius");

	// ── 2. Google Map Hook ──────────────────────────────────────────────────────────
	const { mapRef, inputRef, isLoaded, loadError, center: mapCenter, updateRadius } = useGoogleMap();

	useEffect(() => {
		updateRadius(geofenceRadius);
	}, [geofenceRadius, updateRadius]);

	// If start time changes and end time is now before it, auto-clear end time
	useEffect(() => {
		if (selectedStartTime && selectedEndTime) {
			if (new Date(selectedEndTime) <= new Date(selectedStartTime)) {
				setValue("endTime", "");
			}
		}
	}, [selectedStartTime, selectedEndTime, setValue]);

	// ── 3. Client search (using useClients hook) ───────────────────────────────────
	//
	// How it works:
	//   - clientInput: what the user types (updates instantly for a smooth UI)
	//   - clientSearch: updates only 400ms after the user stops typing (avoids an API call on every keystroke)
	//   - useClients uses clientSearch as its query param and returns matching clients
	//   - When the user clicks a result, the client info is filled into the form and the input is locked
	//
	const [clientInput, setClientInput] = useState("");
	const [clientSearch, setClientSearch] = useState("");
	const [selectedClient, setSelectedClient] = useState(null); // The currently selected client object
	const [showClientDropdown, setShowClientDropdown] = useState(false);

	// Debounce: only trigger the actual search 400ms after the user stops typing
	useEffect(() => {
		const timer = setTimeout(() => setClientSearch(clientInput), 400);
		return () => clearTimeout(timer);
	}, [clientInput]);

	// Use the useClients hook to search (only fires when there is a search term)
	const { clients } = useClients({
		params: { page: 1, limit: 5, search: clientSearch },
	});

	// Called when the user clicks a result in the dropdown
	function handleSelectClient(client) {
		setSelectedClient(client);
		setClientInput(`${client.firstName} ${client.lastName}`);
		setShowClientDropdown(false);
		// Fill hidden form fields with the selected client's data
		setValue("clientId", client.clientId);
		setValue("clientPhone", client.phone || "");
		setValue("clientAddress", joinAddress(client.address));
	}

	// Called when the user clicks ✕ to clear the selected client
	function handleClearClient() {
		setSelectedClient(null);
		setClientInput("");
		setClientSearch("");
		setShowClientDropdown(false);
		setValue("clientId", "");
		setValue("clientPhone", "");
		setValue("clientAddress", "");
	}

	// ── 4. Caregiver search (using useCaregivers hook) ─────────────────────────────
	//
	// Same logic as client search, with one addition: caregiver availability is
	// filtered by the selected shift start/end time.
	//
	const [caregiverInput, setCaregiverInput] = useState("");
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [selectedCaregiver, setSelectedCaregiver] = useState(null);
	const [showCaregiverDropdown, setShowCaregiverDropdown] = useState(false);

	// Debounce
	useEffect(() => {
		const timer = setTimeout(() => setCaregiverSearch(caregiverInput), 400);
		return () => clearTimeout(timer);
	}, [caregiverInput]);

	// Build caregiver search params — filter by availability if a shift time is selected
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

	// ── 5. Task list management ─────────────────────────────────────────────────────
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

	// ── 6. Tag management ───────────────────────────────────────────────────────────
	const [selectedTags, setSelectedTags] = useState([]);
	const [customTagInput, setCustomTagInput] = useState("");

	function toggleTag(tag) {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	}

	function addCustomTag() {
		const tag = customTagInput.trim();
		if (tag && !selectedTags.includes(tag)) {
			setSelectedTags((prev) => [...prev, tag]);
		}
		setCustomTagInput("");
	}

	// ── 7. Form submission (using useShifts hook) ───────────────────────────────────
	const { addShift, isActionPending, isError, errorMessage } = useShifts();

	async function onSubmit(data) {
		const shiftData = {
			caregiverId: data.caregiverId,
			clientId: data.clientId,
			clientAddress: data.clientAddress,
			clientPhone: data.clientPhone,
			contactPerson: {
				name: `${data.contactFName || ""} ${data.contactLName || ""}`.trim(),
				phone: data.contactPhone,
			},
			startTime: data.startTime,
			endTime: data.endTime,
			servicesRequired: data.serviceInput.split(",").map((s) => s.trim()),
			notes: data.shiftNotes,
			tasks: tasks.map((t) => ({ description: t.text, completed: false })),
			isOpenShift: false,
			recurringShift: { isRecurring: false },
			tags: selectedTags,
			geofence: {
				center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
				radius: data.geofenceRadius || 100,
				shape: "circle",
				alertOnEntry: data.alertOnEntry || false,
				alertOnExit: data.alertOnExit || false,
			},
		};

		await addShift(shiftData);
		router.push("/scheduling");
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Render UI
	// ─────────────────────────────────────────────────────────────────────────
	return (
		<PageLayout>

			{/* Page header */}
			<div className={styles.header}>
				<h1>Create New Shift</h1>
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/scheduling")}>Cancel</Button>
					<Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isActionPending}>
						{isActionPending ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			{/* Error banner */}
			{isError && <ActionMessage variant="error" message={errorMessage} />}

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.cards}>

					{/* ── Client Information ── */}
					<Card>
						<CardHeader>Client Information</CardHeader>
						<CardContent>

							{/* Client search input */}
							<div className={styles.searchContainer}>
								<label className={styles.label}>Client Name</label>
								<div className={styles.searchWrapper}>
									<Search className={styles.searchIcon} />
									<input
										type="text"
										placeholder="Type to search clients..."
										className={styles.input}
										value={clientInput}
										onChange={(e) => {
											setClientInput(e.target.value);
											setShowClientDropdown(true);
										}}
										onFocus={() => setShowClientDropdown(true)}
										readOnly={!!selectedClient}
										style={selectedClient ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
									/>
									{/* Show clear (✕) button only when a client is selected */}
									{selectedClient && (
										<X
											size={16}
											style={{ position: "absolute", right: 10, cursor: "pointer", color: "#6b7280" }}
											onClick={handleClearClient}
										/>
									)}
								</div>
								{/* Search results dropdown */}
								{showClientDropdown && !selectedClient && clients.length > 0 && (
									<div className={styles.searchResultsDropdown}>
										{clients.map((client) => (
											<div
												key={client.id}
												className={styles.searchResultItem}
												onMouseDown={() => handleSelectClient(client)}
											>
												{client.firstName} {client.lastName} — {client.email}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Read-only fields auto-filled after client selection */}
							<div className={styles.card_row_2}>
								<InputField label="Client ID" name="clientId" register={register} error={errors.clientId?.message} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} />
								<InputField label="Client Phone" name="clientPhone" register={register} error={errors.clientPhone?.message} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} />
							</div>
							<div className={styles.card_row_1}>
								<InputField label="Address" name="clientAddress" register={register} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6" }} />
							</div>

							{/* Contact person — filled in manually */}
							<div className={styles.card_row_2}>
								<InputField label="Contact First Name" name="contactFName" register={register} error={errors.contactFName} />
								<InputField label="Contact Last Name" name="contactLName" register={register} error={errors.contactLName} />
							</div>
							<div className={styles.card_row_1}>
								<InputField label="Contact Phone" name="contactPhone" register={register} error={errors.contactPhone} />
							</div>

						</CardContent>
					</Card>

					{/* ── Right column: shift details + caregiver assignment ── */}
					<div className={styles.column}>

						{/* Shift details */}
						<Card>
							<CardHeader>Shift Information</CardHeader>
							<CardContent>
								<div className={styles.card_row_2}>
									<InputField label="Start Time" type="datetime-local" name="startTime" register={register} error={errors.startTime} min={now} />
									<InputField label="End Time" type="datetime-local" name="endTime" register={register} error={errors.endTime} min={selectedStartTime || now} />
								</div>
								<InputField label="Services Required" name="serviceInput" register={register} error={errors.serviceInput} placeholder="e.g. Cooking, Bathing" />
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
											className={styles.input}
											value={caregiverInput}
											onChange={(e) => {
												setCaregiverInput(e.target.value);
												setShowCaregiverDropdown(true);
											}}
											onFocus={() => setShowCaregiverDropdown(true)}
											readOnly={!!selectedCaregiver}
											style={selectedCaregiver ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
										/>
										{selectedCaregiver && (
											<X
												size={16}
												style={{ position: "absolute", right: 10, cursor: "pointer", color: "#6b7280" }}
												onClick={handleClearCaregiver}
											/>
										)}
									</div>
									{showCaregiverDropdown && !selectedCaregiver && caregivers.length > 0 && (
										<div className={styles.searchResultsDropdown}>
											{caregivers.map((cg) => (
												<div
													key={cg.id}
													className={styles.searchResultItem}
													onMouseDown={() => handleSelectCaregiver(cg)}
												>
													{cg.firstName} {cg.lastName}
												</div>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>

					</div>
				</div>

				{/* ── Second row: task list + additional options ── */}
				<div className={styles.cards}>

					{/* Task list */}
					<Card>
						<CardHeader>Task List</CardHeader>
						<div className={styles.taskInputGroup}>
							<input
								className={styles.input}
								value={newTaskText}
								onChange={(e) => setNewTaskText(e.target.value)}
								placeholder="Add a task..."
								onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
							/>
							<Button type="button" onClick={addTask}>Add</Button>
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

					{/* Additional options (tags) */}
					<Card>
						<CardHeader>Additional Options</CardHeader>
						<CardContent>

							{/* Recurring shift toggle */}
							<div className={styles.toggleRow}>
								<label className={styles.label}>Recurring Shift</label>
								<label className={styles.switch}>
									<input type="checkbox" {...register("isRecurring")} />
									<span className={styles.slider}></span>
								</label>
							</div>

							<hr className={styles.divider} />

							{/* Selected tags */}
							<div className={styles.selectedTagsContainer}>
								{selectedTags.map((tag) => (
									<span key={tag} className={styles.pill}>
										{tag}
										<button type="button" className={styles.removeTagBtn} onClick={() => toggleTag(tag)}>✕</button>
									</span>
								))}
							</div>

							{/* Custom tag input */}
							<div className={styles.tagsGroup}>
								<div className={styles.searchWrapper}>
									<Plus size={16} className={styles.searchIcon} />
									<input
										type="text"
										className={styles.input}
										placeholder="Add custom tag..."
										value={customTagInput}
										onChange={(e) => setCustomTagInput(e.target.value)}
										onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
									/>
								</div>
								<Button type="button" onClick={addCustomTag}>Add</Button>
							</div>

							{/* Quick tag buttons */}
							<div className={styles.formGroup} style={{ marginTop: "15px" }}>
								<label className={styles.label}>Quick Tags:</label>
								<div className={styles.tagCandidateList}>
									{QUICK_TAGS.map((tag) => (
										<button
											key={tag}
											type="button"
											className={`${styles.candidateTag} ${selectedTags.includes(tag) ? styles.activeCandidate : ""}`}
											onClick={() => toggleTag(tag)}
										>
											{selectedTags.includes(tag) ? "✓ " : "+ "}{tag}
										</button>
									))}
								</div>
							</div>

						</CardContent>
					</Card>
				</div>

				{/* ── Geofence ── */}
				<Card>
					<CardHeader>Geofence Customization</CardHeader>
					<div className={styles.gps}>
						<div className={styles.left}>
							<div className={styles.mapContainer} style={{ position: "relative", width: "100%", height: "350px" }}>
								{!isLoaded && (
									<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
										Loading Map...
									</div>
								)}
								<div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: "8px", minHeight: "350px" }} />
							</div>
						</div>
						<div className={styles.right}>
							<label className={styles.label}>Location Address</label>
							<input
								ref={inputRef}
								type="text"
								placeholder="Search address..."
								className={cardStyles.input}
								style={{ marginBottom: "10px" }}
							/>
							<InputField
								label="Geofence Radius (meters)"
								type="select"
								name="geofenceRadius"
								register={register}
								error={errors.geofenceRadius?.message}
								options={[
									{ label: "100m", value: 100 },
									{ label: "200m", value: 200 },
									{ label: "300m", value: 300 },
								]}
							/>
							<div className={styles.checkboxGroup}>
								<label className={styles.checkboxLabel}>
									<input type="checkbox" {...register("alertOnEntry")} />
									<span>Alert on Caregiver Entry</span>
								</label>
								<label className={styles.checkboxLabel}>
									<input type="checkbox" {...register("alertOnExit")} />
									<span>Alert on Caregiver Exit</span>
								</label>
							</div>
						</div>
					</div>
				</Card>

			</form>
		</PageLayout>
	);
}