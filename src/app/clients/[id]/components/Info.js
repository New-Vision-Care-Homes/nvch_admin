"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import {
	nameRule,
	emailRule,
	phoneRule,
	pinRule,
	birthRule,
	shortTextRule,
	longTextRule,
	dateRule,
} from "@/utils/validation";
import { useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";

// --- Helper ---
const splitName = (full) => {
	const parts = full?.split(" ") || [];
	return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
};

const fullName = (first, last) => `${first || ""} ${last || ""}`.trim() || null;

// --- 1. Data Cleaning / Flattening ---
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
		// Personal
		firstName: apiData.firstName || "",
		lastName: apiData.lastName || "",
		birth: apiData.dateOfBirth?.split("T")[0] || "",
		region: apiData.region || "",
		maritalStatus: apiData.maritalStatus || "",
		levelOfSupport: apiData.levelOfSupport ?? "",
		phone: apiData.phone || "",
		email: apiData.email || "",
		notes: apiData.notes || "",

		// Address
		street: apiData.address?.street || "",
		city: apiData.address?.city || "",
		state: apiData.address?.state || "",
		country: apiData.address?.country || "",
		pinCode: apiData.address?.pinCode || "",

		// Health Card
		healthCardNumber: apiData.healthCard?.number || "",
		healthCardExpiryDate: apiData.healthCard?.expiryDate?.split("T")[0] || "",

		// Emergency Contact
		emergencyFName: ecName.first,
		emergencyLName: ecName.last,
		emergencyPhone: ec.phone || "",
		relationship: ec.relationship || "",

		// Next of Kin
		nokFName: nokName.first,
		nokLName: nokName.last,
		nokPhone: nok.phone || "",
		nokEmail: nok.email || "",

		// SDM
		sdmFName: sdmName.first,
		sdmLName: sdmName.last,
		sdmPhone: sdm.phoneNumber || "",
		sdmEmail: sdm.email || "",

		// Care Coordinator
		careCoordinatorFName: ccName.first,
		careCoordinatorLName: ccName.last,
		careCoordinatorPhone: cc.phone || "",
		careCoordinatorEmail: cc.email || "",

		// Power of Attorney
		poaFName: poaName.first,
		poaLName: poaName.last,
		poaPhone: poa.phone || "",
		poaEmail: poa.email || "",

		// Personal Directive
		pdFName: pdName.first,
		pdLName: pdName.last,
		pdPhone: pd.phone || "",
		pdEmail: pd.email || "",

		// Legal Guardianship
		lgFName: lgName.first,
		lgLName: lgName.last,
		lgPhone: lg.phone || "",
		lgEmail: lg.email || "",

		// Adult Protection / Public Trustee
		aptFName: aptName.first,
		aptLName: aptName.last,
		aptPhone: apt.phone || "",
		aptEmail: apt.email || "",

		// Community Treatment Order
		ctoNotes: apiData.communityTreatmentOrder?.notes || "",
	};
};

// --- 2. Validation Schema ---
const schema = yup.object({
	// Personal
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule,
	phone: phoneRule,
	region: yup
		.string()
		.oneOf(
			["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"],
			"Please select a valid region"
		)
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

	// Address
	street: shortTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("Province is required"),
	pinCode: pinRule,
	country: shortTextRule.required("Country is required"),

	// Health Card
	healthCardNumber: yup.string().max(50).nullable().optional(),
	healthCardExpiryDate: dateRule.nullable().optional(),

	// Emergency Contact
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),

	// Next of Kin
	nokFName: yup.string().max(50).nullable().optional(),
	nokLName: yup.string().max(50).nullable().optional(),
	nokPhone: phoneRule,
	nokEmail: emailRule,

	// SDM
	sdmFName: nameRule,
	sdmLName: nameRule,
	sdmPhone: phoneRule,
	sdmEmail: emailRule,

	// Care Coordinator — required
	careCoordinatorFName: nameRule.required("Care coordinator first name is required"),
	careCoordinatorLName: yup.string().max(50).nullable().optional(),
	careCoordinatorPhone: phoneRule.required("Care coordinator phone is required"),
	careCoordinatorEmail: emailRule.required("Care coordinator email is required"),

	// Power of Attorney
	poaFName: yup.string().max(50).nullable().optional(),
	poaLName: yup.string().max(50).nullable().optional(),
	poaPhone: phoneRule,
	poaEmail: emailRule,

	// Personal Directive
	pdFName: yup.string().max(50).nullable().optional(),
	pdLName: yup.string().max(50).nullable().optional(),
	pdPhone: phoneRule,
	pdEmail: emailRule,

	// Legal Guardianship
	lgFName: yup.string().max(50).nullable().optional(),
	lgLName: yup.string().max(50).nullable().optional(),
	lgPhone: phoneRule,
	lgEmail: emailRule,

	// Adult Protection / Public Trustee
	aptFName: yup.string().max(50).nullable().optional(),
	aptLName: yup.string().max(50).nullable().optional(),
	aptPhone: phoneRule,
	aptEmail: emailRule,

	// Community Treatment Order
	ctoNotes: yup.string().max(2000).nullable().optional(),
});

// --- Component ---
export default function Info() {
	const { id } = useParams();
	const [isInitialized, setIsInitialized] = useState(false);
	const [status, setStatus] = useState(null); // { variant, text }

	const {
		clientDetail,
		updateClient,
		isLoading,
		isActionPending,
	} = useClients(id);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		reset,
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	useEffect(() => {
		if (clientDetail && !isInitialized) {
			reset(cleanFetchedData(clientDetail));
			setIsInitialized(true);
		}
	}, [clientDetail, reset, isInitialized]);

	// --- 3. Submit ---
	const onSubmit = (data) => {
		setStatus(null);

		const body = {
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			dateOfBirth: data.birth,
			region: data.region,
			maritalStatus: data.maritalStatus || null,
			levelOfSupport: data.levelOfSupport || null,
			notes: data.notes || null,

			address: {
				street: data.street,
				city: data.city,
				state: data.state,
				pinCode: data.pinCode,
				country: data.country,
				gpsCoordinates: { latitude: 44.6488, longitude: -63.5752 },
			},

			healthCard: {
				number: data.healthCardNumber || null,
				expiryDate: data.healthCardExpiryDate || null,
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
		};

			updateClient(
				{ id, data: body },
				{
					onSuccess: (res) => {
						reset(cleanFetchedData(res));
						setStatus({ variant: "success", text: "Update successful!" });
					},
					onError: (err) => {
						const resData = err.response?.data;
						const status = err.response?.status;
						if (status === 400 && resData?.details?.length > 0) {
							setStatus({ variant: "error", text: resData.details.map((d) => `${d.msg}${d.path ? ` (${d.path})` : ""}`).join(" | ") });
						} else {
							setStatus({ variant: "error", text: resData?.message || resData?.error || err.message || "Failed to update client." });
						}
					},
				}
			);
	};

	const handleCancel = () => {
		reset();
		setStatus(null);
	};

	if (isLoading) {
		return <div>Loading client info...</div>;
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<div className={styles.body}>

				{/* ── Personal Information ── */}
				<Card>
					<CardHeader>Personal Information</CardHeader>
					<CardContent>
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
								options={[
									{ label: "Single", value: "single" },
									{ label: "Married", value: "married" },
									{ label: "Divorced", value: "divorced" },
									{ label: "Widowed", value: "widowed" },
									{ label: "Separated", value: "separated" },
								]}
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
								options={[
									{ label: "Central", value: "Central" },
									{ label: "Windsor", value: "Windsor" },
									{ label: "HRM", value: "HRM" },
									{ label: "Yarmouth", value: "Yarmouth" },
									{ label: "Shelburne", value: "Shelburne" },
									{ label: "South Shore", value: "South Shore" },
								]}
							/>
							<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
							<InputField label="Email" name="email" register={register} error={errors.email} />
						</div>

						<h5 className={styles.subSectionTitle}>Address</h5>
						<div className={styles.card_row_2}>
							<InputField label="Street" name="street" register={register} error={errors.street} />
							<InputField label="City" name="city" register={register} error={errors.city} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Province" name="state" register={register} error={errors.state} />
							<InputField label="Country" name="country" register={register} error={errors.country} />
							<InputField label="Postal Code" name="pinCode" register={register} error={errors.pinCode} />
						</div>

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
							<InputField label="Phone" name="careCoordinatorPhone" register={register} error={errors.careCoordinatorPhone} />
							<InputField label="Email" name="careCoordinatorEmail" register={register} error={errors.careCoordinatorEmail} />
						</div>

						<InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
					</CardContent>
				</Card>

				{/* ── Emergency Contact ── */}
				<Card>
					<CardHeader>Emergency Contact</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
							<InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
							<InputField label="Phone" name="emergencyPhone" type="phone" register={register} error={errors.emergencyPhone} />
						</div>
					</CardContent>
				</Card>

				{/* ── Next of Kin ── */}
				<Card>
					<CardHeader>Next of Kin</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="nokFName" register={register} error={errors.nokFName} />
							<InputField label="Last Name" name="nokLName" register={register} error={errors.nokLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="nokPhone" register={register} error={errors.nokPhone} />
							<InputField label="Email" name="nokEmail" register={register} error={errors.nokEmail} />
						</div>
					</CardContent>
				</Card>

				{/* ── Statutory Decision Maker ── */}
				<Card>
					<CardHeader>Statutory Decision Maker (SDM)</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="sdmFName" register={register} error={errors.sdmFName} />
							<InputField label="Last Name" name="sdmLName" register={register} error={errors.sdmLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="sdmPhone" register={register} error={errors.sdmPhone} />
							<InputField label="Email" name="sdmEmail" register={register} error={errors.sdmEmail} />
						</div>
					</CardContent>
				</Card>

				{/* ── Legal & Guardianship ── */}
				<Card>
					<CardHeader>Legal &amp; Guardianship</CardHeader>
					<CardContent>

						<h5 className={styles.subSectionTitle}>Power of Attorney</h5>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="poaFName" register={register} error={errors.poaFName} />
							<InputField label="Last Name" name="poaLName" register={register} error={errors.poaLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="poaPhone" register={register} error={errors.poaPhone} />
							<InputField label="Email" name="poaEmail" register={register} error={errors.poaEmail} />
						</div>

						<h5 className={styles.subSectionTitle}>Personal Directive</h5>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="pdFName" register={register} error={errors.pdFName} />
							<InputField label="Last Name" name="pdLName" register={register} error={errors.pdLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="pdPhone" register={register} error={errors.pdPhone} />
							<InputField label="Email" name="pdEmail" register={register} error={errors.pdEmail} />
						</div>

						<h5 className={styles.subSectionTitle}>Legal Guardianship</h5>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="lgFName" register={register} error={errors.lgFName} />
							<InputField label="Last Name" name="lgLName" register={register} error={errors.lgLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="lgPhone" register={register} error={errors.lgPhone} />
							<InputField label="Email" name="lgEmail" register={register} error={errors.lgEmail} />
						</div>

						<h5 className={styles.subSectionTitle}>Adult Protection / Public Trustee</h5>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="aptFName" register={register} error={errors.aptFName} />
							<InputField label="Last Name" name="aptLName" register={register} error={errors.aptLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="aptPhone" register={register} error={errors.aptPhone} />
							<InputField label="Email" name="aptEmail" register={register} error={errors.aptEmail} />
						</div>

						<h5 className={styles.subSectionTitle}>Community Treatment Order</h5>
						<InputField label="Notes" name="ctoNotes" type="textarea" rows={3} register={register} error={errors.ctoNotes} />

					</CardContent>
				</Card>

			</div>

			<div className={styles.buttons}>
				<Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
				<Button type="submit" variant="primary" disabled={isActionPending}>
					{isActionPending ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}
