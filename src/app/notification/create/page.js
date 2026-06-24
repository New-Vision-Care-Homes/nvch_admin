"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft, Megaphone, Users, Building2, MapPin,
	User, X, Search, Loader2, Send, CheckCircle2,
} from "lucide-react";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import { useHomes } from "@/hooks/useHomes";
import { REGION_OPTIONS } from "@/utils/dropdown_list";
import styles from "./create.module.css";

// ─── Debounce ──────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return debounced;
}

// ─── Target type config ───────────────────────────────────────────────────────

const TARGET_TYPES = [
	{ value: "all_caregivers", label: "All Caregivers", Icon: Users,     color: "#3b82f6", slug: "broadcast_to_all_caregivers" },
	{ value: "all_admins",     label: "All Admins",     Icon: User,      color: "#8b5cf6", slug: "broadcast_to_all_admins"     },
	{ value: "regions",        label: "By Region",      Icon: MapPin,    color: "#f59e0b", slug: "broadcast_to_regions"        },
	{ value: "homes",          label: "By Home",        Icon: Building2, color: "#10b981", slug: "broadcast_to_homes"          },
	{ value: "users",          label: "Specific Users", Icon: Users,     color: "#ec4899", slug: "broadcast_to_individuals"    },
];

// ─── UserSearch — multi-select caregivers + admins ────────────────────────────

function UserSearch({ selected, onAdd, onRemove }) {
	const [query, setQuery]   = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const debouncedQuery      = useDebounce(query, 350);
	const wrapperRef          = useRef(null);

	const hasQuery = !!debouncedQuery.trim();

	// Both hooks called unconditionally (Rules of Hooks); disabled when no query
	const { caregivers, isCaregiverLoading } = useCaregivers({ search: debouncedQuery, enabled: hasQuery });
	const { admins, isAdminLoading }         = useAdmins({ search: debouncedQuery, enabled: hasQuery });

	const selectedIds = new Set(selected.map(u => u._id));
	const results = [
		...caregivers.map(c => ({ ...c, _id: c._id || c.id, role: "caregiver" })),
		...admins.map(a => ({ ...a, _id: a._id || a.id, role: "admin" })),
	].filter(u => !selectedIds.has(u._id));

	const isFetching = isCaregiverLoading || isAdminLoading;

	useEffect(() => {
		const handler = (e) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	function handleSelect(person) {
		onAdd({ _id: person._id, firstName: person.firstName, lastName: person.lastName, role: person.role });
		setQuery("");
		setIsOpen(false);
	}

	return (
		<div className={styles.searchField} ref={wrapperRef}>
			<div className={styles.searchInputRow}>
				<Search size={15} className={styles.searchIcon} />
				<input
					type="text"
					className={styles.searchInput}
					value={query}
					onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
					onFocus={() => { if (query) setIsOpen(true); }}
					placeholder="Search caregivers or admins by name or email..."
				/>
				{isFetching && <Loader2 size={14} className={styles.searchSpinner} />}
			</div>

			{isOpen && hasQuery && (
				<div className={styles.searchDropdown}>
					{isFetching ? (
						<p className={styles.searchEmpty}>Searching…</p>
					) : results.length === 0 ? (
						<p className={styles.searchEmpty}>No results found</p>
					) : (
						results.map(person => (
							<button
								key={person._id}
								type="button"
								className={styles.searchOption}
								onClick={() => handleSelect(person)}
							>
								<span className={`${styles.roleChip} ${styles[`role_${person.role}`]}`}>
									{person.role === "caregiver" ? "C" : "A"}
								</span>
								{person.firstName} {person.lastName}
							</button>
						))
					)}
				</div>
			)}

			{selected.length > 0 && (
				<div className={styles.chipList}>
					{selected.map(u => (
						<span key={u._id} className={styles.chip}>
							<span className={`${styles.roleChip} ${styles[`role_${u.role}`]}`}>
								{u.role === "caregiver" ? "C" : "A"}
							</span>
							{u.firstName} {u.lastName}
							<button type="button" className={styles.chipRemove} onClick={() => onRemove(u._id)}>
								<X size={11} />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

// ─── HomeSearch — multi-select homes ─────────────────────────────────────────

function HomeSearch({ selected, onAdd, onRemove }) {
	const [query, setQuery]   = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const debouncedQuery      = useDebounce(query, 350);
	const wrapperRef          = useRef(null);

	const { homes, isLoading } = useHomes(debouncedQuery ? { search: debouncedQuery } : {});
	const selectedIds = new Set(selected.map(h => h._id));
	// Normalize: backend may return `id` or `_id` depending on serialization
	const results = homes.filter(h => !selectedIds.has(h._id || h.id));

	useEffect(() => {
		const handler = (e) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	function handleSelect(home) {
		onAdd({ _id: home._id || home.id, name: home.name });
		setQuery("");
		setIsOpen(false);
	}

	return (
		<div className={styles.searchField} ref={wrapperRef}>
			<div className={styles.searchInputRow}>
				<Search size={15} className={styles.searchIcon} />
				<input
					type="text"
					className={styles.searchInput}
					value={query}
					onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
					onFocus={() => setIsOpen(true)}
					placeholder="Search homes by name…"
				/>
				{isLoading && <Loader2 size={14} className={styles.searchSpinner} />}
			</div>

			{isOpen && (
				<div className={styles.searchDropdown}>
					{isLoading ? (
						<p className={styles.searchEmpty}>Loading…</p>
					) : results.length === 0 ? (
						<p className={styles.searchEmpty}>
							{selected.length > 0 ? "All homes selected" : "No homes found"}
						</p>
					) : (
						results.map(home => (
							<button
								key={home._id}
								type="button"
								className={styles.searchOption}
								onClick={() => handleSelect(home)}
							>
								<Building2 size={13} className={styles.searchOptionIcon} />
								{home.name}
							</button>
						))
					)}
				</div>
			)}

			{selected.length > 0 && (
				<div className={styles.chipList}>
					{selected.map(h => (
						<span key={h._id} className={styles.chip}>
							<Building2 size={12} className={styles.chipIcon} />
							{h.name}
							<button type="button" className={styles.chipRemove} onClick={() => onRemove(h._id)}>
								<X size={11} />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateNotificationPage() {
	const router = useRouter();
	const { sendBroadcast, isBroadcastPending, broadcastError } = useNotifications({ fetchList: false });

	const { profile } = useProfile();
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const allowedTargetTypes = TARGET_TYPES.filter(t => permissionSlugs.includes(t.slug));

	const [title,           setTitle]           = useState("");
	const [body,            setBody]            = useState("");
	const [sendPush,        setSendPush]        = useState(false);
	const [targetType,      setTargetType]      = useState("all_caregivers");
	const [selectedRegions, setSelectedRegions] = useState([]);
	const [selectedHomes,   setSelectedHomes]   = useState([]);
	const [selectedUsers,   setSelectedUsers]   = useState([]);
	const [formErrors,      setFormErrors]      = useState({});
	const [success,         setSuccess]         = useState(false);

	// ── Validation ────────────────────────────────────────────────────────────

	function validate() {
		const errs = {};
		if (!title.trim()) errs.title = "Title is required";
		if (targetType === "regions" && selectedRegions.length === 0) errs.target = "Select at least one region";
		if (targetType === "homes"   && selectedHomes.length   === 0) errs.target = "Select at least one home";
		if (targetType === "users"   && selectedUsers.length   === 0) errs.target = "Select at least one user";
		setFormErrors(errs);
		return Object.keys(errs).length === 0;
	}

	// ── Submit ────────────────────────────────────────────────────────────────

	async function handleSubmit(e) {
		e.preventDefault();
		if (!validate()) return;

		const target = { type: targetType };
		if (targetType === "regions") target.regions = selectedRegions;
		if (targetType === "homes")   target.ids     = selectedHomes.map(h => h._id);
		if (targetType === "users")   target.ids     = selectedUsers.map(u => u._id);

		try {
			await sendBroadcast({ title: title.trim(), body: body.trim() || undefined, sendPush, target });
			setSuccess(true);
			setTimeout(() => router.push("/notification"), 1500);
		} catch {
			// broadcastError from the hook surfaces the error message below
		}
	}

	function toggleRegion(r) {
		setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
		setFormErrors(prev => ({ ...prev, target: undefined }));
	}


	return (
		<PageLayout>

			{/* ── Header ─────────────────────────────────────────────────────── */}
			<div className={styles.header}>
				<div className={styles.headingRow}>
					<div className={styles.headingLeft}>
						<div className={styles.megaphoneBox}>
							<Megaphone size={22} color="#dc2626" />
						</div>
						<div>
							<h1>New Broadcast</h1>
							<p className={styles.subheading}>Send a message to your team</p>
						</div>
					</div>
					<Button
						variant="secondary"
						icon={<ArrowLeft size={15} />}
						onClick={() => router.push("/notification")}
					>
						Back
					</Button>
				</div>
			</div>

			<form onSubmit={handleSubmit} className={styles.form}>

				{/* ── Message ──────────────────────────────────────────────────── */}
				<section className={styles.card}>
					<h2 className={styles.sectionTitle}>Message</h2>

					<div className={styles.field}>
						<label className={styles.label}>
							Title <span className={styles.required}>*</span>
						</label>
						<input
							type="text"
							className={`${styles.input} ${formErrors.title ? styles.inputError : ""}`}
							value={title}
							onChange={e => {
								setTitle(e.target.value);
								if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
							}}
							placeholder="e.g. Office closed Monday"
							maxLength={100}
						/>
						{formErrors.title && <p className={styles.errorText}>{formErrors.title}</p>}
					</div>

					<div className={styles.field}>
						<label className={styles.label}>
							Detail <span className={styles.optional}>(optional)</span>
						</label>
						<textarea
							className={styles.textarea}
							value={body}
							onChange={e => setBody(e.target.value)}
							placeholder="Add more context or instructions…"
							rows={3}
							maxLength={500}
						/>
						<p className={styles.charCount}>{body.length} / 500</p>
					</div>

					<div className={styles.toggleRow}>
						<div>
							<p className={styles.toggleLabel}>Phone push notification</p>
							<p className={styles.toggleDesc}>
								Sends a pop-up notification directly to caregivers&apos; devices —
								visible even when the app is closed or in the background.
								Admins receive in-portal updates only.
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-pressed={sendPush}
							className={`${styles.toggle} ${sendPush ? styles.toggleOn : ""}`}
							onClick={() => setSendPush(v => !v)}
						>
							<span className={styles.toggleThumb} />
						</button>
					</div>
				</section>

				{/* ── Recipients ───────────────────────────────────────────────── */}
				<section className={styles.card}>
					<h2 className={styles.sectionTitle}>Recipients</h2>

					{/* Type picker */}
					<div className={styles.typeGrid}>
						{allowedTargetTypes.map(({ value, label, Icon, color }) => (
							<button
								key={value}
								type="button"
								className={`${styles.typeOption} ${targetType === value ? styles.typeOptionActive : ""}`}
								style={targetType === value ? { borderColor: color, background: `${color}0d` } : {}}
								onClick={() => {
									setTargetType(value);
									setFormErrors(prev => ({ ...prev, target: undefined }));
								}}
							>
								<span
									className={styles.typeIconBox}
									style={{
										background: targetType === value ? `${color}1a` : "#f3f4f6",
										color:      targetType === value ? color         : "#6b7280",
									}}
								>
									<Icon size={15} />
								</span>
								<span className={styles.typeLabel}>{label}</span>
							</button>
						))}
					</div>

					{/* all_caregivers / all_admins — nothing to configure */}
					{(targetType === "all_caregivers" || targetType === "all_admins") && (
						<div className={styles.recipientNote}>
							<CheckCircle2 size={15} className={styles.recipientNoteIcon} />
							This broadcast will be sent to{" "}
							<strong>
								{targetType === "all_caregivers" ? "all caregivers" : "all admins"}
							</strong>{" "}
							in the system.
						</div>
					)}

					{/* regions — checkbox grid */}
					{targetType === "regions" && (
						<div className={styles.regionGrid}>
							{REGION_OPTIONS.map(({ value, label }) => (
								<label
									key={value}
									className={`${styles.regionOption} ${selectedRegions.includes(value) ? styles.regionOptionSelected : ""}`}
								>
									<input
										type="checkbox"
										className={styles.regionCheckbox}
										checked={selectedRegions.includes(value)}
										onChange={() => toggleRegion(value)}
									/>
									<MapPin size={13} />
									{label}
								</label>
							))}
						</div>
					)}

					{/* homes — search + multi-select */}
					{targetType === "homes" && (
						<HomeSearch
							selected={selectedHomes}
							onAdd={h => setSelectedHomes(prev => [...prev, h])}
							onRemove={id => setSelectedHomes(prev => prev.filter(h => h._id !== id))}
						/>
					)}

					{/* users — search caregivers + admins */}
					{targetType === "users" && (
						<UserSearch
							selected={selectedUsers}
							onAdd={u => setSelectedUsers(prev => [...prev, u])}
							onRemove={id => setSelectedUsers(prev => prev.filter(u => u._id !== id))}
						/>
					)}

					{formErrors.target && (
						<p className={`${styles.errorText} ${styles.targetError}`}>{formErrors.target}</p>
					)}
				</section>

				{/* ── Feedback ─────────────────────────────────────────────────── */}
				{broadcastError && !success && (
					<div className={styles.submitError}>{broadcastError}</div>
				)}
				{success && (
					<div className={styles.successBanner}>
						<CheckCircle2 size={16} /> Broadcast sent successfully — redirecting…
					</div>
				)}

				{/* ── Actions ──────────────────────────────────────────────────── */}
				<div className={styles.submitRow}>
					<Button
						variant="secondary"
						onClick={() => router.push("/notification")}
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						type="submit"
						disabled={isBroadcastPending || success}
						icon={isBroadcastPending
							? <Loader2 size={15} className={styles.btnSpinner} />
							: <Send size={15} />
						}
					>
						{isBroadcastPending ? "Sending…" : "Send Broadcast"}
					</Button>
				</div>

			</form>
		</PageLayout>
	);
}
