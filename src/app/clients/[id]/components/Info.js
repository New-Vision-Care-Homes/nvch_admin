"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import { Edit, Save, X, MapPin, Phone, Mail, Users, CreditCard, Home, Calendar, Globe, Heart } from "lucide-react";
import {
	nameRule,
	emailRule,
	phoneRule,
	pinRule,
	birthRule,
	shortTextRule,
	longTextRule,
	dateRule,
	addressComponentRule,
} from "@/utils/validation";
import { useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { useHomes } from "@/hooks/useHomes";
import ClientConflictModal from "@/components/UI/ClientConflictModal";
import { REGION_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/utils/dropdown_list";
import { utcToDateString, localDateToUtc } from "@/utils/timeHandling";

const splitName = (full) => {
	const parts = full?.split(" ") || [];
	return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
};

const fullName = (first, last) => `${first || ""} ${last || ""}`.trim() || null;

const getLabel = (options, value) => options.find(o => o.value === value)?.label || value || "—";

const cleanFetchedData = (apiData) => {
	if (!apiData) return {};

	const ec = apiData.emergencyContact || {};
	const ecName = splitName(ec.name);

	const sdm = apiData.statutoryDecisionMaker || {};
	const sdmName = splitName(sdm.name);

	const nok = apiData.nextOfKin || {};
	const nokName = splitName(nok.name);

	const cc = apiData.careCoordinatorOrDspCaseManager || {};
	const ccName = splitName(cc.name);

	const poa = apiData.powerOfAttorney || {};
	const poaName = splitName(poa.name);

	const pd = apiData.personalDirective || {};
	const pdName = splitName(pd.name);

	const lg = apiData.legalGuardianship || {};
	const lgName = splitName(lg.name);

	const apt = apiData.adultProtectionOrPublicTrustee || {};
	const aptName = splitName(apt.name);

	return {
		firstName: apiData.firstName || "",
		lastName: apiData.lastName || "",
		birth: utcToDateString(apiData.dateOfBirth, "America/Halifax"),
		region: apiData.region || "",
		maritalStatus: apiData.maritalStatus || "",
		levelOfSupport: apiData.levelOfSupport ?? "",
		phone: apiData.phone || "",
		email: apiData.email || "",
		notes: apiData.notes || "",
		homeId: typeof apiData.home === 'string' ? apiData.home : (apiData.home?._id || apiData.home?.id || apiData.homeId || ""),
		noHomeSelected: !(typeof apiData.home === 'string' ? apiData.home : (apiData.home?._id || apiData.home?.id || apiData.homeId)),
		street: apiData.address?.street || "",
		city: apiData.address?.city || "",
		state: apiData.address?.state || "",
		country: apiData.address?.country || "",
		pinCode: apiData.address?.pinCode || "",
		unit: apiData.address?.unit || "",
		healthCardNumber: apiData.healthCard?.number || "",
		healthCardExpiryDate: utcToDateString(apiData.healthCard?.expiryDate, "America/Halifax"),
		emergencyFName: ecName.first,
		emergencyLName: ecName.last,
		emergencyPhone: ec.phone || "",
		relationship: ec.relationship || "",
		nokFName: nokName.first,
		nokLName: nokName.last,
		nokPhone: nok.phone || "",
		nokEmail: nok.email || "",
		sdmFName: sdmName.first,
		sdmLName: sdmName.last,
		sdmPhone: sdm.phoneNumber || "",
		sdmEmail: sdm.email || "",
		careCoordinatorFName: ccName.first,
		careCoordinatorLName: ccName.last,
		careCoordinatorPhone: cc.phone || "",
		careCoordinatorEmail: cc.email || "",
		poaFName: poaName.first,
		poaLName: poaName.last,
		poaPhone: poa.phone || "",
		poaEmail: poa.email || "",
		pdFName: pdName.first,
		pdLName: pdName.last,
		pdPhone: pd.phone || "",
		pdEmail: pd.email || "",
		lgFName: lgName.first,
		lgLName: lgName.last,
		lgPhone: lg.phone || "",
		lgEmail: lg.email || "",
		aptFName: aptName.first,
		aptLName: aptName.last,
		aptPhone: apt.phone || "",
		aptEmail: apt.email || "",
		ctoNotes: apiData.communityTreatmentOrder?.notes || "",
		latitude: apiData.address?.gpsCoordinates?.latitude || null,
		longitude: apiData.address?.gpsCoordinates?.longitude || null,
	};
};

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule,
	phone: phoneRule,
	region: yup
		.string()
		.oneOf(REGION_OPTIONS.map(o => o.value), "Please select a valid region")
		.required("Region is required"),
	birth: birthRule,
	maritalStatus: yup.string().max(50).nullable().optional(),
	levelOfSupport: yup
		.number()
		.integer()
		.min(1)
		.max(5)
		.nullable()
		.transform((v, o) => (o === "" ? null : v)),
	notes: longTextRule,
	noHomeSelected: yup.boolean().optional(),
	homeId: yup.string().nullable().optional(),
	street: addressComponentRule.required("Street is required"),
	city: addressComponentRule.required("City is required"),
	state: addressComponentRule.required("Province is required"),
	pinCode: pinRule,
	country: addressComponentRule.required("Country is required"),
	unit: yup.string().trim().max(50, "Unit cannot exceed 50 characters").matches(/^[a-zA-Z0-9]*$/, "Unit can only contain letters and numbers").optional(),
	healthCardNumber: yup.string().max(50).nullable().optional(),
	healthCardExpiryDate: dateRule.nullable().optional(),
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),
	nokFName: yup.string().max(50).nullable().optional(),
	nokLName: yup.string().max(50).nullable().optional(),
	nokPhone: phoneRule,
	nokEmail: emailRule,
	sdmFName: nameRule,
	sdmLName: nameRule,
	sdmPhone: phoneRule,
	sdmEmail: emailRule,
	careCoordinatorFName: nameRule.required("Care coordinator first name is required"),
	careCoordinatorLName: yup.string().max(50).nullable().optional(),
	careCoordinatorPhone: phoneRule.required("Care coordinator phone is required"),
	careCoordinatorEmail: emailRule.required("Care coordinator email is required"),
	poaFName: yup.string().max(50).nullable().optional(),
	poaLName: yup.string().max(50).nullable().optional(),
	poaPhone: phoneRule,
	poaEmail: emailRule,
	pdFName: yup.string().max(50).nullable().optional(),
	pdLName: yup.string().max(50).nullable().optional(),
	pdPhone: phoneRule,
	pdEmail: emailRule,
	lgFName: yup.string().max(50).nullable().optional(),
	lgLName: yup.string().max(50).nullable().optional(),
	lgPhone: phoneRule,
	lgEmail: emailRule,
	aptFName: yup.string().max(50).nullable().optional(),
	aptLName: yup.string().max(50).nullable().optional(),
	aptPhone: phoneRule,
	aptEmail: emailRule,
	ctoNotes: yup.string().max(2000).nullable().optional(),
	latitude: yup.number().nullable().optional(),
	longitude: yup.number().nullable().optional(),
});

function PersonView({ obj, phoneKey = "phone" }) {
	const name = obj?.name || "";
	const phone = obj?.[phoneKey] || "";
	const email = obj?.email || "";
	if (!name && !phone && !email) {
		return <p className={styles.person_empty}>Not on file</p>;
	}
	return (
		<div className={styles.person_card}>
			<div className={styles.person_avatar}><Users size={16} /></div>
			<div className={styles.person_info}>
				{name && <div className={styles.person_name}>{name}</div>}
				<div className={styles.person_meta}>
					{phone && <span className={styles.person_tag}><Phone size={12} />{phone}</span>}
					{phone && email && <span className={styles.ec_dot} />}
					{email && <span className={styles.person_tag}><Mail size={12} />{email}</span>}
				</div>
			</div>
		</div>
	);
}

function LegalPersonBlock({ label, obj }) {
	const hasData = obj?.name || obj?.phone || obj?.email;
	return (
		<div className={styles.legal_person_block}>
			<div className={styles.legal_person_label}>{label}</div>
			{hasData ? (
				<>
					{obj.name && <div className={styles.vvalue} style={{ marginBottom: "0.3rem" }}>{obj.name}</div>}
					<div className={styles.person_meta}>
						{obj.phone && <span className={styles.person_tag}><Phone size={11} />{obj.phone}</span>}
						{obj.phone && obj.email && <span className={styles.ec_dot} />}
						{obj.email && <span className={styles.person_tag}><Mail size={11} />{obj.email}</span>}
					</div>
				</>
			) : (
				<div className={styles.vvalue_empty}>Not on file</div>
			)}
		</div>
	);
}

export default function Info() {
	const { id } = useParams();
	const [isInitialized, setIsInitialized] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [status, setStatus] = useState(null);
	const [conflictInfo, setConflictInfo] = useState(null);

	const { clientDetail, updateClient, isLoading, isActionPending } = useClients(id);
	const { profile } = useProfile();
	const canEdit = canManageTarget(profile, clientDetail, "update_all_clients", "update_assigned_clients");

	const {
		register, handleSubmit, control,
		formState: { errors },
		reset, setValue, watch,
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	function handleAddressSelect({ street, city, state, country, postalCode, latitude, longitude }) {
		if (street) setValue("street", street, { shouldValidate: true });
		if (city) setValue("city", city, { shouldValidate: true });
		if (state) setValue("state", state, { shouldValidate: true });
		if (country) setValue("country", country, { shouldValidate: true });
		if (postalCode) setValue("pinCode", postalCode, { shouldValidate: true });
		if (latitude !== undefined) setValue("latitude", latitude, { shouldValidate: true });
		if (longitude !== undefined) setValue("longitude", longitude, { shouldValidate: true });
	}

	const { homes, fetchHome } = useHomes({ limit: 100 });
	const watchHomeId = watch("homeId");
	const watchNoHomeSelected = watch("noHomeSelected");
	const watchStreet = watch("street");
	const watchCity = watch("city");
	const watchState = watch("state");
	const watchPinCode = watch("pinCode");
	const watchCountry = watch("country");

	useEffect(() => {
		if (watchHomeId && homes?.length > 0) {
			const selectedHome = homes.find((h) => h.id === watchHomeId || h._id === watchHomeId);
			if (selectedHome && selectedHome.address) {
				setValue("street", selectedHome.address.street || "", { shouldValidate: true });
				setValue("city", selectedHome.address.city || "", { shouldValidate: true });
				setValue("state", selectedHome.address.province || selectedHome.address.state || "", { shouldValidate: true });
				setValue("pinCode", selectedHome.address.postalCode || selectedHome.address.pinCode || "", { shouldValidate: true });
				setValue("country", selectedHome.address.country || "", { shouldValidate: true });
				setValue("latitude", selectedHome.gpsCoordinates?.latitude || null, { shouldValidate: true });
				setValue("longitude", selectedHome.gpsCoordinates?.longitude || null, { shouldValidate: true });
				setValue("noHomeSelected", false);
			}
		}
	}, [watchHomeId, homes, setValue]);

	useEffect(() => {
		if (watchNoHomeSelected) setValue("homeId", "");
	}, [watchNoHomeSelected, setValue]);

	useEffect(() => {
		if (clientDetail && !isInitialized) {
			reset(cleanFetchedData(clientDetail));
			setIsInitialized(true);
		}
	}, [clientDetail, reset, isInitialized]);

	const buildBody = (data) => ({
		email: data.email,
		firstName: data.firstName,
		lastName: data.lastName,
		phone: data.phone,
		dateOfBirth: localDateToUtc(data.birth, "America/Halifax"),
		region: data.region,
		maritalStatus: data.maritalStatus || null,
		levelOfSupport: data.levelOfSupport || null,
		notes: data.notes || null,
		homeId: data.noHomeSelected ? null : (data.homeId || null),
		address: {
			street: data.street,
			unit: data.unit || undefined,
			city: data.city,
			state: data.state,
			pinCode: data.pinCode,
			country: data.country,
			gpsCoordinates: {
				latitude: (data.latitude != null && data.latitude !== "") ? Number(data.latitude) : 44.6476,
				longitude: (data.longitude != null && data.longitude !== "") ? Number(data.longitude) : -63.5728,
			},
		},
		healthCard: {
			number: data.healthCardNumber || null,
			expiryDate: localDateToUtc(data.healthCardExpiryDate, "America/Halifax"),
		},
		emergencyContact: {
			name: fullName(data.emergencyFName, data.emergencyLName),
			phone: data.emergencyPhone || null,
			relationship: data.relationship || null,
		},
		nextOfKin: {
			name: fullName(data.nokFName, data.nokLName),
			phone: data.nokPhone || null,
			email: data.nokEmail || null,
		},
		statutoryDecisionMaker: {
			name: fullName(data.sdmFName, data.sdmLName),
			phoneNumber: data.sdmPhone || null,
			email: data.sdmEmail || null,
		},
		careCoordinatorOrDspCaseManager: {
			name: fullName(data.careCoordinatorFName, data.careCoordinatorLName),
			phone: data.careCoordinatorPhone || null,
			email: data.careCoordinatorEmail || null,
		},
		powerOfAttorney: {
			name: fullName(data.poaFName, data.poaLName),
			phone: data.poaPhone || null,
			email: data.poaEmail || null,
		},
		personalDirective: {
			name: fullName(data.pdFName, data.pdLName),
			phone: data.pdPhone || null,
			email: data.pdEmail || null,
		},
		legalGuardianship: {
			name: fullName(data.lgFName, data.lgLName),
			phone: data.lgPhone || null,
			email: data.lgEmail || null,
		},
		adultProtectionOrPublicTrustee: {
			name: fullName(data.aptFName, data.aptLName),
			phone: data.aptPhone || null,
			email: data.aptEmail || null,
		},
		communityTreatmentOrder: {
			notes: data.ctoNotes || null,
		},
	});

	const submitUpdate = (body) => {
		updateClient(
			{ id, data: body },
			{
				onSuccess: (res) => {
					reset(cleanFetchedData(res));
					setStatus({ variant: "success", text: "Update successful!" });
					setIsEditing(false);
				},
				onError: (err) => {
					const resData = err.response?.data;
					const httpStatus = err.response?.status;
					if (httpStatus === 400 && resData?.details?.length > 0) {
						setStatus({ variant: "error", text: resData.details.map((d) => `${d.msg}${d.path ? ` (${d.path})` : ""}`).join(" | ") });
					} else {
						setStatus({ variant: "error", text: resData?.message || resData?.error || err.message || "Failed to update client." });
					}
				},
			}
		);
	};

	const onSubmit = async (data) => {
		setStatus(null);

		const newHomeId = data.noHomeSelected ? null : (data.homeId || null);
		const currentHomeRaw = clientDetail?.home;
		const currentHomeId =
			typeof currentHomeRaw === "string" ? currentHomeRaw :
			(currentHomeRaw?._id || currentHomeRaw?.id || clientDetail?.homeId || null);

		if (newHomeId && currentHomeId && newHomeId !== currentHomeId) {
			let currentHomeName = null;
			try {
				const homeDetail = await fetchHome(currentHomeId);
				currentHomeName = homeDetail?.name || homeDetail?.home?.name || null;
			} catch {}
			setConflictInfo({ currentHomeName, pendingBody: buildBody(data) });
			return;
		}

		submitUpdate(buildBody(data));
	};

	const handleConflictConfirm = () => {
		if (!conflictInfo) return;
		submitUpdate({ ...conflictInfo.pendingBody, confirmMove: true });
		setConflictInfo(null);
	};

	const handleCancel = () => {
		reset(cleanFetchedData(clientDetail));
		setStatus(null);
		setIsEditing(false);
	};

	if (isLoading) return <div>Loading client info...</div>;

	const d = clientDetail || {};
	const addr = d.address || {};
	const ec = d.emergencyContact || {};
	const nok = d.nextOfKin || {};
	const sdm = d.statutoryDecisionMaker || {};
	const cc = d.careCoordinatorOrDspCaseManager || {};
	const poa = d.powerOfAttorney || {};
	const pd = d.personalDirective || {};
	const lg = d.legalGuardianship || {};
	const apt = d.adultProtectionOrPublicTrustee || {};
	const cto = d.communityTreatmentOrder || {};

	const fullAddress = [addr.street, addr.city, addr.state, addr.pinCode, addr.country].filter(Boolean).join(", ");
	const rawHomeId = typeof d.home === "string" ? d.home : (d.home?._id || d.home?.id || null);
	const homeName = (typeof d.home === "object" && d.home?.name)
		? d.home.name
		: (homes.find(h => (h.id || h._id) === rawHomeId)?.name ?? null);

	const newHomeName = watchHomeId
		? homes.find(h => h.id === watchHomeId || h._id === watchHomeId)?.name
		: undefined;

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ClientConflictModal
				isOpen={!!conflictInfo}
				onClose={() => setConflictInfo(null)}
				onConfirm={handleConflictConfirm}
				clientName={clientDetail ? `${clientDetail.firstName} ${clientDetail.lastName}` : ""}
				currentHomeName={conflictInfo?.currentHomeName}
				newHomeName={newHomeName}
			/>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<fieldset disabled={!canEdit} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
				<div className={styles.body}>

					{/* ── Personal Information ── */}
					<Card>
						<CardHeader>Personal Information</CardHeader>
						<CardContent>
							{!isEditing ? (
								<>
									<div className={styles.name_display}>
										<div className={styles.name_text}>{d.firstName} {d.lastName}</div>
										{d.levelOfSupport && (
											<div className={styles.name_badges}>
												<span className={styles.name_badge_level}>Level {d.levelOfSupport}</span>
											</div>
										)}
									</div>

									<div className={styles.contact_list}>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Calendar size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Date of Birth</div>
												<div className={d.dateOfBirth ? styles.contact_value : styles.contact_value_empty}>
													{utcToDateString(d.dateOfBirth, "America/Halifax") || "Not provided"}
												</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Globe size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Region</div>
												<div className={d.region ? styles.contact_value : styles.contact_value_empty}>{d.region || "Not provided"}</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Heart size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Marital Status</div>
												<div className={d.maritalStatus ? styles.contact_value : styles.contact_value_empty}>
													{d.maritalStatus ? getLabel(MARITAL_STATUS_OPTIONS, d.maritalStatus) : "Not provided"}
												</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Phone size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Phone</div>
												<div className={d.phone ? styles.contact_value : styles.contact_value_empty}>{d.phone || "Not provided"}</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Mail size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Email</div>
												<div className={d.email ? styles.contact_value : styles.contact_value_empty}>{d.email || "Not provided"}</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Home size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Assigned Home</div>
												<div className={homeName ? styles.contact_value : styles.contact_value_empty}>
													{homeName || (rawHomeId ? "Home assigned" : "No home assigned")}
												</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><MapPin size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Address{addr.unit ? ` · Unit ${addr.unit}` : ""}</div>
												<div className={fullAddress ? styles.contact_value : styles.contact_value_empty}>
													{fullAddress || "No address on file"}
												</div>
											</div>
										</div>
										<div className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><CreditCard size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>Health Card</div>
												<div className={d.healthCard?.number ? styles.contact_value : styles.contact_value_empty}>
													{d.healthCard?.number || "Not provided"}
												</div>
												{d.healthCard?.expiryDate && (
													<div className={styles.contact_meta}>
														Expires {utcToDateString(d.healthCard.expiryDate, "America/Halifax")}
													</div>
												)}
											</div>
										</div>
									</div>

									<div className={styles.section_sub}><Users size={11} /> Care Coordinator / DSP Case Manager</div>
									<PersonView obj={cc} />

									<div className={styles.notes_box}>
										<div className={styles.notes_label}>Notes</div>
										<div className={d.notes ? styles.notes_text : styles.notes_empty}>{d.notes || "No notes on file"}</div>
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
										<InputField
											label="Marital Status"
											name="maritalStatus"
											type="select"
											register={register}
											error={errors.maritalStatus}
											options={MARITAL_STATUS_OPTIONS}
										/>
										<InputField
											label="Level of Support"
											name="levelOfSupport"
											type="select"
											register={register}
											error={errors.levelOfSupport}
											options={[
												{ label: "1", value: 1 },
												{ label: "2", value: 2 },
												{ label: "3", value: 3 },
												{ label: "4", value: 4 },
												{ label: "5", value: 5 },
											]}
										/>
									</div>
									<div className={styles.card_row_2}>
										<InputField
											label="Region"
											name="region"
											type="select"
											register={register}
											error={errors.region}
											options={REGION_OPTIONS}
										/>
										<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
										<InputField label="Email" name="email" register={register} error={errors.email} />
									</div>

									<h5 className={styles.subSectionTitle}>Address</h5>

									<div style={{ marginBottom: "1rem" }}>
										<InputField
											key={homes.length}
											label="Assigned Home"
											name="homeId"
											type="select"
											register={register}
											error={errors.homeId}
											disabled={watchNoHomeSelected}
											options={homes.map(h => ({ label: h.name, value: h.id || h._id }))}
										/>
										<div style={{ marginTop: "0.5rem" }}>
											<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
												<input type="checkbox" {...register("noHomeSelected")} />
												No home selected (manual address entry)
											</label>
										</div>
									</div>

									<AddressAutocomplete
										label="Search Address"
										onAddressSelect={handleAddressSelect}
										placeholder="Start typing to search for an address..."
										id="client-edit-address-autocomplete"
										register={register}
										fieldNames={{ street: "street", city: "city", state: "state", postalCode: "pinCode", country: "country" }}
										unitName="unit"
										unitError={errors.unit}
										isEditing={true}
										currentAddress={[watchStreet, watchCity, watchState, watchPinCode, watchCountry].filter(Boolean).join(", ")}
										disabled={!watchNoHomeSelected}
									/>

									<h5 className={styles.subSectionTitle}>Health Card</h5>
									<div className={styles.card_row_2}>
										<InputField label="Health Card Number" name="healthCardNumber" register={register} error={errors.healthCardNumber} />
										<InputField label="Health Card Expiry Date" name="healthCardExpiryDate" register={register} control={control} type="date" error={errors.healthCardExpiryDate} />
									</div>

									<h5 className={styles.subSectionTitle}>Care Coordinator / DSP Case Manager</h5>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="careCoordinatorFName" register={register} error={errors.careCoordinatorFName} />
										<InputField label="Last Name" name="careCoordinatorLName" register={register} error={errors.careCoordinatorLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="careCoordinatorPhone" type="phone" register={register} error={errors.careCoordinatorPhone} />
										<InputField label="Email" name="careCoordinatorEmail" register={register} error={errors.careCoordinatorEmail} />
									</div>

									<InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
								</>
							)}
						</CardContent>
					</Card>

					{/* ── Emergency Contact ── */}
					<Card>
						<CardHeader>Emergency Contact</CardHeader>
						<CardContent>
							{!isEditing ? (
								ec.name ? (
									<div className={styles.ec_card}>
										<div className={styles.ec_avatar}><Users size={20} /></div>
										<div className={styles.ec_info}>
											<div className={styles.ec_name}>{ec.name}</div>
											<div className={styles.ec_meta}>
												{ec.relationship && (
													<span className={styles.ec_tag}><Users size={12} />{ec.relationship}</span>
												)}
												{ec.relationship && ec.phone && <span className={styles.ec_dot} />}
												{ec.phone && (
													<span className={styles.ec_tag}><Phone size={12} />{ec.phone}</span>
												)}
											</div>
										</div>
									</div>
								) : (
									<p className={styles.ec_empty}>No emergency contact on file</p>
								)
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

					{/* ── Next of Kin ── */}
					<Card>
						<CardHeader>Next of Kin</CardHeader>
						<CardContent>
							{!isEditing ? (
								<PersonView obj={nok} />
							) : (
								<>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="nokFName" register={register} error={errors.nokFName} />
										<InputField label="Last Name" name="nokLName" register={register} error={errors.nokLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="nokPhone" type="phone" register={register} error={errors.nokPhone} />
										<InputField label="Email" name="nokEmail" register={register} error={errors.nokEmail} />
									</div>
								</>
							)}
						</CardContent>
					</Card>

					{/* ── Statutory Decision Maker ── */}
					<Card>
						<CardHeader>Statutory Decision Maker (SDM)</CardHeader>
						<CardContent>
							{!isEditing ? (
								<PersonView obj={sdm} phoneKey="phoneNumber" />
							) : (
								<>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="sdmFName" register={register} error={errors.sdmFName} />
										<InputField label="Last Name" name="sdmLName" register={register} error={errors.sdmLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="sdmPhone" type="phone" register={register} error={errors.sdmPhone} />
										<InputField label="Email" name="sdmEmail" register={register} error={errors.sdmEmail} />
									</div>
								</>
							)}
						</CardContent>
					</Card>

					{/* ── Legal & Guardianship ── */}
					<Card>
						<CardHeader>Legal &amp; Guardianship</CardHeader>
						<CardContent>
							{!isEditing ? (
								<>
									<div className={styles.legal_grid}>
										<LegalPersonBlock label="Power of Attorney" obj={poa} />
										<LegalPersonBlock label="Personal Directive" obj={pd} />
										<LegalPersonBlock label="Legal Guardianship" obj={lg} />
										<LegalPersonBlock label="Adult Protection / Public Trustee" obj={apt} />
									</div>
									<div className={styles.legal_cto}>
										<div className={styles.vlabel}>Community Treatment Order – Notes</div>
										<div className={cto.notes ? styles.notes_text : styles.vvalue_empty}>
											{cto.notes || "Not on file"}
										</div>
									</div>
								</>
							) : (
								<>
									<h5 className={styles.subSectionTitle}>Power of Attorney</h5>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="poaFName" register={register} error={errors.poaFName} />
										<InputField label="Last Name" name="poaLName" register={register} error={errors.poaLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="poaPhone" type="phone" register={register} error={errors.poaPhone} />
										<InputField label="Email" name="poaEmail" register={register} error={errors.poaEmail} />
									</div>

									<h5 className={styles.subSectionTitle}>Personal Directive</h5>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="pdFName" register={register} error={errors.pdFName} />
										<InputField label="Last Name" name="pdLName" register={register} error={errors.pdLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="pdPhone" type="phone" register={register} error={errors.pdPhone} />
										<InputField label="Email" name="pdEmail" register={register} error={errors.pdEmail} />
									</div>

									<h5 className={styles.subSectionTitle}>Legal Guardianship</h5>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="lgFName" register={register} error={errors.lgFName} />
										<InputField label="Last Name" name="lgLName" register={register} error={errors.lgLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="lgPhone" type="phone" register={register} error={errors.lgPhone} />
										<InputField label="Email" name="lgEmail" register={register} error={errors.lgEmail} />
									</div>

									<h5 className={styles.subSectionTitle}>Adult Protection / Public Trustee</h5>
									<div className={styles.card_row_2}>
										<InputField label="First Name" name="aptFName" register={register} error={errors.aptFName} />
										<InputField label="Last Name" name="aptLName" register={register} error={errors.aptLName} />
									</div>
									<div className={styles.card_row_2}>
										<InputField label="Phone" name="aptPhone" type="phone" register={register} error={errors.aptPhone} />
										<InputField label="Email" name="aptEmail" register={register} error={errors.aptEmail} />
									</div>

									<h5 className={styles.subSectionTitle}>Community Treatment Order</h5>
									<InputField label="Notes" name="ctoNotes" type="textarea" rows={3} register={register} error={errors.ctoNotes} />
								</>
							)}
						</CardContent>
					</Card>

				</div>
			</fieldset>

			{canEdit && (
				<div className={styles.bottom_bar}>
					{!isEditing ? (
						<Button variant="primary" icon={<Edit size={16} />} onClick={() => setIsEditing(true)} type="button">
							Edit
						</Button>
					) : (
						<>
							<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} type="button" disabled={isActionPending}>
								Cancel
							</Button>
							<Button variant="primary" icon={<Save size={16} />} type="submit" disabled={isActionPending}>
								{isActionPending ? "Saving..." : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			)}
		</form>
	);
}
