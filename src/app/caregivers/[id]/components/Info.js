"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
// Importing validation rules used in the Client page for consistency
import { nameRule, emailRule, phoneRule, pinRule, birthRule, shortTextRule, longTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";
import { useCaregivers } from "@/hooks/useCaregivers";
import ErrorState from "@components/UI/ErrorState";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";

// --- 1. Data Cleaning/Flattening Function ---
const cleanFetchedData = (apiData) => {
	if (!apiData) return {};

	// Base fields
	const cleanData = {
		firstName: apiData.firstName || "",
		lastName: apiData.lastName || "",
		notes: apiData.notes || "",
		birth: apiData.dateOfBirth?.split('T')[0] || "",
		phone: apiData.phone || "",
		email: apiData.email || "",

		// Address field (safely chained)
		street: apiData.address?.street || "",
		city: apiData.address?.city || "",
		state: apiData.address?.state || "",
		country: apiData.address?.country || "",
		pincode: apiData.address?.pinCode || "",
		region: apiData.region || "",
	};

	// Emergency Contact
	const emergencyContact = apiData.emergencyContact || {};
	// Assuming name is stored as "First Last" and needs to be split
	const emergencyNameParts = emergencyContact.name?.split(' ') || [];
	cleanData.emergencyFName = emergencyNameParts[0] || "";
	cleanData.emergencyLName = emergencyNameParts.slice(1).join(' ') || "";
	cleanData.emergencyPhone = emergencyContact.phone || "";
	cleanData.relationship = emergencyContact.relationship || "";

	// SDM fields are correctly omitted for Caregiver

	return cleanData;
};

// --- 2. Yup Validation Schema ---
const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.optional(),
	phone: phoneRule.optional(),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),
	birth: birthRule.optional(),
	notes: longTextRule.optional(),

	// Address fields
	street: shortTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("Province is required"),
	pincode: pinRule.optional(),
	country: shortTextRule.required("Country is required"),

	// Emergency Contact
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),
});


export default function Info() {
	const [status, setStatus] = useState(null); // { variant, text }
	const [isInitialized, setIsInitialized] = useState(false);
	const { id } = useParams();

	const {
		caregiverDetail,
		updateCaregiver,
		isCaregiverLoading,
		isCaregiverActionPending,
		caregiverFetchError,
		caregiverActionError
	} = useCaregivers(id);

	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { errors },
		reset,
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	// --- Address Autocomplete Handler ---
	function handleAddressSelect({ street, city, state, country, postalCode }) {
		if (street) setValue("street", street, { shouldValidate: true });
		if (city) setValue("city", city, { shouldValidate: true });
		if (state) setValue("state", state, { shouldValidate: true });
		if (country) setValue("country", country, { shouldValidate: true });
		if (postalCode) setValue("pincode", postalCode, { shouldValidate: true });
	}

	// --- 3. Data Loading ---
	useEffect(() => {
		if (caregiverDetail && !isInitialized) {
			reset(cleanFetchedData(caregiverDetail));
			setIsInitialized(true);
		}
	}, [caregiverDetail, reset, isInitialized]);

	// --- 4. Form Submission ---
	const onSubmit = async (data) => {
		setStatus(null);

		const submissionBody = {
			email: data.email || null,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone || null,
			dateOfBirth: data.birth || null,
			region: data.region,
			notes: data.notes ? data.notes : null,

			address: {
				street: data.street,
				city: data.city,
				state: data.state,
				pinCode: data.pincode,
				country: data.country,
				gpsCoordinates: { latitude: 44.6488, longitude: -63.5752 },
			},

			emergencyContact: {
				name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
				phone: data.emergencyPhone || null,
				relationship: data.relationship || null
			},
		};

		updateCaregiver(
			{ id, data: submissionBody },
			{
				onSuccess: (res) => {
					setStatus({ variant: "success", text: "Caregiver data updated successfully!" });
				},
				onError: (err) => {
					setStatus({ variant: "error", text: caregiverActionError || "Failed to update caregiver." });
				},
			}
		);
	};

	const handleCancel = () => {
		reset(cleanFetchedData(caregiverDetail));
		setStatus(null);
	};


	if (isCaregiverLoading || caregiverFetchError) {
		return (
			<ErrorState
				isLoading={isCaregiverLoading}
				errorMessage={caregiverFetchError}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<div className={styles.body}>
				<Card>
					<CardHeader>Personal Details</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
							<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Date of Birth" name="birth" register={register} control={control} error={errors.birth} type="date" />
							<InputField label="Region" name="region" type="select" register={register} error={errors.region}
								options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
							/>
						</div>

						<AddressAutocomplete onAddressSelect={handleAddressSelect} />

						<div className={styles.card_row_2}>
							<InputField label="Street" name="street" register={register} error={errors.street} />
							<InputField label="City" name="city" register={register} error={errors.city} />
							<InputField label="Province" name="state" register={register} error={errors.state} />
							<InputField label="Country" name="country" register={register} error={errors.country} />
							<InputField label="Postal Code" name="pincode" register={register} error={errors.pincode} />
						</div>
						<div className={styles.card_row_1}>
							<InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Contact Details</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
							<InputField label="Email" name="email" register={register} error={errors.email} />
						</div>
					</CardContent>
				</Card>

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
			</div>

			<div className={styles.buttons}>
				<Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
				<Button type="submit" variant="primary" disabled={isCaregiverActionPending}>
					{isCaregiverActionPending ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}
