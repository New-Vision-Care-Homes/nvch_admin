"use client";

import { useState, useRef, useEffect } from "react";
import { Controller, useWatch } from "react-hook-form";
import { Search, X, User, Loader2 } from "lucide-react";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useClients } from "@/hooks/useClients";
import { useAdmins } from "@/hooks/useAdmins";
import styles from "./PersonSearchField.module.css";

/*
|--------------------------------------------------------------------------
| PersonSearchField
|--------------------------------------------------------------------------
| A searchable people picker backed by the backend search endpoint.
| Passes the typed query to the backend as ?search=<value> 
| Fires an API call when the user types.
|
| Props:
|   label       {string}  - Field label text
|   name        {string}  - React Hook Form field name (stores the backend _id)
|   control     {object}  - control from useForm()
|   error       {object}  - error from formState.errors[name]
|   type        {string}  - "caregiver" | "client" | "admin"
|   placeholder {string}  - Optional placeholder text
|
| Usage:
|   <PersonSearchField
|     label="Assign Caregiver"
|     name="caregiverId"
|     control={control}
|     error={errors.caregiverId}
|     type="caregiver"
|   />
|
| Yup schema (field stores the backend _id string):
|   caregiverId: yup.string().required("Please select a caregiver")
*/

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}



// ── Inner display component ────────────────────────────────────────────────────
function PersonSearchInput({
	label, error, placeholder, people, isFetching,
	value, onChange, type, searchQuery, onSearchChange, initialDisplayName, required
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const wrapperRef = useRef(null);

	// Sync initial display name when it loads from the backend
	useEffect(() => {
		if (initialDisplayName && !displayName && value) {
			setDisplayName(initialDisplayName);
		}
	}, [initialDisplayName, displayName, value]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e) {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleSelect(person) {
		const name = `${person.firstName} ${person.lastName}`;
		setDisplayName(name);
		onSearchChange(""); // clear the search query — we now show displayName
		onChange(person.id || person._id);
		setIsOpen(false);
	}

	function handleClear() {
		setDisplayName("");
		onSearchChange("");
		onChange("");
		setIsOpen(false);
	}

	function handleInputChange(e) {
		setDisplayName(""); // user is typing a new search, so drop the resolved name
		onSearchChange(e.target.value);
		onChange(""); // clear stored ID — it's now stale
		setIsOpen(true);
	}

	// What to show in the input: resolved name (selection made) or live search query
	const inputValue = displayName || searchQuery;

	const defaultPlaceholder =
		type === "caregiver" ? "Search caregivers by name, email, or ID..." :
			type === "client" ? "Search clients by name, email, or ID..." :
				"Search admins by name, email, or ID...";

	return (
		<div className={styles.field} ref={wrapperRef}>
			<label className={styles.label}>
				{label}
				{required && <span className={styles.required_star}>*</span>}
			</label>

			{/* ── Input row ── */}
			<div className={`${styles.inputWrapper} ${error ? styles.inputWrapper_error : ""}`}>
				<Search size={15} className={styles.searchIcon} />

				<input
					type="text"
					className={styles.input}
					value={inputValue}
					onChange={handleInputChange}
					onFocus={() => { if (searchQuery) setIsOpen(true); }}
					placeholder={placeholder || defaultPlaceholder}
					autoComplete="off"
				/>

				{/* Spinner while backend is responding */}
				{isFetching && <Loader2 size={14} className={styles.spinner} />}

				{/* Clear button */}
				{inputValue && !isFetching && (
					<button
						type="button"
						className={styles.clearBtn}
						onClick={handleClear}
						tabIndex={-1}
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* ── Dropdown — only shown while user has an active search query ── */}
			{isOpen && searchQuery.length > 0 && (
				<div className={styles.dropdown}>
					{isFetching ? (
						<div className={styles.emptyState}>Searching...</div>
					) : people.length === 0 ? (
						<div className={styles.emptyState}>No results found</div>
					) : (
						people.map((person) => {
							const personId = person.id || person._id;
							return (
							<button
								key={personId}
								type="button"
								className={`${styles.option} ${value === personId ? styles.option_selected : ""}`}
								onClick={() => handleSelect(person)}
							>
								<span className={styles.optionAvatar}>
									<User size={13} />
								</span>
								<span className={styles.optionName}>
									{person.firstName} {person.lastName}
								</span>
								{value === personId && (
									<span className={styles.optionCheck}>✓</span>
								)}
							</button>
						)})
					)}
				</div>
			)}

			{/* Yup error message */}
			{error && <p className={styles.error_text}>{error.message || error}</p>}
		</div>
	);
}


// ── Public export ──────────────────────────────────────────────────────────────
export default function PersonSearchField({
	label, name, control, error, type = "caregiver", placeholder, required,
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearch = useDebounce(searchQuery, 350);

	// All three hooks called unconditionally (React rules of hooks).
	// Each receives the debounced search string as its options param,
	// which each hook passes straight through to its service's getAll().
	const searchOptions = debouncedSearch.trim() ? { search: debouncedSearch } : {};

	const { caregivers, isCaregiverLoading } = useCaregivers(searchOptions);
	const { clients, isClientLoading } = useClients(searchOptions);
	const { admins, isAdminLoading } = useAdmins(searchOptions);

	// Pick only the data relevant to the active type
	const people =
		type === "caregiver" ? caregivers :
			type === "client" ? clients :
				admins;

	const isFetching =
		type === "caregiver" ? isCaregiverLoading :
			type === "client" ? isClientLoading :
				isAdminLoading;

	const fieldValue = useWatch({ control, name });
	const fetchCaregiverId = type === "caregiver" && fieldValue && typeof fieldValue === "string" ? fieldValue : "";
	const fetchClientId = type === "client" && fieldValue && typeof fieldValue === "string" ? fieldValue : "";
	const fetchAdminId = type === "admin" && fieldValue && typeof fieldValue === "string" ? fieldValue : "";

	const { caregiverDetail } = useCaregivers(fetchCaregiverId);
	const { clientDetail } = useClients(fetchClientId);
	const { adminDetail } = useAdmins(fetchAdminId);

	const initialPerson =
		type === "caregiver" ? caregiverDetail :
			type === "client" ? clientDetail :
				type === "admin" ? adminDetail : null;

	const initialDisplayName = initialPerson
		? `${initialPerson.firstName || ""} ${initialPerson.lastName || ""}`.trim()
		: "";

	return (
		<Controller
			control={control}
			name={name}
			render={({ field: { onChange, value } }) => (
				<PersonSearchInput
					label={label}
					error={error}
					placeholder={placeholder}
					people={people}
					isFetching={isFetching}
					value={value ?? ""}
					onChange={onChange}
					type={type}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					initialDisplayName={initialDisplayName}
					required={required}
				/>
			)}
		/>
	);
}
