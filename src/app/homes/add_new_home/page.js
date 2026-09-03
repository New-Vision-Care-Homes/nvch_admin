"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_home.module.css";
import { useRouter } from "next/navigation";
import { useHomes } from "@/hooks/useHomes";
import GeofenceMap from "@/components/UI/GeofenceMap";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import ActionMessage from "@components/UI/ActionMessage";
import PersonAssignmentField, { getStaffId } from "../_components/PersonAssignmentField";
import { HOME_TYPE_OPTIONS } from "@/utils/dropdownList/homeType";
import { REGION_OPTIONS } from "@/utils/dropdownList/region";

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
	const { addHome, isActionPending, actionError, fetchHome } = useHomes();

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
	const [mapCenter, setMapCenter] = useState({ lat: 44.6476, lng: -63.5728 }); // Default Halifax
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



	// Staff assignment — each PersonAssignmentField below owns its own search
	// UI; this page just holds the resulting selections (needed for the submit
	// payload) and the "moved from another home" flags it sets on conflict.
	const [selectedCaregivers, setSelectedCaregivers] = useState([]);
	const [selectedClients, setSelectedClients] = useState([]);
	const [selectedAdmins, setSelectedAdmins] = useState([]);
	const [hasCaregiverMove, setHasCaregiverMove] = useState(false);
	const [hasClientMove, setHasClientMove] = useState(false);

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
			...((hasClientMove || hasCaregiverMove) && { confirmMove: true }),
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


	const formValues = watch();
	const newHomeName = formValues.name || "this home";

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
								<PersonAssignmentField
									type="caregiver"
									label="Caregivers"
									selected={selectedCaregivers}
									onSelectedChange={setSelectedCaregivers}
									newHomeName={newHomeName}
									fetchHome={fetchHome}
									onMove={() => setHasCaregiverMove(true)}
								/>
								<PersonAssignmentField
									type="client"
									label="Clients"
									selected={selectedClients}
									onSelectedChange={setSelectedClients}
									newHomeName={newHomeName}
									fetchHome={fetchHome}
									onMove={() => setHasClientMove(true)}
								/>
								<PersonAssignmentField
									type="admin"
									label="Admins"
									selected={selectedAdmins}
									onSelectedChange={setSelectedAdmins}
								/>
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
									height: 'clamp(240px, 45vh, 400px)',
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
