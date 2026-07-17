"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Plus, X, Clock } from "lucide-react";
import { DateTime } from "luxon";

import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import { useHomes } from "@/hooks/useHomes";
import { useShifts } from "@/hooks/useShifts";
import GeofenceMap from "@/components/UI/GeofenceMap";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";

import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import ActionMessage from "@components/UI/ActionMessage";
import styles from "./add_new_shift.module.css";
import cardStyles from "@components/UI/Card.module.css";
import CapacityExceededModal from "../_components/CapacityExceededModal";
import VoluntaryPendingModal from "../_components/VoluntaryPendingModal";

import { IdRule, nameRule, phoneRule, shortTextRule, longTextRule } from "@/utils/validation";
import { formatAddress } from "@/utils/formatting";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const HALIFAX_TZ = "America/Halifax";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = yup.object({
	caregiverId: IdRule.required("Please select a caregiver"),
	clientId: yup.string().test("exclusive", "Please select a client", function (value) {
		return !!value || !!this.parent.homeId;
	}),
	homeId: yup.string().test("exclusive", "Please select a home", function (value) {
		return !!value || !!this.parent.clientId;
	}),
	// When "Add past shift" is enabled the shift is being backfilled, so the
	// future-only rule is bypassed (the server records it as already completed).
	addPastShift: yup.boolean().default(false),
	startTime: yup.string().required("Start time is required")
		.test("is-future", "Start time must be in the future", function (v) {
			if (!v) return true;
			if (this.parent.addPastShift) return true;
			const start = DateTime.fromISO(v, { zone: HALIFAX_TZ });
			const now = DateTime.now().setZone(HALIFAX_TZ);
			return start.isValid && start > now;
		}),
	endTime: yup.string().required("End time is required")
		.test("is-after-start", "End time must be after start time", function (v) {
			if (!v || !this.parent.startTime) return true;
			const end = DateTime.fromISO(v, { zone: HALIFAX_TZ });
			const start = DateTime.fromISO(this.parent.startTime, { zone: HALIFAX_TZ });
			return end.isValid && start.isValid && end > start;
		})
		.test("min-duration", "Shift must be at least 30 minutes long", function (v) {
			if (!v || !this.parent.startTime) return true;
			const end = DateTime.fromISO(v, { zone: HALIFAX_TZ });
			const start = DateTime.fromISO(this.parent.startTime, { zone: HALIFAX_TZ });
			if (!end.isValid || !start.isValid) return true;
			return end.diff(start, "minutes").minutes >= 30;
		}),
	// Contact person — display only, not submitted
	/*
	contactFName: nameRule.optional(),
	contactLName: nameRule.optional(),
	contactPhone: phoneRule.optional(),
	*/
	// A note explaining the reason is mandatory when backfilling a past shift
	// (mirrors the backend's BACKFILL_NOTES_REQUIRED rule).
	shiftNotes: longTextRule.when("addPastShift", {
		is: true,
		then: (s) => s.required("A note describing the reason is required for a past shift"),
		otherwise: (s) => s.optional(),
	}),

	// Address fields for geofence
	geofenceStreet: longTextRule.required("Please search and select a service address"),
	geofenceCity: shortTextRule.required("City is required"),
	geofenceProvince: shortTextRule.required("Province is required"),
	geofencePostalCode: shortTextRule.required("Postal Code is required"),
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddNewShiftPage() {
	const router = useRouter();
	const [deviceTimeZone, setDeviceTimeZone] = useState(null);
	const [halifaxNowLabel, setHalifaxNowLabel] = useState("");

	useEffect(() => {
		// If the user isn't in Halifax timezone, show the current Halifax wall-clock time.
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		setDeviceTimeZone(tz);

		const update = () => {
			setHalifaxNowLabel(DateTime.now().setZone(HALIFAX_TZ).toFormat("ccc, MMM d, yyyy • h:mm a"));
		};

		// Update immediately, then align to the next system minute boundary.
		update();
		const msToNextMinute = 60_000 - (Date.now() % 60_000);
		let intervalId;
		const timeoutId = setTimeout(() => {
			update();
			intervalId = setInterval(update, 60_000);
		}, msToNextMinute);

		return () => {
			clearTimeout(timeoutId);
			if (intervalId) clearInterval(intervalId);
		};
	}, []);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		control,
		formState: { errors },
	} = useForm({ resolver: yupResolver(schema), defaultValues: { addPastShift: false } });

	const selectedStartTime = watch("startTime");
	const selectedEndTime = watch("endTime");

	// ── "Add past shift" toggle + confirmation modal ───────────────────────────
	const [showPastShiftModal, setShowPastShiftModal] = useState(false);
	const addPastShift = watch("addPastShift");

	// ── Target type (Client or Home) ───────────────────────────────────────────

	const [targetType, setTargetType] = useState("client"); // "client" | "home"

	function handleTargetChange(type) {
		setTargetType(type);
		// Clear the other target when switching.
		// handleClearHome also resets the auto-filled service location.
		if (type === "client") {
			handleClearHome();
		} else {
			setSelectedClient(null);
			setClientInput("");
			setClientSearch("");
			setShowClientDropdown(false);
			setValue("clientId", "");
		}
	}

	// ── Map & address state ────────────────────────────────────────────────────

	const [mapCenter, setMapCenter] = useState({ lat: 44.6476, lng: -63.5728 });
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

		// Auto-fill the service location from the home's saved address.
		// This also disables the address search bar (see AddressAutocomplete below).
		if (home.address) {
			const street = home.address.street || "";
			const city = home.address.city || "";
			const state = home.address.province || home.address.state || "";
			const postalCode = home.address.postalCode || home.address.pinCode || "";
			const country = home.address.country || "Canada";

			setValue("geofenceStreet", street, { shouldValidate: false });
			setValue("geofenceCity", city, { shouldValidate: false });
			setValue("geofenceProvince", state, { shouldValidate: false });
			setValue("geofencePostalCode", postalCode, { shouldValidate: false });

			const fullAddress = [street, city, state, postalCode, country].filter(Boolean).join(", ");
			setGeofenceAddress(fullAddress);
			setHasAddressSelected(true);

			// Pan the map to the home's GPS coordinates if available
			if (home.gpsCoordinates?.latitude && home.gpsCoordinates?.longitude) {
				const newCenter = { lat: home.gpsCoordinates.latitude, lng: home.gpsCoordinates.longitude };
				setMapCenter(newCenter);
				if (mapRefsRef.current) {
					const { mapInstance, marker, circle } = mapRefsRef.current;
					mapInstance?.panTo(newCenter);
					mapInstance?.setZoom(15);
					marker?.setPosition(newCenter);
					circle?.setCenter(newCenter);
				}
			}
		}
	}

	function handleClearHome() {
		setSelectedHome(null);
		setHomeInput("");
		setHomeSearch("");
		setShowHomeDropdown(false);
		setValue("homeId", "");

		// Clear the auto-filled service location so the address search bar is usable again
		setValue("geofenceStreet", "");
		setValue("geofenceCity", "");
		setValue("geofenceProvince", "");
		setValue("geofencePostalCode", "");
		setGeofenceAddress("");
		setHasAddressSelected(false);
		setMapCenter({ lat: 44.6476, lng: -63.5728 });
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
	// Region fence: when a home is selected, only show caregivers assigned to the
	// home's region (the server enforces the same rule on save).
	if (selectedHome?.region) caregiverParams.region = selectedHome.region;
	if (selectedStartTime) {
		const startDate = DateTime.fromISO(selectedStartTime, { zone: HALIFAX_TZ });
		if (startDate.isValid) {
			caregiverParams.availabilityDay = DAY_NAMES[startDate.weekday % 7]; // Luxon: Monday=1..Sunday=7
			caregiverParams.availabilityStartTime = startDate.toFormat("HH:mm");
		}
		if (selectedEndTime) {
			const endDate = DateTime.fromISO(selectedEndTime, { zone: HALIFAX_TZ });
			if (endDate.isValid) caregiverParams.availabilityEndTime = endDate.toFormat("HH:mm");
		}
	}

	const { caregivers } = useCaregivers({ params: caregiverParams });

	const adminParams = { page: 1, limit: 10, search: caregiverSearch, isActive: true, hasAccessApp: true };
	if (selectedHome?.region) adminParams.region = selectedHome.region;

	const { admins } = useAdmins({ params: adminParams });

	const combinedAssignees = [
		...(caregivers ?? []).map((cg) => ({ ...cg, _type: "caregiver" })),
		...(admins ?? []).map((a) => ({ ...a, _type: "admin" })),
	];

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

	// ── Long-shift (>12h) confirmation ─────────────────────────────────────────
	// Shifts longer than 12 hours are allowed but unusual, so we warn before
	// saving rather than blocking. The submit is stashed until the user confirms.
	const [showLongShiftModal, setShowLongShiftModal] = useState(false);
	const [longShiftHours, setLongShiftHours] = useState(0);
	const pendingSubmitRef = useRef(null);

	// ── Capacity-exceeded overage decision ─────────────────────────────────────
	// When the backend rejects a shift with 409 CAPACITY_EXCEEDED, we open a modal
	// that shows the hours breakdown and lets the admin choose how to handle it.
	//
	// capacityData — null (modal closed) or:
	//   { details: { maxHours, committedHours, shiftHours, projectedTotal,
	//                overageHours, payPeriod }, pendingData: <original shiftData> }
	//   `pendingData` is the shiftData that was blocked — resubmitted on confirm
	//   with overageDecision added.
	//
	// capacityDecision — "mandated" | "voluntary" | null (nothing chosen yet)
	//   "mandated"  → above-capacity hours pay as overtime; shift created immediately.
	//   "voluntary" → a bank-or-pay acknowledgment approval is pushed to the
	//                 caregiver's mobile app; clock-in is blocked until they respond.
	//
	// voluntaryPendingShift — null (not shown) or { caregiverName }
	//   Shown after creating a voluntary shift instead of the normal redirect,
	//   so the admin knows the shift is waiting for the caregiver's decision.
	const [capacityData,         setCapacityData]         = useState(null);
	const [capacityDecision,     setCapacityDecision]     = useState(null);
	const [voluntaryPendingShift, setVoluntaryPendingShift] = useState(null);

	// Using mutateAsync (not mutate) so the error and our setCapacityData call
	// land in the same React 18 batch — no render gap where the banner flashes.
	async function buildAndSubmit(data) {
		const shiftData = {
			caregiverId: data.caregiverId,
			startTime: data.startTime,
			endTime: data.endTime,
			timezone: HALIFAX_TZ,
			notes: data.shiftNotes || undefined,
			tasks: tasks.map((t) => ({ description: t.text, completed: false })),
		};

		if (targetType === "client" && data.clientId) {
			shiftData.clientId = data.clientId;
		} else if (targetType === "home" && data.homeId) {
			shiftData.homeId = data.homeId;
		}

		if (hasAddressSelected && (data.geofenceStreet || data.geofenceCity)) {
			shiftData.geofence = {
				center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
				radius: 100,
				shape: "circle",
				address: geofenceAddress || undefined,
			};
		}

		try {
			await addShift(shiftData);
			router.push("/scheduling");
		} catch (err) {
			if (err?.response?.data?.code === "CAPACITY_EXCEEDED") {
				setCapacityData({
					details:     err.response.data.details,
					pendingData: shiftData,
				});
				setCapacityDecision(null);
			}
			// All other errors surface via actionShiftError automatically.
		}
	}

	/**
	 * Called when the admin confirms the capacity-exceeded modal.
	 *
	 * Resubmits the blocked shiftData with `overageDecision` added:
	 *   "mandated"  → shift created immediately as overtime; redirect to schedule.
	 *   "voluntary" → shift created with ackStatus:"pending"; caregiver receives
	 *                 a bank-or-pay acknowledgment on mobile; clock-in is blocked.
	 *                 Instead of redirecting, we show a "pending" success banner
	 *                 so the admin knows they're waiting for the caregiver.
	 */
	async function handleCapacityDecision() {
		if (!capacityDecision || !capacityData) return;
		const decision        = capacityDecision;
		const { pendingData } = capacityData;
		const cgName = selectedCaregiver
			? `${selectedCaregiver.firstName} ${selectedCaregiver.lastName}`
			: "the caregiver";

		setCapacityData(null);
		setCapacityDecision(null);

		try {
			const shift = await addShift({ ...pendingData, overageDecision: decision });
			if (decision === "voluntary") {
				setVoluntaryPendingShift({
					caregiverName:       cgName,
					approvalId:          shift?.extraHours?.approvalId          ?? null,
					plannedOverageHours: shift?.extraHours?.plannedOverageHours ?? null,
				});
			} else {
				router.push("/scheduling");
			}
		} catch (err) {
			// actionShiftError displays any non-CAPACITY error automatically.
		}
	}

	function onSubmit(data) {
		const start = DateTime.fromISO(data.startTime, { zone: HALIFAX_TZ });
		const end   = DateTime.fromISO(data.endTime,   { zone: HALIFAX_TZ });
		const durationHours = start.isValid && end.isValid ? end.diff(start, "hours").hours : 0;

		if (durationHours > 12) {
			pendingSubmitRef.current = data;
			setLongShiftHours(durationHours);
			setShowLongShiftModal(true);
			return;
		}

		buildAndSubmit(data);
	}

	// ── Min values for time pickers (recalculate each render) ─────────────────
	const nowLocal = DateTime.now().setZone(HALIFAX_TZ).toFormat("yyyy-MM-dd'T'HH:mm");

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

			{/*
			 * Hide the generic error banner while the capacity modal is open —
			 * the modal already communicates why the shift was blocked and it's
			 * cleaner than showing both at once.  After cancel, capacityData
			 * becomes null and the banner re-appears so the admin has context.
			 */}
			{/* Hidden while the capacity modal is open (it already explains the block)
			    and after voluntary success (the shift was created — error is stale). */}
			{actionShiftError && !capacityData && !voluntaryPendingShift && (
				<ActionMessage variant="error" message={actionShiftError} />
			)}

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.cards}>

					{/* ── Left: Target (Client / Home) ── */}
					<Card>
						<CardHeader>Assign to Client or Home</CardHeader>
						<CardContent>

							{/* Selector dropdown */}
							<div className={styles.card_row_1}>
								<label className={styles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>
									Shift Target <span style={{ color: '#E53E3E', fontSize: '0.85rem', fontWeight: 700 }}>*</span>
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
										<label className={styles.label}>Search Client <span style={{ color: '#E53E3E', fontSize: '0.85rem', fontWeight: 700 }}>*</span></label>
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
													{formatAddress(selectedClient.address) || "—"}
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
										<label className={styles.label}>Search Home <span style={{ color: '#E53E3E', fontSize: '0.85rem', fontWeight: 700 }}>*</span></label>
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
													{formatAddress(selectedHome.address) || "—"}
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

								{/* Halifax time notice (only when device TZ differs) */}
								{deviceTimeZone && deviceTimeZone !== HALIFAX_TZ && (
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
										<span>
											Current Halifax time: <strong>{halifaxNowLabel}</strong>
										</span>
									</div>
								)}

								{/* Add past shift — relaxes the future-only rule and requires a note */}
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem", fontSize: "0.9rem", color: "#4b5563", cursor: "pointer" }}>
									<input
										type="checkbox"
										checked={!!addPastShift}
										onChange={(e) => {
											if (e.target.checked) {
												// Confirm before enabling; don't toggle on until the user accepts.
												setShowPastShiftModal(true);
											} else {
												setValue("addPastShift", false, { shouldValidate: true });
											}
										}}
									/>
									Add past shift
								</label>

								<div className={styles.card_row_2}>
									<InputField
										label="Start Time"
										type="datetime-local"
										name="startTime"
										register={register}
										control={control}
										error={errors.startTime}
										min={addPastShift ? undefined : nowLocal}
										required
									/>
									<InputField
										label="End Time"
										type="datetime-local"
										name="endTime"
										register={register}
										control={control}
										error={errors.endTime}
										min={addPastShift ? undefined : (selectedStartTime || nowLocal)}
										required
									/>
								</div>
								<InputField label="Shift Notes" name="shiftNotes" type="textarea" rows={4} register={register} error={errors.shiftNotes} required={!!addPastShift} />
							</CardContent>
						</Card>

						{/* Caregiver assignment */}
						<Card>
							<CardHeader>Caregiver Assignment</CardHeader>
							<CardContent>
								<div className={styles.searchContainer}>
									<label className={styles.label}>Search Caregiver <span style={{ color: '#E53E3E', fontSize: '0.85rem', fontWeight: 700 }}>*</span></label>
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
									{showCaregiverDropdown && !selectedCaregiver && combinedAssignees.length > 0 && (
										<div className={styles.searchResultsDropdown}>
											{combinedAssignees.map((person) => (
												<div key={`${person._type}-${person.id}`} className={styles.searchResultItem} onMouseDown={() => handleSelectCaregiver(person)}>
													<span>{person.firstName} {person.lastName}</span>
													<span style={{
														fontSize: "0.68rem",
														fontWeight: 600,
														padding: "2px 7px",
														borderRadius: "999px",
														backgroundColor: person._type === "admin" ? "#dbeafe" : "#d1fae5",
														color: person._type === "admin" ? "#1d4ed8" : "#065f46",
														marginLeft: "8px",
														flexShrink: 0,
													}}>
														{person._type === "admin" ? "Admin" : "Caregiver"}
													</span>
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
							<div style={{ position: "relative", width: "100%", height: "clamp(240px, 42vh, 350px)", border: "1px solid #DEE1E6FF", borderRadius: "8px", overflow: "hidden" }}>
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
								// Disable manual search when a home is selected —
								// the address is auto-filled from the home's saved address
								disabled={targetType === "home" && !!selectedHome}
							/>
						</div>
					</div>
				</Card>

			</form>

			{/* Confirmation before enabling "Add past shift" */}
			<Modal isOpen={showPastShiftModal} onClose={() => setShowPastShiftModal(false)}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "1rem 0.5rem" }}>
					<h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--color-primary)" }}>Add a past shift?</h2>
					<p style={{ marginTop: "0.75rem", color: "#4b5563", lineHeight: 1.5 }}>
						Are you sure you want to add a shift that has already taken place? This shift will be
						recorded as completed, and its scheduled times will be used as the actual worked hours.
						You must also provide a note describing the reason for adding it.
					</p>
					<div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
						<Button
							variant="primary"
							onClick={() => {
								setValue("addPastShift", true, { shouldValidate: true });
								setShowPastShiftModal(false);
							}}
						>
							Yes, add past shift
						</Button>
						<Button variant="secondary" onClick={() => setShowPastShiftModal(false)}>Cancel</Button>
					</div>
				</div>
			</Modal>

			<CapacityExceededModal
				isOpen={!!capacityData}
				onClose={() => { setCapacityData(null); setCapacityDecision(null); }}
				caregiverName={
					selectedCaregiver
						? `${selectedCaregiver.firstName} ${selectedCaregiver.lastName}`
						: "This caregiver"
				}
				details={capacityData?.details ?? {}}
				decision={capacityDecision}
				onDecisionChange={setCapacityDecision}
				onConfirm={handleCapacityDecision}
				isSaving={isShiftActionPending}
			/>

			<VoluntaryPendingModal
				isOpen={!!voluntaryPendingShift}
				onClose={() => router.push("/scheduling")}
				caregiverName={voluntaryPendingShift?.caregiverName}
				plannedOverageHours={voluntaryPendingShift?.plannedOverageHours}
				approvalId={voluntaryPendingShift?.approvalId}
			/>

			{/* Warning before saving a shift longer than 12 hours (allowed, not blocked) */}
			<Modal isOpen={showLongShiftModal} onClose={() => setShowLongShiftModal(false)}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "1rem 0.5rem" }}>
					<h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--color-primary)" }}>Long shift warning</h2>
					<p style={{ marginTop: "0.75rem", color: "#4b5563", lineHeight: 1.5 }}>
						This shift is <strong>{Math.round(longShiftHours * 10) / 10} hours</strong> long, which is more than 12 hours.
						Are you sure you want to create it?
					</p>
					<div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
						<Button
							variant="primary"
							disabled={isShiftActionPending}
							onClick={() => {
								const data = pendingSubmitRef.current;
								pendingSubmitRef.current = null;
								setShowLongShiftModal(false);
								if (data) buildAndSubmit(data);
							}}
						>
							Yes, create shift
						</Button>
						<Button variant="secondary" onClick={() => { pendingSubmitRef.current = null; setShowLongShiftModal(false); }}>Cancel</Button>
					</div>
				</div>
			</Modal>
		</PageLayout>
	);
}