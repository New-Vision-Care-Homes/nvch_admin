"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useClients } from "@/hooks/useClients";
import { useAdmins } from "@/hooks/useAdmins";
import { attachClickOutside } from "@/utils/clickOutside";
import HouseConflictModal from "@/components/UI/HouseConflictModal";
import cardStyles from "@components/UI/Card.module.css";
import { X } from "lucide-react";

// Referentially-stable "no results" value — a fresh `[]` literal from the
// useMemo below would give `results` a new identity every render (the search
// hooks aren't memoized upstream), which would retrigger the "assigned" hint
// effect every render and loop (setHomeMap({}) → re-render → new [] → ...).
const EMPTY_LIST = [];

export const getStaffId = (person) => person._id || person.id;

function useDebouncedValue(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

const TYPE_CONFIG = {
	caregiver: { placeholder: "Search caregivers...", badgeClass: "badgeCaregiver", subjectLabel: "Caregiver", subtext: (p) => p.email || p.phone },
	client: { placeholder: "Search clients...", badgeClass: "badgeClient", subjectLabel: "Client", subtext: (p) => p.email || p.phone },
	admin: { placeholder: "Search admins...", badgeClass: "badgeAdmin", subtext: (p) => p.email },
};

/*
|--------------------------------------------------------------------------
| PersonAssignmentField
|--------------------------------------------------------------------------
| One "search, select, and show as removable badges" field for a home's
| Staff Assignment card. Shared by add_new_home and [id]/edit — both used to
| hand-roll this same block three times each (caregiver/client/admin).
|
| Caregivers and clients get the "already assigned to another home" conflict
| check (fetch the full record, pause on HouseConflictModal if it belongs
| elsewhere); admins don't carry a home assignment, so they skip straight to
| selection.
|
| The parent owns `selected` (controlled) since it needs the final arrays to
| build the home's submit payload — this component only owns its own
| search/dropdown/conflict UI state.
|
| Props:
|   type            {string}   - "caregiver" | "client" | "admin"
|   label           {string}   - Field label, e.g. "Caregivers"
|   selected        {array}    - Currently-assigned people
|   onSelectedChange{Function} - (nextArray) => void
|   currentHomeId   {string}   - This home's id; omit when adding a new home.
|                                 A person already assigned to *this* home isn't a conflict.
|   newHomeName     {string}   - Shown in the conflict modal's "move to" copy
|   fetchHome       {Function} - (id) => Promise<home> — used to look up the conflicting home's name
|   onMove          {Function} - Called when the user confirms reassigning someone from another home
*/
export default function PersonAssignmentField({
	type, label, selected, onSelectedChange, currentHomeId, newHomeName, fetchHome, onMove,
}) {
	const withConflictCheck = type !== "admin";
	const config = TYPE_CONFIG[type];

	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebouncedValue(searchInput, 300);
	const [showResults, setShowResults] = useState(false);
	const [conflictInfo, setConflictInfo] = useState(null); // { person, currentHomeName }
	const [isChecking, setIsChecking] = useState(false);
	const [homeMap, setHomeMap] = useState({}); // { personId: boolean } — drives the "· assigned" hint

	const wrapperRef = useRef(null);
	useEffect(() => attachClickOutside(wrapperRef, () => setShowResults(false)), []);

	// HouseConflictModal is fixed-position, but this field renders inside a
	// Card (which transforms on :hover) — a transformed ancestor creates a new
	// containing block for `position: fixed`, breaking the modal's placement
	// and causing it to jump/flicker as the hover state toggles. Portaling to
	// <body> keeps it immune to that regardless of where this field is used.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// All three search hooks are called unconditionally (React rules of hooks),
	// but only the one matching `type` is enabled — mirrors PersonSearchField.
	const searchTerm = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : "";
	const searchOptions = searchTerm ? { search: searchTerm, page: 1, limit: 10 } : {};

	const { caregivers, fetchCaregiver } = useCaregivers({ ...searchOptions, enabled: type === "caregiver" });
	const { clients, fetchClient } = useClients({ ...searchOptions, enabled: type === "client" });
	const { admins } = useAdmins({ ...searchOptions, enabled: type === "admin" });

	const searched = type === "caregiver" ? caregivers : type === "client" ? clients : admins;
	const fetchFullRecord = type === "caregiver" ? fetchCaregiver : type === "client" ? fetchClient : null;

	const results = useMemo(() => {
		if (!searched || !searchTerm) return EMPTY_LIST;
		return searched.filter((p) => !selected.find((s) => getStaffId(s) === getStaffId(p)));
	}, [searched, searchTerm, selected]);

	// Batch-fetch full records for the visible results to drive the "· assigned" hint
	useEffect(() => {
		if (!withConflictCheck || !results.length) {
			setHomeMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
			return;
		}
		let cancelled = false;
		Promise.all(results.map((p) => fetchFullRecord(getStaffId(p)))).then((full) => {
			if (cancelled) return;
			const map = {};
			full.forEach((f, i) => {
				const homeRaw = f.home;
				map[getStaffId(results[i])] = !!(
					(typeof homeRaw === "string" ? homeRaw : (homeRaw?._id || homeRaw?.id)) || f.homeId
				);
			});
			setHomeMap(map);
		}).catch(() => {});
		return () => { cancelled = true; };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [results, withConflictCheck]);

	async function handleSelect(person) {
		setSearchInput("");
		setShowResults(false);

		if (!withConflictCheck) {
			onSelectedChange([...selected, { ...person, adminLevel: "supervisor" }]);
			return;
		}

		if (isChecking) return;
		setIsChecking(true);
		try {
			const full = await fetchFullRecord(getStaffId(person));
			const homeRaw = full.home;
			const existingHomeId =
				typeof homeRaw === "string" ? homeRaw :
				(homeRaw?._id || homeRaw?.id || full.homeId || null);
			// Conflict: this person already belongs to a different home
			if (existingHomeId && existingHomeId !== currentHomeId) {
				let currentHomeName = null;
				try {
					const homeDetail = await fetchHome(existingHomeId);
					currentHomeName = homeDetail?.name || homeDetail?.home?.name || null;
				} catch {}
				setConflictInfo({ person, currentHomeName });
				return;
			}
			onSelectedChange([...selected, person]);
		} catch {
			onSelectedChange([...selected, person]);
		} finally {
			setIsChecking(false);
		}
	}

	function handleConflictConfirm() {
		if (!conflictInfo) return;
		onSelectedChange([...selected, conflictInfo.person]);
		onMove();
		setConflictInfo(null);
	}

	function handleRemove(id) {
		onSelectedChange(selected.filter((p) => getStaffId(p) !== id));
	}

	return (
		<div style={{ marginBottom: type === "admin" ? 0 : "1.5rem" }}>
			<label className={cardStyles.label}>{label}</label>
			<div style={{ position: "relative" }} ref={wrapperRef}>
				<input
					type="text"
					value={searchInput}
					onChange={(e) => { setSearchInput(e.target.value); setShowResults(e.target.value.length >= 2); }}
					onFocus={() => searchInput.length >= 2 && setShowResults(true)}
					placeholder={config.placeholder}
					className={cardStyles.input}
				/>
				{showResults && results.length > 0 && (
					<div className={cardStyles.searchResults}>
						{results.map((person) => {
							const hasHome = withConflictCheck && !!homeMap[getStaffId(person)];
							return (
								<div key={getStaffId(person)} onMouseDown={() => handleSelect(person)} className={cardStyles.searchItem}>
									<span className={cardStyles.searchItemName}>{person.firstName} {person.lastName}</span>
									<span className={cardStyles.searchItemSub}>
										{config.subtext(person)}
										{hasHome && (
											<span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#d97706", fontWeight: 600 }}>
												· assigned
											</span>
										)}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>
			<div className={cardStyles.badgeList}>
				{selected.map((person) => (
					<div key={getStaffId(person)} className={`${cardStyles.badge} ${cardStyles[config.badgeClass]}`}>
						<span>{person.firstName} {person.lastName}</span>
						<X size={14} onClick={() => handleRemove(getStaffId(person))} />
					</div>
				))}
			</div>
			{withConflictCheck && mounted && createPortal(
				<HouseConflictModal
					isOpen={!!conflictInfo}
					onClose={() => setConflictInfo(null)}
					onConfirm={handleConflictConfirm}
					subjectLabel={config.subjectLabel}
					subjectName={conflictInfo ? `${conflictInfo.person.firstName} ${conflictInfo.person.lastName}` : ""}
					currentHomeName={conflictInfo?.currentHomeName}
					newHomeName={newHomeName}
				/>,
				document.body
			)}
		</div>
	);
}
