"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import StatusMessage from "@components/UI/StatusMessage";
// Importing validation rules used in the Client page for consistency
import { nameRule, emailRule, phoneRule, pinRule, birthRule, shortTextRule, longTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";

// API Endpoint for Caregiver management (assuming a slightly different URL)
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";

// --- 1. Data Cleaning/Flattening Function ---
/**
 * Transforms nested API data into a flat structure suitable for the form's fields.
 * Also ensures all fields have safe default values (e.g., "" instead of null/undefined).
 * @param {object} apiData - Raw caregiver data from the API.
 * @returns {object} Flattened object with safe default values for use with RHF's reset().
 */
const cleanFetchedData = (apiData) => {
	if (!apiData) return {};
	console.log("apidata: ", apiData);

	// Base fields
	const cleanData = {
		firstName: apiData.firstName || "",
		lastName: apiData.lastName || "",
		notes: apiData.notes || "",
		birth: apiData.dateOfBirth?.split('T')[0] || "",
		phone: apiData.phone || "",
		email: apiData.email || "",

		// Address field
		street: apiData.address.street || "",
		city: apiData.address.city || "",
		state: apiData.address.state || "",
		country: apiData.address.country || "",
		pincode: apiData.address.pinCode || "",
		region: apiData.region || "",

		notes: apiData.notes || "",
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

	// Address fields (Matching validation rules from Client page)
	street: shortTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("State/Province is required"),
	pincode: pinRule.optional(),
	country: shortTextRule.required("Country is required"),

	// Emergency Contact
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	emergencyPhone: phoneRule.optional(),
	relationship: shortTextRule.optional(),

	// Statutory Decision Maker (SDM) fields removed for Caregiver
});


export default function Info() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState(null); // { variant, text }
	const { id } = useParams();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset, // Key function for data loading and implementing "Cancel"
		watch // Used for displaying the name in the header
	} = useForm({
		resolver: yupResolver(schema),
		// Initialize form with safe, empty defaults
		defaultValues: cleanFetchedData(null),
	});

	// --- 3. Data Loading (Fetch Caregiver Data) ---
	const fetchUser = useCallback(async () => {
		setIsLoading(true);
		setStatus(null);
		const token = localStorage.getItem("token");

		if (!token) {
			setStatus({ variant: "error", text: "Authentication failed. Please log in again." });
			setIsLoading(false);
			return;
		}

		try {
			const res = await fetch(`${API_BASE_URL}/${id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const data = await res.json();
			console.log("user: ", data.data.user);

			if (res.ok && data.data.user) {
				const cleanedData = cleanFetchedData(data.data.user);
				console.log("Cleaned Data for Form:", cleanedData);
				reset(cleanedData);
				// No message on load — data populates silently
			} else {
				const errorMsg = data.error || data.message || "Failed to fetch caregiver data.";
				setStatus({ variant: "error", text: `Error fetching caregiver: ${errorMsg}` });
			}
		} catch (err) {
			console.error("Fetch Caregiver Error:", err);
			setStatus({ variant: "error", text: "Error connecting to server to fetch caregiver data." });
		} finally {
			setIsLoading(false);
		}
	}, [id, reset]);

	useEffect(() => {
		// Fetch data only once the component mounts and the ID is available
		if (id) {
			fetchUser();
		}
	}, [id, fetchUser]);


	// --- 4. Form Submission (Update Caregiver Data) ---
	const onSubmit = async (data) => {
		setIsSubmitting(true);
		setStatus(null);
		const token = localStorage.getItem("token");

		const submissionBody = {
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			dateOfBirth: data.birth,
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
				phone: data.emergencyPhone,
				relationship: data.relationship
			},
		};

		try {
			const res = await fetch(`${API_BASE_URL}/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(submissionBody),
			});

			const resData = await res.json();

			if (res.ok) {
				reset(data);
				setStatus({ variant: "success", text: "Caregiver data updated successfully!" });
			} else {
				const errorMsg = resData.error || resData.message || `Failed to update caregiver (Status ${res.status}).`;
				setStatus({ variant: "error", text: `Error saving: ${errorMsg}` });
			}
		} catch (err) {
			console.error("Submission Error:", err);
			setStatus({ variant: "error", text: "Network error or invalid response during submission." });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		reset();
		setStatus(null);
	};


	if (isLoading) {
		return <div className={styles.loading}>Loading caregiver profile...</div>;
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<StatusMessage variant={status?.variant} message={status?.text} />

			<div className={styles.body}>
				<Card>
					<CardHeader>Personal Details</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
							<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Date of Birth" name="birth" register={register} error={errors.birth} type="date" />
							<InputField label="Address" name="street" register={register} error={errors.street} />
						</div>
						{/* Address fields matching Client page structure */}
						<div className={styles.card_row_2}>
							<InputField label="City" name="city" register={register} error={errors.city} />
							<InputField label="State" name="state" register={register} error={errors.state} />
							<InputField label="Country" name="country" register={register} error={errors.country} />
							<InputField label="Postal Code" name="pincode" register={register} error={errors.pincode} />
							<InputField label="Region" name="region" type="select" register={register} error={errors.region}
								options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
							/>
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
							<InputField label="Phone" name="phone" register={register} error={errors.phone} />
							<InputField label="Email" name="email" register={register} error={errors.email} />
						</div>
					</CardContent>
				</Card>

				{/* Emergency Contact */}
				<Card>
					<CardHeader>Emergency Contact</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
							<InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
							<InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
						</div>
					</CardContent>
				</Card>

				{/* Statutory Decision Maker (SDM) Section Removed */}

			</div>

			<div className={styles.buttons}>
				<Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
				<Button type="submit" variant="primary" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}
