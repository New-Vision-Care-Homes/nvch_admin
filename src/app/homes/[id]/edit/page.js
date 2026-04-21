"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./edit_home.module.css";
import cardStyles from "@components/UI/Card.module.css";
import { useRouter, useParams } from "next/navigation";
import { useHomes } from "@/hooks/useHomes";
import { useClients } from "@/hooks/useClients";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useAdmins } from "@/hooks/useAdmins";
import { useGoogleMap } from "@/hooks/useGoogleMap";
import { Search, X } from "lucide-react";
import ErrorState from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";

const schema = yup.object({
	name: yup.string().required("Home name is required"),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),
	programTypes: yup.array()
		.of(yup.string().oneOf(['DSP', 'Seniors', 'ILS', 'IF']))
		.min(1, "At least one program type is required")
		.required("At least one program type is required"),

	// Geofence
	geofenceRadius: yup.number().positive("Radius must be positive").required("Geofence radius is required"),
	geofenceShape: yup.string().oneOf(["circle", "polygon"], "Invalid shape").required("Geofence shape is required"),

	// Night Checks
	nightChecksEnabled: yup.boolean(),
	nightCheckFrequency: yup.number().positive("Frequency must be positive").nullable(),

	// Settings
	allowTemporaryLeave: yup.boolean(),
	requireLocationCheckIn: yup.boolean(),
	isActive: yup.boolean(),

	openedAt: yup.date().nullable(),
	notes: yup.string().nullable(),
});



export default function EditHomePage() {
	const router = useRouter();
	const params = useParams();
	const homeId = params.id;

	const {
		homeDetail: home,
		updateHome,
		isActionPending,
		isLoading: isFetching,
		fetchError,
		actionError
	} = useHomes(homeId);

	const { register, handleSubmit, watch, control, formState: { errors }, setValue, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			programTypes: [],
			nightChecksEnabled: true,
			nightCheckFrequency: 60,
			allowTemporaryLeave: true,
			requireLocationCheckIn: true,
			isActive: true,
			geofenceRadius: 200,
			geofenceShape: "circle",
		}
	});

	// Program types state
	const [selectedProgramTypes, setSelectedProgramTypes] = useState([]);
	// Staff search state
	const [selectedCaregivers, setSelectedCaregivers] = useState([]);
	const [selectedAdmins, setSelectedAdmins] = useState([]);
	const [selectedClients, setSelectedClients] = useState([]);

	// Pre-fill form when home data is loaded
	useEffect(() => {
		if (home) {
			reset({
				name: home.name,
				region: home.region,
				programTypes: home.programTypes || [],
				geofenceRadius: home.defaultGeofence?.radius || 200,
				geofenceShape: home.defaultGeofence?.shape || "circle",
				nightChecksEnabled: home.nightChecksEnabled,
				nightCheckFrequency: home.nightCheckFrequency,
				allowTemporaryLeave: home.allowTemporaryLeave,
				requireLocationCheckIn: home.requireLocationCheckIn,
				isActive: home.isActive,
				openedAt: home.openedAt ? new Date(home.openedAt).toISOString().split('T')[0] : null,
				notes: home.notes,
				street: home.address?.street || "",
				city: home.address?.city || "",
				province: home.address?.province || "",
				postalCode: home.address?.postalCode || "",
				country: home.address?.country || "Canada",
			});

			setSelectedProgramTypes(home.programTypes || []);
			setSelectedCaregivers(home.caregivers || []);
			// API returns admins as [{ admin: {...}, adminLevel }], normalise to flat user objects
			// with an extra adminLevel field so we can display names and re-submit correctly
			setSelectedAdmins(
				(home.admins || []).map(entry =>
					typeof entry.admin === 'object' && entry.admin !== null
						? { ...entry.admin, adminLevel: entry.adminLevel || 'supervisor' }
						: entry
				)
			);
			setSelectedClients(home.clients || []);
		}
	}, [home, reset]);

	// Google Maps Integration
	const {
		mapRef,
		inputRef,
		isLoaded,
		loadError,
		address: mapAddress,
		center: mapCenter,
		addressComponents,
		updateRadius,
		setAddress
	} = useGoogleMap({
		initialCenter: home?.gpsCoordinates ? { lat: home.gpsCoordinates.latitude, lng: home.gpsCoordinates.longitude } : undefined,
		initialRadius: home?.defaultGeofence?.radius || 200
	});

	// Update setAddress when home address is loaded
	useEffect(() => {
		if (home?.address?.street && !mapAddress) {
			setAddress(`${home.address.street}, ${home.address.city}`);
		}
	}, [home, mapAddress, setAddress]);

	const geofenceRadius = watch("geofenceRadius");
	const nightChecksEnabled = watch("nightChecksEnabled");

	// Update map radius when form input changes
	useEffect(() => {
		updateRadius(geofenceRadius);
	}, [geofenceRadius, updateRadius]);

	// Auto-fill address fields when address is selected from autocomplete
	useEffect(() => {
		if (addressComponents) {
			const street = addressComponents.street || "";
			const city = addressComponents.city || "";
			const province = addressComponents.province || "";
			const postalCode = addressComponents.postalCode || "";
			const country = addressComponents.country || "";

			setValue("street", street);
			setValue("city", city);
			setValue("province", province);
			setValue("postalCode", postalCode);
			setValue("country", country);
		}
	}, [addressComponents, setValue]);

	// Sync selectedProgramTypes with react-hook-form
	useEffect(() => {
		setValue("programTypes", selectedProgramTypes, { shouldValidate: true });
	}, [selectedProgramTypes, setValue]);

	// Caregiver Search States
	const [caregiverSearch, setCaregiverSearch] = useState("");
	const [showCaregiverResults, setShowCaregiverResults] = useState(false);

	// Client Search States
	const [clientSearch, setClientSearch] = useState("");
	const [showClientResults, setShowClientResults] = useState(false);

	// Admin Search States
	const [adminSearch, setAdminSearch] = useState("");
	const [showAdminResults, setShowAdminResults] = useState(false);

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
	useEffect(() => { debouncedSearchCaregivers(caregiverSearch); }, [caregiverSearch, debouncedSearchCaregivers]);

	const handleCaregiverSelect = (caregiver) => {
		setSelectedCaregivers([...selectedCaregivers, caregiver]);
		setCaregiverSearch("");
		setShowCaregiverResults(false);
	};
	const removeCaregiver = (id) => { setSelectedCaregivers(selectedCaregivers.filter(c => c.id !== id)); };

	// Search Clients
	const [clientSearchParams, setClientSearchParams] = useState({});
	const { clients: searchedClients } = useClients(clientSearchParams);

	const searchClients = (searchTerm) => {
		if (searchTerm.length < 2) {
			setClientSearchParams({});
			return;
		}
		setClientSearchParams({ search: searchTerm, page: 1, limit: 10 });
	};

	// Memoize filtered client results to avoid infinite loops and unnecessary re-renders
	const clientResults = useMemo(() => {
		if (!searchedClients || !clientSearchParams.search) return [];

		return searchedClients.filter(client => {
			const exists = selectedClients.find(c => c.id === client.id);
			return !exists;
		});
	}, [searchedClients, clientSearchParams.search, selectedClients]);

	const debouncedSearchClients = useCallback(debounce(searchClients, 300), [selectedClients]);
	useEffect(() => { debouncedSearchClients(clientSearch); }, [clientSearch, debouncedSearchClients]);

	const handleClientSelect = (client) => {
		setSelectedClients([...selectedClients, client]);
		setClientSearch("");
		setShowClientResults(false);
	};
	const removeClient = (id) => { setSelectedClients(selectedClients.filter(c => c.id !== id)); };

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
			admin => !selectedAdmins.find(a => (a.id || a._id) === (admin.id || admin._id))
		);
	}, [searchedAdmins, adminSearchParams.search, selectedAdmins]);

	const debouncedSearchAdmins = useCallback(debounce(searchAdmins, 300), [selectedAdmins]);
	useEffect(() => { debouncedSearchAdmins(adminSearch); }, [adminSearch, debouncedSearchAdmins]);

	const handleAdminSelect = (admin) => {
		setSelectedAdmins([...selectedAdmins, { ...admin, adminLevel: 'supervisor' }]);
		setAdminSearch("");
		setShowAdminResults(false);
	};
	const removeAdmin = (id) => { setSelectedAdmins(selectedAdmins.filter(a => (a.id || a._id) !== id)); };

	const onSubmit = async (data) => {
		const homeData = {
			name: data.name,
			region: data.region,
			programTypes: data.programTypes,
			address: {
				street: data.street || mapAddress,
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
			caregivers: selectedCaregivers.map(s => s.id),
			admins: selectedAdmins.map(a => ({ admin: a.id, adminLevel: a.adminLevel || 'supervisor' })),
			clients: selectedClients.map(c => c.id),
			nightChecksEnabled: data.nightChecksEnabled || false,
			nightCheckFrequency: data.nightChecksEnabled ? data.nightCheckFrequency : null,
			allowTemporaryLeave: data.allowTemporaryLeave || false,
			requireLocationCheckIn: data.requireLocationCheckIn || false,
			isActive: data.isActive || false,
			openedAt: data.openedAt || new Date().toISOString(),
			notes: data.notes || "",
		};

		try {
			await updateHome({ id: homeId, data: homeData });
			router.push("/homes");
		} catch (err) {
			alert(err.message);
		}
	};

	function handleCancel() {
		router.push("/homes");
	}

	if (isFetching) return <PageLayout><div>Loading home details...</div></PageLayout>;
	if (fetchError && !home) return (
		<PageLayout>
			<ErrorState
				isLoading={isFetching}
				errorMessage={fetchError || "Home not found"}
				onRetry={() => window.location.reload()}
			/>
		</PageLayout>
	);
	if (loadError) return <PageLayout><div>Error loading Google Maps</div></PageLayout>;

	return (
		<PageLayout>
			<form onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.header}>
					<h1>Edit Home: {home?.name}</h1>
					<div className={styles.buttons}>
						<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
						<Button variant="primary" type="submit" disabled={isActionPending}>
							{isActionPending ? "Saving..." : "Save Changes"}
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
									<InputField label="Home Name" name="name" register={register} error={errors.name} />
									<InputField
										label="Region"
										name="region"
										type="select"
										register={register}
										error={errors.region}
										options={[
											{ label: "Central", value: "Central" },
											{ label: "Windsor", value: "Windsor" },
											{ label: "HRM", value: "HRM" },
											{ label: "Yarmouth", value: "Yarmouth" },
											{ label: "Shelburne", value: "Shelburne" },
											{ label: "South Shore", value: "South Shore" }
										]}
									/>
								</div>

								<div style={{ marginBottom: '1.5rem' }}>
									<label className={cardStyles.label}>Program Types *</label>
									<div className="checkboxGroup horizontal" style={{ marginTop: '0.5rem' }}>
										{['DSP', 'Seniors', 'ILS', 'IF'].map(type => (
											<label key={type} className="checkboxLabel">
												<input
													type="checkbox"
													checked={selectedProgramTypes.includes(type)}
													onChange={(e) => {
														if (e.target.checked) {
															setSelectedProgramTypes([...selectedProgramTypes, type]);
														} else {
															setSelectedProgramTypes(selectedProgramTypes.filter(t => t !== type));
														}
													}}

												/>
												<span>{type}</span>
											</label>
										))}
									</div>
									{errors.programTypes && (
										<div className={cardStyles.error}>
											{errors.programTypes.message}
										</div>
									)}
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
											onChange={(e) => setCaregiverSearch(e.target.value)}
											onFocus={() => caregiverSearch.length >= 2 && setShowCaregiverResults(true)}
											placeholder="Search caregivers..."
											className={cardStyles.input}
										/>
										{showCaregiverResults && caregiverResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{caregiverResults.map(caregiver => (
													<div
														key={caregiver.id}
														onClick={() => handleCaregiverSelect(caregiver)}
														className={cardStyles.searchItem}
													>
														<div style={{ fontWeight: '500' }}>{caregiver.firstName} {caregiver.lastName}</div>
														<div style={{ fontSize: '0.85rem', color: '#666' }}>{caregiver.email || caregiver.phone}</div>
													</div>
												))}
											</div>
										)}
									</div>
									<div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
										{selectedCaregivers.map(caregiver => (
											<div key={caregiver.id} className={cardStyles.badge}>
												<span>{caregiver.firstName} {caregiver.lastName}</span>
												<X size={16} onClick={() => removeCaregiver(caregiver.id)} style={{ cursor: 'pointer' }} />
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
											onChange={(e) => setClientSearch(e.target.value)}
											onFocus={() => clientSearch.length >= 2 && setShowClientResults(true)}
											placeholder="Search clients..."
											className={cardStyles.input}
										/>
										{showClientResults && clientResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{clientResults.map(client => (
													<div key={client.id} onClick={() => handleClientSelect(client)} className={cardStyles.searchItem}>
														<div style={{ fontWeight: '500' }}>{client.firstName} {client.lastName}</div>
														<div style={{ fontSize: '0.85rem', color: '#666' }}>{client.email || client.phone}</div>
													</div>
												))}
											</div>
										)}
									</div>
									<div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
										{selectedClients.map(client => (
											<div key={client.id} className={cardStyles.badge} style={{ background: '#e8f5e9' }}>
												<span>{client.firstName} {client.lastName}</span>
												<X size={16} onClick={() => removeClient(client.id)} style={{ cursor: 'pointer' }} />
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
											onChange={(e) => setAdminSearch(e.target.value)}
											onFocus={() => adminSearch.length >= 2 && setShowAdminResults(true)}
											placeholder="Search admins..."
											className={cardStyles.input}
										/>
										{showAdminResults && adminResults.length > 0 && (
											<div className={cardStyles.searchResults}>
												{adminResults.map(admin => (
													<div key={admin.id || admin._id} onClick={() => handleAdminSelect(admin)} className={cardStyles.searchItem}>
														<div style={{ fontWeight: '500' }}>{admin.firstName} {admin.lastName}</div>
														<div style={{ fontSize: '0.85rem', color: '#666' }}>{admin.email}</div>
													</div>
												))}
											</div>
										)}
									</div>
									<div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
										{selectedAdmins.map(admin => (
											<div key={admin.id || admin._id} className={cardStyles.badge} style={{ background: '#f3e5f5' }}>
												<span>{admin.firstName} {admin.lastName}</span>
												<X size={16} onClick={() => removeAdmin(admin.id || admin._id)} style={{ cursor: 'pointer' }} />
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
								<div style={{ marginBottom: '1rem' }}>
									<label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Search Address</label>
									<input
										ref={inputRef}
										type="text"
										placeholder="Start typing an address..."
										className={cardStyles.input}
									/>
								</div>

								{/* Hidden fields for address components */}
								<input type="hidden" {...register("street")} />
								<input type="hidden" {...register("city")} />
								<input type="hidden" {...register("province")} />
								<input type="hidden" {...register("postalCode")} />
								<input type="hidden" {...register("country")} />

								<div style={{
									width: '100%',
									height: '400px',
									marginBottom: '1.5rem',
									borderRadius: '8px',
									overflow: 'hidden',
									border: '1px solid #DEE1E6FF'
								}}>
									{isLoaded ? (
										<div ref={mapRef} style={{ width: '100%', height: '100%' }} />
									) : (
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5f5f5' }}>
											Loading map...
										</div>
									)}
								</div>

								<div className={styles.row2}>
									<InputField label="Geofence Radius (meters)" name="geofenceRadius" type="number" register={register} error={errors.geofenceRadius} />
									<InputField
										label="Geofence Shape"
										name="geofenceShape"
										type="select"
										register={register}
										error={errors.geofenceShape}
										options={[
											{ label: "Circle", value: "circle" },
											{ label: "Polygon", value: "polygon" }
										]}
									/>
								</div>

								{mapAddress && (
									<div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.9rem' }}>
										<strong>Selected Address:</strong> {mapAddress}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Night Check Configuration */}
						<Card>
							<CardHeader>Night Check Configuration</CardHeader>
							<CardContent>
								<div className={styles.row2}>
									<InputField
										label="Night Checks Enabled"
										name="nightChecksEnabled"
										type="select"
										register={register}
										error={errors.nightChecksEnabled}
										options={[
											{ label: "Yes", value: true },
											{ label: "No", value: false }
										]}
									/>
									{nightChecksEnabled && (
										<InputField label="Check Frequency (minutes)" name="nightCheckFrequency" type="number" register={register} error={errors.nightCheckFrequency} />
									)}
								</div>
							</CardContent>
						</Card>

						{/* Additional Settings */}
						<Card>
							<CardHeader>Additional Settings</CardHeader>
							<CardContent>
								<div className={styles.row2}>
									<InputField
										label="Allow Temporary Leave"
										name="allowTemporaryLeave"
										type="select"
										register={register}
										error={errors.allowTemporaryLeave}
										options={[
											{ label: "Yes", value: true },
											{ label: "No", value: false }
										]}
									/>
									<InputField
										label="Require Location Check-In"
										name="requireLocationCheckIn"
										type="select"
										register={register}
										error={errors.requireLocationCheckIn}
										options={[
											{ label: "Yes", value: true },
											{ label: "No", value: false }
										]}
									/>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</form>
		</PageLayout>
	);
}
