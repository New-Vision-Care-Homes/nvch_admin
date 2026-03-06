"use client";

import react, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Plus, X } from "lucide-react";

import { useGoogleMap } from "@/hooks/useGoogleMap";
import { useShifts } from "@/hooks/useShifts";

// Component & Style Imports
import PageLayout from "@components/layout/PageLayout";
import styles from "./add_new_shift.module.css";
import cardStyles from "@components/UI/Card.module.css"; // Import card styles for consistent input styling
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import { IdRule, nameRule, phoneRule, shortTextRule, longTextRule } from "@app/validation";

const now = new Date().toISOString().slice(0, 16);
// --- 1. VALIDATION SCHEMA ---
const schema = yup.object({
	caregiverId: IdRule.required("Caregiver is required"),
	clientId: IdRule.required("Client is required"),
	clientPhone: phoneRule.required("Client Phone is required"),
	clientAddress: longTextRule.optional(),
	startTime: yup.string()
		.required("Start Time is required")
		.test("is-future", "Start time must be in the future", (value) => {
			return new Date(value) > new Date();
		}),
	endTime: yup.string()
		.required("End Time is required")
		.test("is-after-start", "End time must be after start time", function (value) {
			const { startTime } = this.parent;
			return new Date(value) > new Date(startTime);
		}),
	serviceInput: shortTextRule.required("Services Required is required"),
	contactFName: nameRule.optional(),
	contactLName: nameRule.optional(),
	contactPhone: phoneRule.optional(),
	shiftNotes: shortTextRule.optional(),
	assignedCaregiver: nameRule.optional(),
	openShift: yup.boolean().notRequired(),
	geofenceRadius: yup.number().optional(),
	alertOnEntry: yup.boolean().notRequired(),
	alertOnExit: yup.boolean().notRequired(),
});

export default function Page() {

	const router = useRouter();

	const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
		resolver: yupResolver(schema),

	});

	const geofenceRadius = watch("geofenceRadius");

	// --- 1. USE GOOGLE MAP HOOK ---
	const {
		mapRef,
		inputRef,
		isLoaded,
		loadError,
		address: mapAddress,
		center: mapCenter,
		updateRadius
	} = useGoogleMap();


	// Update map radius when form input changes
	useEffect(() => {
		updateRadius(geofenceRadius);
	}, [geofenceRadius, updateRadius]);

	const selectedStartTime = watch("startTime");
	const selectedEndTime = watch("endTime");
	useEffect(() => {
		if (selectedStartTime && selectedEndTime) {
			const start = new Date(selectedStartTime).getTime();
			const end = new Date(selectedEndTime).getTime();

			if (end <= start) {
				setValue("endTime", "");
			}
		}
	}, [selectedStartTime, selectedEndTime, setValue]);

	const isOpenShift = watch("openShift");

	// --- 2. UTILITY FUNCTIONS ---
	const debounce = (func, delay) => {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	};


	// ==========================================
	// --- 3. CLIENT SEARCH LOGIC ---
	// ==========================================
	const [clientSearchTerm, setClientSearchTerm] = useState('');
	const [clientResults, setClientResults] = useState([]);
	const [showClientResults, setShowClientResults] = useState(false);
	const [selectedClientName, setSelectedClientName] = useState('');

	const fetchClients = async (search) => {
		if (search.length < 2) return;
		const token = localStorage.getItem("token");
		try {
			const url = `https://nvch-server.onrender.com/api/auth/admin/clients?page=1&limit=5&search=${encodeURIComponent(search)}`;
			const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			//test
			console.log("searched result: ", data.data.clients);
			setClientResults(data.data.clients || []);
			setShowClientResults(true);
		} catch (err) { console.error("Client fetch error", err); }
	};

	const debouncedFetchClients = useCallback(debounce(fetchClients, 500), []);

	useEffect(() => {
		if (clientSearchTerm && clientSearchTerm !== selectedClientName) debouncedFetchClients(clientSearchTerm);
	}, [clientSearchTerm]);

	const handleClientSelect = (client) => {
		const fullName = `${client.firstName} ${client.lastName}`;
		setValue('clientId', client.id);
		setValue('clientPhone', client.phone || '');
		setValue('clientAddress', client.address.street + " " + client.address.city + " " + client.address.state + " " + client.address.pinCode || '');
		setSelectedClientName(fullName);
		setClientSearchTerm(fullName);
		setShowClientResults(false);
	};


	// ==========================================
	// --- 4. CAREGIVER SEARCH LOGIC ---
	// ==========================================
	const [cgSearchTerm, setCgSearchTerm] = useState('');
	const [cgResults, setCgResults] = useState([]);
	const [showCgResults, setShowCgResults] = useState(false);
	const [selectedCgName, setSelectedCgName] = useState('');

	const fetchCaregivers = async (search) => {
		if (search.length < 2) return;

		const startVal = watch("startTime");
		const endVal = watch("endTime");

		const token = localStorage.getItem("token");

		try {
			let url = `https://nvch-server.onrender.com/api/auth/admin/caregivers?page=1&limit=10&search=${encodeURIComponent(search)}&isActive=true`;

			if (startVal) {
				const startDate = new Date(startVal);

				const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
				const day = dayNames[startDate.getDay()];

				const formatTime = (date) => {
					return date.toTimeString().slice(0, 5);
				};

				url += `&availabilityDay=${day}`;
				url += `&availabilityStartTime=${formatTime(startDate)}`;

				if (endVal) {
					const endDate = new Date(endVal);
					url += `&availabilityEndTime=${formatTime(endDate)}`;
				}
			}

			const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();

			setCgResults(data.data.caregivers || []);
			console.log("caregivers: ", data);
			setShowCgResults(true);
		} catch (err) {
			console.error("Caregiver fetch error", err);
		}
	};

	const debouncedFetchCgs = useCallback(debounce(fetchCaregivers, 500), []);

	useEffect(() => {
		if (cgSearchTerm && cgSearchTerm !== selectedCgName) debouncedFetchCgs(cgSearchTerm);
	}, [cgSearchTerm]);

	const handleCgSelect = (cg) => {
		const fullName = `${cg.firstName} ${cg.lastName}`;
		setValue('caregiverId', cg.id || cg.id);
		setValue('assignedCaregiver', fullName);
		setSelectedCgName(fullName);
		setCgSearchTerm(fullName);
		setShowCgResults(false);
	};


	// ==========================================
	// --- 5. TASK LIST MANAGEMENT ---
	// ==========================================
	const [tasks, setTasks] = useState([]);
	const [newTask, setNewTask] = useState('');

	const addTask = () => {
		if (newTask.trim()) {
			setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
			setNewTask('');
		}
	};

	const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));



	// ==========================================
	// --- 6. FORM SUBMISSION ---
	// ==========================================

	const {
		addShift,
		isActionPending,
		isError,
		errorMessage
	} = useShifts();

	const onSubmit = async (data) => {
		try {
			const shiftData = {
				caregiverId: data.caregiverId,
				clientId: data.clientId,
				clientAddress: data.clientAddress,
				clientPhone: data.clientPhone,
				contactPerson: { name: `${data.contactFName} ${data.contactLName}`, phone: data.contactPhone },
				startTime: data.startTime,
				endTime: data.endTime,
				servicesRequired: data.serviceInput.split(',').map(s => s.trim()),
				notes: data.shiftNotes,

				tasks: tasks.map(t => ({ description: t.text, completed: false })),
				isOpenShift: data.openShift || false,
				recurringShift: {
					isRecurring: false
				},
				tags: selectedTags,
				geofence: {
					center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
					radius: data.geofenceRadius || 500,
					shape: "circle",
					alertOnEntry: data.alertOnEntry || false,
					alertOnExit: data.alertOnExit || false
				}
			};

			console.log("shiftdata: ", shiftData);

			await addShift(shiftData);
			router.push("/scheduling");
		} catch (error) {
			const msg = error.response?.data?.message || error.message || "Failed to create shift";
			alert(`Error: ${msg}`);
		}
	};

	// ==========================================
	// --- 7. TAGS MANAGEMENT ---
	// ==========================================
	const quickTags = ["Urgent", "New Client"];
	const [selectedTags, setSelectedTags] = useState([]); //Initial default tags
	const [tagInput, setTagInput] = useState('');

	// Toggle a tag (Add if not there, remove if it is)
	const toggleTag = (tag) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter(t => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	// Add a custom tag from the input
	const addCustomTag = (e) => {
		const trimmedValue = tagInput.trim();
		if (trimmedValue && !selectedTags.includes(trimmedValue)) {
			setSelectedTags([...selectedTags, trimmedValue]);
		}
		setTagInput('');
	};

	// Explicitly remove a tag (called by the 'X' button)
	const removeTag = (tagToRemove) => {
		setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
	};

	// Sync with React Hook Form (so it gets sent to API)
	useEffect(() => {
		setValue('tags', selectedTags);
	}, [selectedTags, setValue]);


	if (loadError) return <div>Error loading maps</div>;

	return (
		<PageLayout>
			{/* 1. HEADER SECTION */}
			<div className={styles.header}>
				<h1>Create New Shift</h1>
				{isError && <div style={{ color: "red", marginRight: "1rem", fontWeight: "bold" }}>{errorMessage}</div>}
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/scheduling")}>Cancel</Button>
					<Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isActionPending}>
						{isActionPending ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.cards}>

					{/* 2. CLIENT INFORMATION CARD */}
					<Card>
						<CardHeader>Client Information</CardHeader>
						<CardContent>
							<div className={styles.searchContainer}>
								<label className={styles.label}>Client Name</label>
								<div className={styles.searchWrapper}>
									<Search className={styles.searchIcon} />
									<input
										type="text"
										placeholder="Search clients..."
										className={styles.input}
										value={clientSearchTerm}
										onChange={(e) => setClientSearchTerm(e.target.value)}
										onFocus={() => setShowClientResults(true)}
										readOnly={!!selectedClientName}
										style={selectedClientName ? { backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" } : {}}
									/>
									{selectedClientName && (
										<X
											size={16}
											style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}
											onClick={() => {
												setClientSearchTerm('');
												setSelectedClientName('');
												setValue('clientId', '');
												setValue('clientPhone', '');
												setValue('clientAddress', '');
												setShowClientResults(false);
											}}
										/>
									)}
								</div>
								{showClientResults && clientResults.length > 0 && (
									<div className={styles.searchResultsDropdown}>
										{clientResults.map(c => (
											<div key={c.id} className={styles.searchResultItem} onMouseDown={() => handleClientSelect(c)}>
												{c.firstName} {c.lastName} ({c.email})
											</div>
										))}
									</div>
								)}
							</div>

							<div className={styles.card_row_2}>
								<InputField label="Client ID" name="clientId" register={register} error={errors.clientId?.message} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }} />
								<InputField label="Client Phone" name="clientPhone" register={register} error={errors.clientPhone?.message} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }} />
							</div>
							<div className={styles.card_row_1}>
								<InputField label="Address" name="clientAddress" register={register} error={errors.clientAddress} readOnly tabIndex={-1} style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }} />
							</div>
							<div className={styles.card_row_2}>
								<InputField label="Contact First Name" name="contactFName" register={register} error={errors.contactFName} />
								<InputField label="Contact Last Name" name="contactLName" register={register} error={errors.contactLName} />
							</div>
							<div className={styles.card_row_1}>
								<InputField label="Contact Phone" name="contactPhone" register={register} error={errors.contactPhone} />
							</div>
						</CardContent>
					</Card>

					<div className={styles.column}>
						{/* 3. SHIFT DETAILS CARD */}
						<Card>
							<CardHeader>Shift Information</CardHeader>
							<CardContent>
								<div className={styles.card_row_2}>
									<InputField
										label="Start"
										type="datetime-local"
										name="startTime"
										register={register}
										error={errors.startTime}
										min={now}
									/>
									<InputField
										label="End"
										type="datetime-local"
										name="endTime"
										register={register}
										error={errors.endTime}
										min={selectedStartTime || now}
									/>
								</div>
								<InputField label="Services Required" name="serviceInput" register={register} placeholder="e.g. Cooking, Bathing" />
								<InputField label="Shift Notes" name="shiftNotes" register={register} />
							</CardContent>
						</Card>

						{/* 4. CAREGIVER ASSIGNMENT CARD (WITH SEARCH) */}
						<Card>
							<CardHeader>Caregiver Assignment</CardHeader>
							<CardContent>
								<div className={styles.searchContainer}>
									<label className={styles.label}>Search Caregiver</label>
									<div className={styles.searchWrapper}>
										<Search className={styles.searchIcon} />
										<input
											type="text"
											placeholder="Search caregivers..."
											disabled={isOpenShift}
											className={styles.input}
											value={cgSearchTerm}
											onChange={(e) => setCgSearchTerm(e.target.value)}
											onFocus={() => setShowCgResults(true)}
										/>
									</div>
									{showCgResults && cgResults.length > 0 && (
										<div className={styles.searchResultsDropdown}>
											{cgResults.map(cg => (
												<div key={cg.id} className={styles.searchResultItem} onMouseDown={() => handleCgSelect(cg)}>
													{cg.firstName} {cg.lastName}
												</div>
											))}
										</div>
									)}
								</div>
								<label className={styles.checkboxLabel} style={{ marginTop: '15px' }}>
									<input type="checkbox" {...register("openShift")} />
									<span>Set as Open Shift (No fixed caregiver)</span>
								</label>
							</CardContent>
						</Card>
					</div>
				</div>

				<div className={styles.cards}>
					{/* 5. TASK LIST CARD */}
					<Card>
						<CardHeader>Task List</CardHeader>
						<div className={styles.taskInputGroup}>
							<input
								className={styles.input}
								value={newTask}
								onChange={(e) => setNewTask(e.target.value)}
								placeholder="Add a specific task..."
								onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
							/>
							<Button type="button" onClick={addTask}>Add</Button>
						</div>
						<div className={styles.taskList}>
							{tasks.map(t => (
								<div key={t.id} className={styles.taskItem}>
									<span>{t.text}</span>
									<button type="button" className={styles.iconButton} onClick={() => deleteTask(t.id)}><Trash2 size={16} /></button>
								</div>
							))}
						</div>
					</Card>

					{/* 6. ADDITIONAL OPTIONS CARD */}
					<Card>
						<CardHeader>Additional Options</CardHeader>
						<CardContent>

							{/* --- Recurring Shift Toggle --- */}
							<div className={styles.toggleRow}>
								<label className={styles.label}>Recurring Shift</label>
								<label className={styles.switch}>
									<input type="checkbox" {...register("isRecurring")} />
									<span className={styles.slider}></span>
								</label>
							</div>

							<hr className={styles.divider} />

							{/* --- Selected Tags (The Pills with Delete button) --- */}
							<div className={styles.selectedTagsContainer}>
								{selectedTags.map(tag => (
									<span key={tag} className={styles.pill}>
										{tag}
										<button
											type="button"
											className={styles.removeTagBtn}
											onClick={() => removeTag(tag)}
										>
											✕
										</button>
									</span>
								))}
							</div>

							{/* --- Tag Input Area --- */}
							<div className={styles.tagsGroup}>
								<div className={styles.searchWrapper}>
									<Plus size={16} className={styles.searchIcon} />
									<input
										type="text"
										className={styles.input}
										placeholder="Add custom tag..."
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addCustomTag();
											}
										}}
									/>
								</div>
								<Button type="button" onClick={addCustomTag}>Add</Button>
							</div>

							{/* --- Quick Selection Tags (Candidates) --- */}
							<div className={styles.formGroup} style={{ marginTop: '15px' }}>
								<label className={styles.subLabel}>Quick Tags:</label>
								<div className={styles.tagCandidateList}>
									{quickTags.map(tag => (
										<button
											key={tag}
											type="button"
											className={`${styles.candidateTag} ${selectedTags.includes(tag) ? styles.activeCandidate : ''}`}
											onClick={() => toggleTag(tag)}
										>
											{selectedTags.includes(tag) ? '✓ ' : '+ '}
											{tag}
										</button>
									))}
								</div>
							</div>

						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>Geofence Customization</CardHeader>
					<div className={styles.gps}>
						<div className={styles.left}>
							{/* --- 5. THE ACTUAL MAP ELEMENT --- */}
							<div
								className={styles.mapContainer}
								style={{ position: 'relative', width: '100%', height: '350px' }}
							>
								{!isLoaded && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>}
								<div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px', minHeight: '350px' }} />
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
								type="number"
								name="geofenceRadius"
								register={register}
								error={errors.geofenceRadius?.message}
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