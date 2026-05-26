"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_home.module.css";
import cardStyles from "@components/UI/Card.module.css";
import { useRouter } from "next/navigation";
import { useHomes } from "@/hooks/useHomes";
import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import GeofenceMap from "@/components/UI/GeofenceMap";
import { Search, X } from "lucide-react";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import ActionMessage from "@components/UI/ActionMessage";
import { HOME_TYPE_OPTIONS, REGION_OPTIONS } from "@/utils/dropdown_list";

const schema = yup.object({
	name: yup.string().required("Home name is required"),
	region: yup.string()
		.oneOf(REGION_OPTIONS.map(o => o.value), "Please select a valid region")
		.required("Region is required"),

	homeType: yup.string()
		.oneOf(["SOH", "TEA", "TSA", "ILS", "IF", "DSLTC"], "Please select a valid home type")
		.required("Home type is required"),

	isActive: yup.boolean(),

	openedAt: yup.date().nullable(),
	notes: yup.string().nullable(),
	unit: yup.string().trim().max(50, "Unit cannot exceed 50 characters").matches(/^[a-zA-Z0-9]*$/, "Unit can only contain letters and numbers").optional(),
});



export default function AddNewHomePage() {
	const router = useRouter();
	const { addHome, isActionPending, actionError } = useHomes();

	const { register, handleSubmit, control, watch, formState: { errors }, setValue } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			homeType: "",

			isActive: true,
			geofenceRadius: 100,
			geofenceShape: "circle",
		}
	});

	// Map and Location States
	const [mapCenter, setMapCenter] = useState({ lat: 44.6488, lng: -63.5752 }); // Default Halifax
	const [mapAddress, setMapAddress] = useState("");
	const mapRefsRef = useRef(null);

	// Auto-fill address fields and pan map when address is selected from autocomplete
	const handleAddressSelect = useCallback((data) => {
		const { street, city, state, postalCode, country, latitude, longitude } = data;

		if (street) setValue("street", street, { shouldValidate: true });
		if (city) setValue("city", city, { shouldValidate: true });
		if (state) setValue("province", state, { shouldValidate: true });
		if (country) setValue("country", country, { shouldValidate: true });
		if (postalCode) setValue("postalCode", postalCode, { shouldValidate: true });

		setMapAddress([street, city, state, postalCode, country].filter(Boolean).join(", "));

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



	// Caregiver search state
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [showCaregiverResults, setShowCaregiverResults] = useState(false);
	const [selectedCaregivers, setSelectedCaregivers] = useState([]);

	// Client search state
	const [clientSearch, setClientSearch] = useState("");
	const [showClientResults, setShowClientResults] = useState(false);
	const [selectedClients, setSelectedClients] = useState([]);

	// Admin search state
	const [adminSearch, setAdminSearch] = useState("");
	const [showAdminResults, setShowAdminResults] = useState(false);
	const [selectedAdmins, setSelectedAdmins] = useState([]);

	// Debounce function
	const debounce = (func, delay) => {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
		};
	};

	// Search Caregivers
	const [caregiverSearchParams, setCaregiverSearchParams] = useState({});
	const { caregivers: searchedCaregivers } = useCaregivers(caregiverSearchParams);

	const searchCaregivers = (searchTerm) => {
		if (searchTerm.length < 2) {
			setCaregiverSearchParams({});
			return;
		}
		setCaregiverSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	const caregiverResults = useMemo(() => {
		if (!searchedCaregivers || !caregiverSearchParams.search) return [];
		return searchedCaregivers.filter(c => !selectedCaregivers.find(s => s.id === c.id));
	}, [searchedCaregivers, caregiverSearchParams.search, selectedCaregivers]);

	const debouncedSearchCaregivers = useCallback(debounce(searchCaregivers, 300), [selectedCaregivers]);

	useEffect(() => {
		debouncedSearchCaregivers(caregiverSearch);
	}, [caregiverSearch, debouncedSearchCaregivers]);

	const getStaffId = (person) => person._id || person.id;

	const handleCaregiverSelect = (caregiver) => {
		setSelectedCaregivers([...selectedCaregivers, caregiver]);
		setCaregiverSearch("");
		setShowCaregiverResults(false);
	};
	const removeCaregiver = (id) => { setSelectedCaregivers(selectedCaregivers.filter(c => getStaffId(c) !== id)); };

	// Search Clients
	const [clientSearchParams, setClientSearchParams] = useState({});
	const { clients: searchedClients } = useClients(clientSearchParams);

	const searchClients = (searchTerm) => {
		if (searchTerm.length < 2) {
			setClientSearchParams({});
			return;
		}

		// Update search params to trigger useClients query
		setClientSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	// Memoize filtered client results to avoid infinite loops and unnecessary re-renders
	const clientResults = useMemo(() => {
		if (!searchedClients || !clientSearchParams.search) return [];

		return searchedClients.filter(client => {
			const exists = selectedClients.find(c => getStaffId(c) === getStaffId(client));
			return !exists;
		});
	}, [searchedClients, clientSearchParams.search, selectedClients]);

	const debouncedSearchClients = useCallback(debounce(searchClients, 300), [selectedClients]);

	useEffect(() => {
		debouncedSearchClients(clientSearch);
	}, [clientSearch, debouncedSearchClients]);

	const handleClientSelect = (client) => {
		setSelectedClients([...selectedClients, client]);
		setClientSearch("");
		setShowClientResults(false);
	};
	const removeClient = (id) => { setSelectedClients(selectedClients.filter(c => getStaffId(c) !== id)); };

	// Search Admins via useAdmins hook (GET /api/auth/admin/admins)
	const [adminSearchParams, setAdminSearchParams] = useState({});
	const { admins: searchedAdmins } = useAdmins(adminSearchParams);

	const searchAdmins = (searchTerm) => {
		if (searchTerm.length < 2) {
			setAdminSearchParams({});
			return;
		}
		setAdminSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	const adminResults = useMemo(() => {
		if (!searchedAdmins || !adminSearchParams.search) return [];
		return searchedAdmins.filter(
			admin => !selectedAdmins.find(a => getStaffId(a) === getStaffId(admin))
		);
	}, [searchedAdmins, adminSearchParams.search, selectedAdmins]);

	const debouncedSearchAdmins = useCallback(debounce(searchAdmins, 300), [selectedAdmins]);
	useEffect(() => { debouncedSearchAdmins(adminSearch); }, [adminSearch, debouncedSearchAdmins]);

	const handleAdminSelect = (admin) => {
		setSelectedAdmins([...selectedAdmins, { ...admin, adminLevel: 'supervisor' }]);
		setAdminSearch("");
		setShowAdminResults(false);
	};
	const removeAdmin = (id) => { setSelectedAdmins(selectedAdmins.filter(a => getStaffId(a) !== id)); };

	const onSubmit = (data) => {
		const homeData = {
			name: data.name,
			region: data.region,
			homeType: data.homeType,
			address: {
				street: data.street || mapAddress,
				unit: data.unit || undefined,
				city: data.city || "",
				province: data.province || "",
				postalCode: data.postalCode || "",
				country: data.country || "Canada",
			},
			gpsCoordinates: {
				latitude: mapCenter.lat,
				longitude: mapCenter.lng,
			},
			defaultGeofence: {
				radius: data.geofenceRadius,
				shape: data.geofenceShape,
			},
			caregivers: selectedCaregivers.map(s => getStaffId(s)),
			admins: selectedAdmins.map(a => ({ admin: getStaffId(a), adminLevel: a.adminLevel || 'supervisor' })),
			clients: selectedClients.map(c => getStaffId(c)),
			nightChecksEnabled: data.nightChecksEnabled || false,
			nightCheckFrequency: data.nightChecksEnabled ? data.nightCheckFrequency : null,
			allowTemporaryLeave: data.allowTemporaryLeave || false,
			requireLocationCheckIn: data.requireLocationCheckIn || false,
			isActive: data.isActive || false,
			openedAt: data.openedAt || new Date().toISOString(),
			notes: data.notes || "",
		};

		addHome(homeData, {
			onSuccess: () => {
				router.push("/homes");
			}
		});
	};

	function handleCancel() {
		router.push("/homes");
	}


	return (
		<PageLayout>
			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.header}>
					<h1>Add New Home</h1>
					<div className={styles.buttons}>
						<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
						<Button variant="primary" type="submit" disabled={isActionPending}>
							{isActionPending ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>
				{actionError && <ActionMessage variant="error" message={actionError} />}

				<div className={styles.content}>
					<div className={styles.rightPanel} style={{ width: '100%' }}>
						{/* Basic Information */}
						<Card>
							<CardHeader>Basic Information</CardHeader>
							<CardContent>

								<div className={styles.row2}>
									<InputField label="Home Name" name="name" register={register} error={errors.name} required />
									<InputField
										label="Region"
										name="region"
										type="select"
										register={register}
										error={errors.region}
										required
										options={REGION_OPTIONS}
									/>
								</div>

								<div className={styles.row2}>
									<InputField
										label="Home Type"
										name="homeType"
										type="select"
										register={register}
										error={errors.homeType}
										required
										options={HOME_TYPE_OPTIONS}
									/>
								</div>

								<div className={styles.row2}>
									<InputField
										label="Opened Date"
										name="openedAt"
										type="date"
										register={register}
										control={control}
										error={errors.openedAt}
									/>
									<InputField
										label="Status"
										name="isActive"
										type="select"
										register={register}
										error={errors.isActive}
										options={[
											{ label: "Active", value: true },
											{ label: "Inactive", value: false }
										]}
									/>
								</div>

								<InputField
									label="Notes"
									name="notes"
									type="textarea"
									rows={3}
									register={register}
									error={errors.notes}
									placeholder="Additional notes about this home..."
								/>
							</CardContent>
						</Card>

						{/* Staff Assignment */}
						<Card>
							<CardHeader>Staff Assignment</CardHeader>
							<CardContent>
								{/* Caregivers */}
								<div style={{ marginBottom: '1.5rem' }}>
									<label className={cardStyles.label}>Caregivers</label>
									<div style={{ position: 'relative' }}>
										<input
											type="text"
											value={caregiverSearch}
											onChange={(e) => {
												setCaregiverSearch(e.target.value);
												setShowCaregiverResults(e.target.value.length >= 2);
											}}
											onFocus={() => caregiverSearch.length >= 2 && setShowCaregiverResults(true)}
											onBlur={() => setTimeout(() => setShowCaregiverResults(false), 150)}
											placeholder="Search caregivers..."
											className={cardStyles.input}
										/>
										{showCaregiverResults && caregiverResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{caregiverResults.map(caregiver => (
													<div
														key={getStaffId(caregiver)}
														onMouseDown={() => handleCaregiverSelect(caregiver)}
														className={cardStyles.searchItem}
													>
														<span className={cardStyles.searchItemName}>{caregiver.firstName} {caregiver.lastName}</span>
														<span className={cardStyles.searchItemSub}>{caregiver.email || caregiver.phone}</span>
													</div>
												))}
											</div>
										)}
									</div>
									<div className={cardStyles.badgeList}>
										{selectedCaregivers.map(caregiver => (
											<div key={getStaffId(caregiver)} className={`${cardStyles.badge} ${cardStyles.badgeCaregiver}`}>
												<span>{caregiver.firstName} {caregiver.lastName}</span>
												<X size={14} onClick={() => removeCaregiver(getStaffId(caregiver))} />
											</div>
										))}
									</div>
								</div>

								{/* Clients */}
								<div style={{ marginBottom: '1.5rem' }}>
									<label className={cardStyles.label}>Clients</label>
									<div style={{ position: 'relative' }}>
										<input
											type="text"
											value={clientSearch}
											onChange={(e) => {
												setClientSearch(e.target.value);
												setShowClientResults(e.target.value.length >= 2);
											}}
											onFocus={() => clientSearch.length >= 2 && setShowClientResults(true)}
											onBlur={() => setTimeout(() => setShowClientResults(false), 150)}
											placeholder="Search clients..."
											className={cardStyles.input}
										/>
										{showClientResults && clientResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{clientResults.map(client => (
													<div key={getStaffId(client)} onMouseDown={() => handleClientSelect(client)} className={cardStyles.searchItem}>
														<span className={cardStyles.searchItemName}>{client.firstName} {client.lastName}</span>
														<span className={cardStyles.searchItemSub}>{client.email || client.phone}</span>
													</div>
												))}
											</div>
										)}
									</div>
									<div className={cardStyles.badgeList}>
										{selectedClients.map(client => (
											<div key={getStaffId(client)} className={`${cardStyles.badge} ${cardStyles.badgeClient}`}>
												<span>{client.firstName} {client.lastName}</span>
												<X size={14} onClick={() => removeClient(getStaffId(client))} />
											</div>
										))}
									</div>
								</div>

								{/* Admins */}
								<div>
									<label className={cardStyles.label}>Admins</label>
									<div style={{ position: 'relative' }}>
										<input
											type="text"
											value={adminSearch}
											onChange={(e) => {
												setAdminSearch(e.target.value);
												setShowAdminResults(e.target.value.length >= 2);
											}}
											onFocus={() => adminSearch.length >= 2 && setShowAdminResults(true)}
											onBlur={() => setTimeout(() => setShowAdminResults(false), 150)}
											placeholder="Search admins..."
											className={cardStyles.input}
										/>
										{showAdminResults && adminResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{adminResults.map(admin => (
													<div key={getStaffId(admin)} onMouseDown={() => handleAdminSelect(admin)} className={cardStyles.searchItem}>
														<span className={cardStyles.searchItemName}>{admin.firstName} {admin.lastName}</span>
														<span className={cardStyles.searchItemSub}>{admin.email}</span>
													</div>
												))}
											</div>
										)}
									</div>
									<div className={cardStyles.badgeList}>
										{selectedAdmins.map(admin => (
											<div key={getStaffId(admin)} className={`${cardStyles.badge} ${cardStyles.badgeAdmin}`}>
												<span>{admin.firstName} {admin.lastName}</span>
												<X size={14} onClick={() => removeAdmin(getStaffId(admin))} />
											</div>
										))}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Location & Geofence */}
						<Card>
							<CardHeader>Location & Geofence</CardHeader>
							<CardContent>
								{/* Address Search Input */}
								<div style={{ marginBottom: '1.5rem' }}>
									<AddressAutocomplete
										label="Search Address"
										onAddressSelect={handleAddressSelect}
										placeholder="Start typing to search for an address..."
										id="home-address-autocomplete"
										register={register}
										unitName="unit"
										unitError={errors.unit}
									/>
								</div>

								{/* Map Container */}
								<div style={{
									width: '100%',
									height: '400px',
									marginBottom: '1.5rem',
									borderRadius: '8px',
									overflow: 'hidden',
									border: '1px solid #DEE1E6FF'
								}}>
									<GeofenceMap
										center={mapCenter}
										radius={100}
										onMapReady={(refs) => { mapRefsRef.current = refs; }}
										height="100%"
									/>
								</div>

								{/* Display selected address */}
								{mapAddress && (
									<div style={{
										marginTop: '1rem',
										padding: '0.75rem',
										background: '#f8f9fa',
										borderRadius: '6px',
										fontSize: '0.9rem'
									}}>
										<strong>Selected Address:</strong> {mapAddress}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</form>
		</PageLayout>
	);
}
