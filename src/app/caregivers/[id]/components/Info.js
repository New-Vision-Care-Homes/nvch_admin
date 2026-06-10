"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import { Edit, Save, X, MapPin, Phone, Mail, Users } from "lucide-react";
import { nameRule, emailRule, phoneRule, pinRule, birthRule, shortTextRule, dateRuleOptional, addressComponentRule } from "@/utils/validation";
import { REGION_OPTIONS } from "@/utils/dropdown_list";
import RegionCheckboxGroup from "@components/UI/RegionCheckboxGroup";
import { useParams } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useProfile } from "@/hooks/useProfile";
import { useAdmins } from "@/hooks/useAdmins";
import ErrorState from "@components/UI/ErrorState";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import PersonSearchField from "@/components/UI/PersonSearchField";

const EMPLOYMENT_STATUS_OPTIONS = [
	{ label: "Full Time", value: "full_time" },
	{ label: "Casual", value: "casual" },
	{ label: "Term", value: "term" },
];

const getLabel = (options, value) => options.find(o => o.value === value)?.label || value || "—";

const cleanFetchedData = (apiData) => {
	if (!apiData) return {};
	const cleanData = {
		firstName: apiData.firstName || "",
		lastName: apiData.lastName || "",
		birth: apiData.dateOfBirth?.split('T')[0] || "",
		phone: apiData.phone || "",
		email: apiData.email || "",
		maxHours: apiData.biWeeklyWorkCapacity?.maxHours || 84,
		employeeStartDate: apiData.employeeStartDate?.split('T')[0] || "",
		street: apiData.address?.street || "",
		city: apiData.address?.city || "",
		state: apiData.address?.state || "",
		country: apiData.address?.country || "",
		pincode: apiData.address?.pinCode || "",
		unit: apiData.address?.unit || "",
		regions: Array.isArray(apiData.regions) && apiData.regions.length > 0 ? apiData.regions : (apiData.region ? [apiData.region] : []),
		supervisor: apiData.supervisor || "",
		teamLead: apiData.teamLead || "",
		employmentStatus: apiData.employmentStatus || "",
	};
	const emergencyContact = apiData.emergencyContact || {};
	const emergencyNameParts = emergencyContact.name?.split(' ') || [];
	cleanData.emergencyFName = emergencyNameParts[0] || "";
	cleanData.emergencyLName = emergencyNameParts.slice(1).join(' ') || "";
	cleanData.emergencyPhone = emergencyContact.phone || "";
	cleanData.relationship = emergencyContact.relationship || "";
	return cleanData;
};

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.optional(),
	phone: phoneRule.optional(),
	regions: yup
		.array()
		.of(yup.string().oneOf(REGION_OPTIONS.map(o => o.value), "Please select a valid region"))
		.min(1, "Please select at least one region")
		.required("Please select at least one region"),
	birth: birthRule.optional(),
	employeeStartDate: dateRuleOptional.optional(),
	maxHours: yup.number().transform((v, o) => o === "" ? undefined : v).nullable().notRequired(),
	street: addressComponentRule.required("Street is required"),
	city: addressComponentRule.required("City is required"),
	state: addressComponentRule.required("Province is required"),
	pincode: pinRule.optional(),
	country: addressComponentRule.required("Country is required"),
	unit: yup.string().trim().max(50).matches(/^[a-zA-Z0-9]*$/, "Unit can only contain letters and numbers").optional(),
	employmentStatus: yup.string().oneOf(["full_time", "casual", "term", ""], "Please select a valid employment status").required(),
	supervisor: yup.string().required("Supervisor is required"),
	teamLead: yup.string().optional(),
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),
});


export default function Info() {
	const { profile } = useProfile();
	const canEdit = profile?.permissionSlugs?.includes("update_all_caregivers") || profile?.permissionSlugs?.includes("update_assigned_caregivers");

	const [status, setStatus] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [gpsCoordinates, setGpsCoordinates] = useState({ latitude: 44.6476, longitude: -63.5728 });
	const { id } = useParams();

	const { caregiverDetail, updateCaregiver, isCaregiverLoading, isCaregiverActionPending, caregiverFetchError } = useCaregivers(id);

	const { register, handleSubmit, control, setValue, formState: { errors, isDirty }, watch, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	const watchStreet = watch("street");
	const watchCity = watch("city");
	const watchState = watch("state");
	const watchPincode = watch("pincode");
	const watchCountry = watch("country");
	const watchSupervisor = watch("supervisor");
	const watchTeamLead = watch("teamLead");
	const selectedRegions = watch("regions") || [];

	const { adminDetail: supervisorDetail } = useAdmins(watchSupervisor || "");
	const { adminDetail: teamLeadDetail } = useAdmins(watchTeamLead || "");

	function handleAddressSelect({ street, city, state, country, postalCode, latitude, longitude }) {
		if (street) setValue("street", street, { shouldValidate: true });
		if (city) setValue("city", city, { shouldValidate: true });
		if (state) setValue("state", state, { shouldValidate: true });
		if (country) setValue("country", country, { shouldValidate: true });
		if (postalCode) setValue("pincode", postalCode, { shouldValidate: true });
		if (latitude != null && longitude != null) setGpsCoordinates({ latitude, longitude });
	}

	useEffect(() => {
		if (caregiverDetail && !isInitialized) {
			reset(cleanFetchedData(caregiverDetail));
			if (caregiverDetail.address?.gpsCoordinates?.latitude != null) {
				setGpsCoordinates({ latitude: caregiverDetail.address.gpsCoordinates.latitude, longitude: caregiverDetail.address.gpsCoordinates.longitude });
			}
			setIsInitialized(true);
		}
	}, [caregiverDetail, reset, isInitialized]);

	const onSubmit = async (data) => {
		setStatus(null);
		updateCaregiver({ id, data: {
			email: data.email || null,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone || null,
			dateOfBirth: data.birth || null,
			employeeStartDate: data.employeeStartDate ? new Date(data.employeeStartDate).toISOString() : null,
			regions: data.regions,
			employmentStatus: data.employmentStatus || null,
			address: {
				street: data.street, unit: data.unit || null,
				city: data.city, state: data.state, pinCode: data.pincode, country: data.country,
				gpsCoordinates: { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude },
			},
			biWeeklyWorkCapacity: { maxHours: data.maxHours },
			supervisor: data.supervisor || null,
			teamLead: data.teamLead || null,
			emergencyContact: {
				name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
				phone: data.emergencyPhone || null,
				relationship: data.relationship || null,
			},
		}}, {
			onSuccess: () => {
				setStatus({ variant: "success", text: "Caregiver data updated successfully!" });
				reset(data);
				setIsEditing(false);
			},
			onError: (err) => {
				setStatus({ variant: "error", text: err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to update caregiver." });
			},
		});
	};

	const handleCancel = () => {
		reset(cleanFetchedData(caregiverDetail));
		setStatus(null);
		setIsEditing(false);
	};

	if (isCaregiverLoading || caregiverFetchError) {
		return <ErrorState isLoading={isCaregiverLoading} errorMessage={caregiverFetchError} onRetry={() => window.location.reload()} />;
	}

	const d = caregiverDetail || {};
	const addr = d.address || {};
	const ec = d.emergencyContact || {};

	const fullAddress = [addr.street, addr.city, addr.state, addr.pinCode, addr.country].filter(Boolean).join(", ");

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<div className={styles.body}>

				{/* ── Personal Details ── */}
				<Card>
					<CardHeader>Personal Details</CardHeader>
					<CardContent>
						{!isEditing ? (
							<>
								{/* Name display */}
								<div className={styles.name_display}>
									<div className={styles.name_text}>{d.firstName} {d.lastName}</div>
									{d.employmentStatus && (
										<span className={styles.name_badge}>{getLabel(EMPLOYMENT_STATUS_OPTIONS, d.employmentStatus)}</span>
									)}
								</div>

								{/* Fields grid */}
								<div className={styles.field_grid}>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Date of Birth</div>
										<div className={d.dateOfBirth ? styles.vvalue : styles.vvalue_empty}>
											{d.dateOfBirth?.split('T')[0] || "Not provided"}
										</div>
									</div>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Regions</div>
										<div className={styles.vvalue}>{(Array.isArray(d.regions) && d.regions.length > 0 ? d.regions : (d.region ? [d.region] : [])).map(r => getLabel(REGION_OPTIONS, r)).join(", ") || "—"}</div>
									</div>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Employee Start Date</div>
										<div className={d.employeeStartDate ? styles.vvalue : styles.vvalue_empty}>
											{d.employeeStartDate?.split('T')[0] || "Not provided"}
										</div>
									</div>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Max Hours Biweekly</div>
										<div className={styles.vvalue}>{d.biWeeklyWorkCapacity?.maxHours ?? 84} hrs</div>
									</div>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Supervisor</div>
										<div className={supervisorDetail ? styles.vvalue : styles.vvalue_empty}>
											{supervisorDetail ? `${supervisorDetail.firstName} ${supervisorDetail.lastName}` : (watchSupervisor ? "Loading..." : "Not assigned")}
										</div>
									</div>
									<div className={styles.vfield}>
										<div className={styles.vlabel}>Team Lead</div>
										<div className={teamLeadDetail ? styles.vvalue : styles.vvalue_empty}>
											{teamLeadDetail ? `${teamLeadDetail.firstName} ${teamLeadDetail.lastName}` : (watchTeamLead ? "Loading..." : "Not assigned")}
										</div>
									</div>
								</div>

								{/* Address */}
								<div className={styles.address_box}>
									<div className={styles.address_box_header}>
										<MapPin size={11} />
										Address
									</div>
									{addr.unit && (
										<div className={styles.address_unit_row}>
											<span className={styles.address_unit_label}>Unit / Suite</span>
											<span className={styles.address_unit_value}>{addr.unit}</span>
										</div>
									)}
									<div className={fullAddress ? styles.address_value : styles.vvalue_empty}>
										{fullAddress || "No address on file"}
									</div>
								</div>

							</>
						) : (
							<>
								<div className={styles.card_row_2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.card_row_2}>
									<InputField label="Date of Birth" name="birth" register={register} control={control} error={errors.birth} type="date" />
									<InputField label="Employment Status" name="employmentStatus" type="select" register={register} error={errors.employmentStatus} options={EMPLOYMENT_STATUS_OPTIONS} />
								</div>
								<div style={{ marginBottom: "1rem" }}>
									<RegionCheckboxGroup
										label="Regions"
										required
										value={selectedRegions}
										onChange={(next) => setValue("regions", next, { shouldValidate: true, shouldDirty: true })}
										error={errors.regions}
									/>
								</div>
								<div className={styles.card_row_2}>
									<InputField label="Employee Start Date" name="employeeStartDate" register={register} control={control} error={errors.employeeStartDate} type="date" />
									<InputField label="Max Work Hours Biweekly" name="maxHours" type="number" register={register} error={errors.maxHours} placeholder="84 (Default)" />
								</div>
								<div className={styles.card_row_2}>
									<PersonSearchField label="Supervisor" name="supervisor" control={control} error={errors.supervisor} type="admin" />
									<PersonSearchField label="Team Lead" name="teamLead" control={control} error={errors.teamLead} type="admin" />
								</div>

								<div className={styles.edit_divider}>
									<div className={styles.edit_divider_line} />
									<span className={styles.edit_divider_label}>Address</span>
									<div className={styles.edit_divider_line} />
								</div>

								<AddressAutocomplete
									onAddressSelect={handleAddressSelect}
									register={register}
									fieldNames={{ street: "street", city: "city", state: "state", postalCode: "pincode", country: "country" }}
									unitName="unit"
									unitError={errors.unit}
									error={(errors.street || errors.city || errors.state || errors.country) ? "Address is required, please search the address here" : ""}
									isEditing={true}
									currentAddress={[watchStreet, watchCity, watchState, watchPincode, watchCountry].filter(Boolean).join(", ")}
								/>

							</>
						)}
					</CardContent>
				</Card>

				{/* ── Contact Details ── */}
				<Card>
					<CardHeader>Contact Details</CardHeader>
					<CardContent>
						{!isEditing ? (
							<div className={styles.contact_list}>
								<div className={styles.contact_row}>
									<div className={styles.contact_icon_wrap}><Phone size={16} /></div>
									<div className={styles.contact_detail}>
										<div className={styles.contact_label}>Phone</div>
										<div className={d.phone ? styles.contact_value : styles.contact_value_empty}>
											{d.phone || "Not provided"}
										</div>
									</div>
								</div>
								<div className={styles.contact_row}>
									<div className={styles.contact_icon_wrap}><Mail size={16} /></div>
									<div className={styles.contact_detail}>
										<div className={styles.contact_label}>Email</div>
										<div className={d.email ? styles.contact_value : styles.contact_value_empty}>
											{d.email || "Not provided"}
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className={styles.card_row_2}>
								<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
								<InputField label="Email" name="email" register={register} error={errors.email} />
							</div>
						)}
					</CardContent>
				</Card>

				{/* ── Emergency Contact ── */}
				<Card>
					<CardHeader>Emergency Contact</CardHeader>
					<CardContent>
						{!isEditing ? (
							<>
								<div className={styles.vfield} style={{ marginBottom: "0.75rem" }}>
									<div className={styles.vlabel}>Name</div>
									<div className={ec.name ? styles.vvalue : styles.vvalue_empty}>{ec.name || "Not provided"}</div>
								</div>
								<div className={styles.contact_pair}>
									<div className={styles.contact_row}>
										<div className={styles.contact_icon_wrap}><Users size={16} /></div>
										<div className={styles.contact_detail}>
											<div className={styles.contact_label}>Relationship</div>
											<div className={ec.relationship ? styles.contact_value : styles.contact_value_empty}>
												{ec.relationship || "Not provided"}
											</div>
										</div>
									</div>
									<div className={styles.contact_row}>
										<div className={styles.contact_icon_wrap}><Phone size={16} /></div>
										<div className={styles.contact_detail}>
											<div className={styles.contact_label}>Phone</div>
											<div className={ec.phone ? styles.contact_value : styles.contact_value_empty}>
												{ec.phone || "Not provided"}
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<>
								<div className={styles.card_row_2}>
									<InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
									<InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
								</div>
								<div className={styles.card_row_2}>
									<InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
									<InputField label="Phone" name="emergencyPhone" type="phone" register={register} error={errors.emergencyPhone} />
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{canEdit && (
				<div className={styles.bottom_bar}>
					{!isEditing ? (
						<Button variant="primary" icon={<Edit size={16} />} onClick={() => setIsEditing(true)} type="button">
							Edit
						</Button>
					) : (
						<>
							<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} type="button" disabled={isCaregiverActionPending}>
								Cancel
							</Button>
							<Button variant="primary" icon={<Save size={16} />} type="submit" disabled={!isDirty || isCaregiverActionPending}>
								{isCaregiverActionPending ? "Saving..." : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			)}
		</form>
	);
}
