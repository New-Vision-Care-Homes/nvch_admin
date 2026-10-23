"use client";

import { useState, useRef, useEffect } from "react";
import { Controller } from "react-hook-form";
import { Search, X, User, Loader2 } from "lucide-react";
import { useDirectLeaderOptions } from "@/hooks/useAdmins";
import { useDebounce } from "@/hooks/useDebounce";
import { InfoField } from "@components/UI/Form/Card";
import styles from "@components/UI/Form/PersonSearchField.module.css";

/*
|--------------------------------------------------------------------------
| DirectLeaderField
|--------------------------------------------------------------------------
| A searchable picker for one Direct Leader slot (supervisor/manager/
| administrator), backed by GET /api/auth/admin/direct-leader-options.
| Admin-only (used by add_new_admin and the admin Info tab), so it lives
| under app/admins/_components rather than the shared components/ tree.
|
| Unlike PersonSearchField, the result set is already scoped server-side to
| admins who may legally fill this slot for the given adminLevel — no local
| rank filtering needed here. Reuses PersonSearchField's CSS module since the
| search-input look is shared/generic, not admin-specific.
|
| That endpoint has no by-id lookup, so (unlike PersonSearchField) an
| already-selected value's name must be passed in via fallbackDisplayName
| (e.g. from the admin detail response's directLeadersInfo) rather than
| resolved by this component.
|
| Props:
|   label               {string}  - Field label text
|   name                {string}  - React Hook Form field name (stores the backend _id, "" to clear)
|   control              {object}  - control from useForm()
|   error                {object}  - error from formState.errors[name]
|   slot                 {string}  - "supervisor" | "manager" | "administrator"
|   adminLevel           {string}  - The admin's (possibly in-progress) level — determines eligible options
|   excludeId            {string}  - Admin id to leave out (normally the one being edited)
|   fallbackDisplayName  {string}  - Pre-resolved name for the current selection
|   readOnly             {bool}
*/

function DirectLeaderInput({
	label, error, placeholder, people, isFetching, fetchError, value, onChange, searchQuery, onSearchChange, initialDisplayName, required
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const wrapperRef = useRef(null);

	useEffect(() => {
		if (initialDisplayName && !displayName && value) {
			setDisplayName(initialDisplayName);
		}
	}, [initialDisplayName, displayName, value]);

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
		onSearchChange("");
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
		setDisplayName("");
		onSearchChange(e.target.value);
		onChange("");
		setIsOpen(true);
	}

	const inputValue = displayName || searchQuery;
	const defaultPlaceholder = `Search for a ${label}...`;

	return (
		<div className={styles.field} ref={wrapperRef}>
			<label className={styles.label}>
				{label}
				{required && <span className={styles.required_star}>*</span>}
			</label>

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

				{isFetching && <Loader2 size={14} className={styles.spinner} />}

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

			{isOpen && searchQuery.length > 0 && (
				<div className={styles.dropdown}>
					{isFetching ? (
						<div className={styles.emptyState}>Searching...</div>
					) : fetchError ? (
						<div className={styles.emptyState}>{fetchError}</div>
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
							);
						})
					)}
				</div>
			)}

			{error && <p className={styles.error_text}>{error.message || error}</p>}
		</div>
	);
}

export default function DirectLeaderField({
	label, name, control, error, slot, adminLevel, excludeId, fallbackDisplayName = "", readOnly = false, required,
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearch = useDebounce(searchQuery, 350);

	// Skip the request entirely in read-only mode: the viewer already lacks
	// assign_direct_leaders (that's why this is read-only), so calling the
	// options endpoint here would just be a guaranteed, wasted 403.
	const { items, isFetching, error: fetchError } = useDirectLeaderOptions({
		adminLevel,
		slot,
		search: debouncedSearch.trim() || undefined,
		excludeId: excludeId || undefined,
		enabled: !readOnly,
	});

	if (readOnly) {
		return <InfoField label={label}>{fallbackDisplayName || "—"}</InfoField>;
	}

	return (
		<Controller
			control={control}
			name={name}
			render={({ field: { onChange, value } }) => (
				<DirectLeaderInput
					label={label}
					error={error}
					people={items}
					isFetching={isFetching}
					fetchError={fetchError}
					value={value ?? ""}
					onChange={onChange}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					initialDisplayName={fallbackDisplayName}
					required={required}
				/>
			)}
		/>
	);
}
