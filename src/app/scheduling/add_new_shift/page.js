"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Plus, X } from "lucide-react";

import { useGoogleMap } from "@/hooks/useGoogleMap";
import { useShifts } from "@/hooks/useShifts";

import PageLayout from "@components/layout/PageLayout";
import { useClients } from "@/hooks/useClients";
import styles from "./add_new_shift.module.css";
import cardStyles from "@components/UI/Card.module.css";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import { IdRule, nameRule, phoneRule, shortTextRule, longTextRule } from "@/utils/validation";

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://nvch-server.onrender.com";
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const QUICK_TAGS = ["Urgent", "New Client"];

// ─── Helpers (outside component to avoid re-creation on each render) ─────────

function debounce(fn, delay) {
	let timer;
	return function (...args) {
		clearTimeout(timer);
		timer = setTimeout(() => fn.apply(this, args), delay);
	};
}

function getAuthHeader() {
	const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
	return { Authorization: `Bearer ${token}` };
}

function formatTime(date) {
	return date.toTimeString().slice(0, 5);
}

function joinAddress({ street, city, state, pinCode } = {}) {
	return [street, city, state, pinCode].filter(Boolean).join(", ");
}

// ─── Validation Schema ────────────────────────────────────────────────────────

const now = new Date().toISOString().slice(0, 16);

const schema = yup.object({
	caregiverId: IdRule.required("Caregiver is required"),
	clientId: IdRule.required("Client is required"),
	clientPhone: phoneRule.required("Client Phone is required"),
	clientAddress: longTextRule.optional(),
	startTime: yup
		.string()
		.required("Start Time is required")
		.test("is-future", "Start time must be in the future", (v) => new Date(v) > new Date()),
	endTime: yup
		.string()
		.required("End Time is required")
		.test("is-after-start", "End time must be after start time", function (v) {
			return new Date(v) > new Date(this.parent.startTime);
		}),
	serviceInput: shortTextRule.required("Services Required is required"),
	contactFName: nameRule.optional(),
	contactLName: nameRule.optional(),
	contactPhone: phoneRule.optional(),
	shiftNotes: shortTextRule.optional(),
	assignedCaregiver: nameRule.optional(),
	geofenceRadius: yup.number().optional(),
	alertOnEntry: yup.boolean().notRequired(),
	alertOnExit: yup.boolean().notRequired(),
});

// ─── useSearch hook ───────────────────────────────────────────────────────────
/**
 * Generic search hook to eliminate duplicated client/caregiver search logic.
 * @param {(term: string) => Promise<any[]>} fetchFn  async fn that returns result array
 */
function useSearch(fetchFn) {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState([]);
	const [showResults, setShowResults] = useState(false);
	const [selectedName, setSelectedName] = useState("");
	const [searchError, setSearchError] = useState(null);

	// Stable debounced fetcher — fetchFn identity may change, so we hold it in a ref
	const fetchRef = useRef(fetchFn);
	useEffect(() => { fetchRef.current = fetchFn; }, [fetchFn]);

	const debouncedSearch = useCallback(
		debounce(async (searchTerm) => {
			if (searchTerm.length < 2) return;
			try {
				setSearchError(null);
				const data = await fetchRef.current(searchTerm);
				setResults(data);
				setShowResults(true);
			} catch (err) {
				console.error("Search error:", err);
				setSearchError("Search failed. Please try again.");
				setResults([]);
			}
		}, 500),
		[] // stable — only created once
	);

	useEffect(() => {
		// Only trigger search if user is actively typing (not after a selection)
		if (term && term !== selectedName) {
			debouncedSearch(term);
		}
	}, [term, selectedName, debouncedSearch]);

	const select = useCallback((name) => {
		setSelectedName(name);
		setTerm(name);
		setShowResults(false);
		setResults([]);
	}, []);

	const clear = useCallback(() => {
		setTerm("");
		setSelectedName("");
		setShowResults(false);
		setResults([]);
		setSearchError(null);
	}, []);

	return { term, setTerm, results, showResults, setShowResults, selectedName, searchError, select, clear };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function Page() {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
		setValue,
	} = useForm({ resolver: yupResolver(schema) });

	const selectedStartTime = watch("startTime");
	const selectedEndTime = watch("endTime");
	const geofenceRadius = watch("geofenceRadius");

	// ── Google Map ──────────────────────────────────────────────────────────
	const { mapRef, inputRef, isLoaded, loadError, center: mapCenter, updateRadius } = useGoogleMap();

	useEffect(() => {
		updateRadius(geofenceRadius);
	}, [geofenceRadius, updateRadius]);

	// Auto-clear endTime if it's now before startTime
	useEffect(() => {
		if (selectedStartTime && selectedEndTime) {
			if (new Date(selectedEndTime) <= new Date(selectedStartTime)) {
				setValue("endTime", "");
			}
		}
	}, [selectedStartTime, selectedEndTime, setValue]);

	// ── Client Search ───────────────────────────────────────────────────────
	const fetchClients = useCallback(async (search) => {
		const {
			clients,
			isLoading,
			fetchError,
			refetch,
		} = useClients({
			params: {
				page: 1,
				limit: 5,
				search: search,
			}
		});
		return clients || [];
	}, []);

	const clientSearch = useSearch(fetchClients);

	const handleClientSelect = useCallback((client) => {
		const fullName = `${client.firstName} ${client.lastName}`;
		setValue("clientId", client.id);
		setValue("clientPhone", client.phone || "");
		setValue("clientAddress", joinAddress(client.address));
		clientSearch.select(fullName);
	}, [clientSearch, setValue]);

	const handleClientClear = useCallback(() => {
		clientSearch.clear();
		setValue("clientId", "");
		setValue("clientPhone", "");
		setValue("clientAddress", "");
	}, [clientSearch, setValue]);

	// ── Caregiver Search ────────────────────────────────────────────────────
	// fetchCaregivers needs current startTime/endTime — pass them as params
	// instead of reading watch() inside the function to avoid stale closures.
	const fetchCaregivers = useCallback(async (search) => {
		const startVal = watch("startTime");
		const endVal = watch("endTime");

		let url = `${API_BASE}/api/auth/admin/caregivers?page=1&limit=10&search=${encodeURIComponent(search)}&isActive=true`;

		if (startVal) {
			const startDate = new Date(startVal);
			url += `&availabilityDay=${DAY_NAMES[startDate.getDay()]}`;
			url += `&availabilityStartTime=${formatTime(startDate)}`;

			if (endVal) {
				url += `&availabilityEndTime=${formatTime(new Date(endVal))}`;
			}
		}

		const res = await fetch(url, { headers: getAuthHeader() });
		const data = await res.json();
		return data.data.caregivers || [];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // watch() is stable from react-hook-form, no deps needed

	const cgSearch = useSearch(fetchCaregivers);

	const handleCgSelect = useCallback((cg) => {
		const fullName = `${cg.firstName} ${cg.lastName}`;
		setValue("caregiverId", cg.id);
		setValue("assignedCaregiver", fullName);
		cgSearch.select(fullName);
	}, [cgSearch, setValue]);

	// ── Tasks ───────────────────────────────────────────────────────────────
	const [tasks, setTasks] = useState([]);
	const [newTask, setNewTask] = useState("");

	const addTask = useCallback(() => {
		const trimmed = newTask.trim();
		if (!trimmed) return;
		setTasks((prev) => [...prev, { id: Date.now(), text: trimmed, completed: false }]);
		setNewTask("");
	}, [newTask]);

	const deleteTask = useCallback((id) => {
		setTasks((prev) => prev.filter((t) => t.id !== id));
	}, []);

	// ── Tags ────────────────────────────────────────────────────────────────
	const [selectedTags, setSelectedTags] = useState([]);
	const [tagInput, setTagInput] = useState("");

	const toggleTag = useCallback((tag) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	}, []);

	const addCustomTag = useCallback(() => {
		const trimmed = tagInput.trim();
		if (trimmed && !selectedTags.includes(trimmed)) {
			setSelectedTags((prev) => [...prev, trimmed]);
		}
		setTagInput("");
	}, [tagInput, selectedTags]);

	const removeTag = useCallback((tag) => {
		setSelectedTags((prev) => prev.filter((t) => t !== tag));
	}, []);

	useEffect(() => {
		setValue("tags", selectedTags);
	}, [selectedTags, setValue]);

	// ── Form Submission ─────────────────────────────────────────────────────
	const { addShift, isActionPending, isError, errorMessage } = useShifts();

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
		} catch (error) {
			const msg = error.response?.data?.message || error.message || "Failed to create shift";
			alert(`Error: ${msg}`);
		}
	};

	// ── Early returns ───────────────────────────────────────────────────────
	if (loadError) return <div>Error loading maps</div>;

	// ── Render ──────────────────────────────────────────────────────────────
	return (
		<PageLayout>
			{/* Header */}
			<div className={styles.header}>
				<h1>Create New Shift</h1>
				{isError && (
					<div style={{ color: "red", marginRight: "1rem", fontWeight: "bold" }}>
						{errorMessage}
					</div>
				)}
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={() => router.push("/scheduling")}>Cancel</Button>
					<Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isActionPending}>
						{isActionPending ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.cards}>

					{/* ── Client Information ── */}
					<Card>
						<CardHeader>Client Information</CardHeader>
						<CardContent>
							{/* Client Search */}
							<div className={styles.searchContainer}>
								<label className={styles.label}>Client Name</label>
								<div className={styles.searchWrapper}>
									<Search className={styles.searchIcon} />
									<input
										type="text"
										placeholder="Search clients..."
										className={styles.input}
										value={clientSearch.term}
										onChange={(e) => clientSearch.setTerm(e.target.value)}
										onFocus={() => clientSearch.setShowResults(true)}
										readOnly={!!clientSearch.selectedName}
										style={clientSearch.selectedName
											? { backgroundColor: "#f3f4f6", cursor: "not-allowed", color: "#6b7280" }
											: {}
										}
									/>
									{clientSearch.selectedName && (
										<X
											size={16}
											style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6b7280" }}
											onClick={handleClientClear}
										/>
									)}
								</div>
								{clientSearch.searchError && (
									<p style={{ color: "red", fontSize: "0.8rem", marginTop: "4px" }}>{clientSearch.searchError}</p>
								)}
								{clientSearch.showResults && clientSearch.results.length > 0 && (
									<div className={styles.searchResultsDropdown}>
										{clientSearch.results.map((c) => (
											<div
												key={c.id}
												className={styles.searchResultItem}
												onMouseDown={() => handleClientSelect(c)}
											>
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
						{/* ── Shift Details ── */}
						<Card>
							<CardHeader>Shift Information</CardHeader>
							<CardContent>
								<div className={styles.card_row_2}>
									<InputField label="Start" type="datetime-local" name="startTime" register={register} error={errors.startTime} min={now} />
									<InputField label="End" type="datetime-local" name="endTime" register={register} error={errors.endTime} min={selectedStartTime || now} />
								</div>
								<InputField label="Services Required" name="serviceInput" register={register} error={errors.serviceInput} placeholder="e.g. Cooking, Bathing" />
								<InputField label="Shift Notes" name="shiftNotes" register={register} />
							</CardContent>
						</Card>

						{/* ── Caregiver Assignment ── */}
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
											className={styles.input}
											value={cgSearch.term}
											onChange={(e) => cgSearch.setTerm(e.target.value)}
											onFocus={() => cgSearch.setShowResults(true)}
										/>
										{cgSearch.selectedName && (
											<X
												size={16}
												style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6b7280" }}
												onClick={cgSearch.clear}
											/>
										)}
									</div>
									{cgSearch.searchError && (
										<p style={{ color: "red", fontSize: "0.8rem", marginTop: "4px" }}>{cgSearch.searchError}</p>
									)}
									{cgSearch.showResults && cgSearch.results.length > 0 && (
										<div className={styles.searchResultsDropdown}>
											{cgSearch.results.map((cg) => (
												<div
													key={cg.id}
													className={styles.searchResultItem}
													onMouseDown={() => handleCgSelect(cg)}
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

				<div className={styles.cards}>
					{/* ── Task List ── */}
					<Card>
						<CardHeader>Task List</CardHeader>
						<div className={styles.taskInputGroup}>
							<input
								className={styles.input}
								value={newTask}
								onChange={(e) => setNewTask(e.target.value)}
								placeholder="Add a specific task..."
								onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
							/>
							<Button type="button" onClick={addTask}>Add</Button>
						</div>
						<div className={styles.taskList}>
							{tasks.map((t) => (
								<div key={t.id} className={styles.taskItem}>
									<span>{t.text}</span>
									<button type="button" className={styles.iconButton} onClick={() => deleteTask(t.id)}>
										<Trash2 size={16} />
									</button>
								</div>
							))}
						</div>
					</Card>

					{/* ── Additional Options ── */}
					<Card>
						<CardHeader>Additional Options</CardHeader>
						<CardContent>
							{/* Recurring Shift Toggle */}
							<div className={styles.toggleRow}>
								<label className={styles.label}>Recurring Shift</label>
								<label className={styles.switch}>
									<input type="checkbox" {...register("isRecurring")} />
									<span className={styles.slider}></span>
								</label>
							</div>

							<hr className={styles.divider} />

							{/* Selected Tags */}
							<div className={styles.selectedTagsContainer}>
								{selectedTags.map((tag) => (
									<span key={tag} className={styles.pill}>
										{tag}
										<button type="button" className={styles.removeTagBtn} onClick={() => removeTag(tag)}>✕</button>
									</span>
								))}
							</div>

							{/* Tag Input */}
							<div className={styles.tagsGroup}>
								<div className={styles.searchWrapper}>
									<Plus size={16} className={styles.searchIcon} />
									<input
										type="text"
										className={styles.input}
										placeholder="Add custom tag..."
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
									/>
								</div>
								<Button type="button" onClick={addCustomTag}>Add</Button>
							</div>

							{/* Quick Tags */}
							<div className={styles.formGroup} style={{ marginTop: "15px" }}>
								<label className={styles.subLabel}>Quick Tags:</label>
								<div className={styles.tagCandidateList}>
									{QUICK_TAGS.map((tag) => (
										<button
											key={tag}
											type="button"
											className={`${styles.candidateTag} ${selectedTags.includes(tag) ? styles.activeCandidate : ""}`}
											onClick={() => toggleTag(tag)}
										>
											{selectedTags.includes(tag) ? "✓ " : "+ "}
											{tag}
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
							<div
								className={styles.mapContainer}
								style={{ position: "relative", width: "100%", height: "350px" }}
							>
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
									{ label: "100", value: 100 },
									{ label: "200", value: 200 },
									{ label: "300", value: 300 }
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