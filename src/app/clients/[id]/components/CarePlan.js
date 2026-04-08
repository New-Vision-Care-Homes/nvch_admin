"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import { longTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";

// --- 1. CONFIGURATION ---
const API_BASE_URL = "https://nvch-server.onrender.com/api/auth/admin/users";

// --- 2. Yup Validation Schema (Flat for Form Fields) ---
// Keep the schema flat to match your InputField names
const carePlanSchema = yup.object({
	chronic_conditions: longTextRule,
	allergies: longTextRule,
	past_surgeries: longTextRule,
	prescription_medications: longTextRule,
	OTC_medications: longTextRule,
	dosage_schedule: longTextRule,
	dietary_restrictions: longTextRule,
	mobility_assistance_needs: longTextRule,
	cognitive_status: longTextRule,
	Daily_care_tasks: longTextRule,
	emergency_procedures: longTextRule,
	communication_preferences: longTextRule,
	other_instructions: longTextRule,
});

// --- 3. Data Cleaning/Flattening Function (MODIFIED) ---
/**
 * Transforms nested API data (under apiData.carePlan) into a flat structure
 * that matches the local form field names.
 * @param {object} apiData - Raw user/client data from the API.
 * @returns {object} Flattened object with safe default values ("").
 */
const cleanFetchedData = (apiData) => {
	// Check if the carePlan object exists and is valid
	if (!apiData || !apiData.carePlan) return {};

	const carePlan = apiData.carePlan;

	// Safely extract the nested objects
	const careInstructions = carePlan.careInstructions || {};
	const currentMedications = carePlan.currentMedications || {};
	const medicalCondition = carePlan.medicalCondition || {};
	const specialNotes = carePlan.specialNotes || {};

	// Map the nested API keys to the flat form field names (e.g., chronicConditions -> chronic_conditions)
	return {
		// --- Medical Conditions ---
		chronic_conditions: medicalCondition.chronicConditions || "",
		allergies: medicalCondition.allergies || "",
		past_surgeries: medicalCondition.pastSurgeries || "",

		// --- Current Medications ---
		prescription_medications: currentMedications.prescriptionMedications || "",
		OTC_medications: currentMedications.otcMedications || "",
		dosage_schedule: currentMedications.dosageSchedule || "",

		// --- Special Notes ---
		dietary_restrictions: specialNotes.dietaryRestrictions || "",
		mobility_assistance_needs: specialNotes.mobilityAssistanceNeeds || "",
		cognitive_status: specialNotes.cognitiveStatus || "",

		// --- Care Instructions ---
		Daily_care_tasks: careInstructions.dailyCareTasks || "",
		emergency_procedures: careInstructions.emergencyProcedures || "",
		communication_preferences: careInstructions.communicationPreferences || "",
		other_instructions: careInstructions.otherInstructions || "",
	};
};

// --- 4. Default Values ---
const defaultCarePlanValues = cleanFetchedData(null);


export default function CarePlan() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState(null); // { variant: 'success'|'error', text: string }
	const { id } = useParams();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset, // Used for data loading and the Cancel action
	} = useForm({
		resolver: yupResolver(carePlanSchema),
		defaultValues: defaultCarePlanValues,
	});


	// --- 5. Data Loading (Fetch Care Plan Data) ---
	const fetchCarePlan = useCallback(async () => {
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
			console.log("data: ", data);

			if (res.ok && data.data.user) {
				const cleanedData = cleanFetchedData(data.data.user);
				console.log("Loaded Care Plan Data:", cleanedData);
				reset(cleanedData);
				// No message on load — data just populates silently
			} else {
				const errorMsg = data.error || data.message || "Failed to fetch care plan data.";
				setStatus({ variant: "error", text: `Error fetching care plan: ${errorMsg}` });
				reset(defaultCarePlanValues);
			}
		} catch (err) {
			console.error("Fetch Care Plan Error:", err);
			setStatus({ variant: "error", text: "Error connecting to server to fetch user data." });
		} finally {
			setIsLoading(false);
		}
	}, [id, reset]);

	useEffect(() => {
		if (id) {
			fetchCarePlan();
		}
	}, [id, fetchCarePlan]);


	// --- 6. Form Submission (MODIFIED: Re-nest Data for API) ---
	/**
	 * Re-nests the flat form data back into the complex structure required by the API.
	 * @param {object} data - Flat data from react-hook-form.
	 */
	const onSubmit = async (data) => {
		setIsSubmitting(true);
		setStatus(null);
		const token = localStorage.getItem("token");

		// --- Re-nest/Structure data for API Submission ---
		// This MUST match the nested structure shown in your backend response.
		const submissionBody = {
			carePlan: {
				careInstructions: {
					communicationPreferences: data.communication_preferences,
					dailyCareTasks: data.Daily_care_tasks,
					emergencyProcedures: data.emergency_procedures,
					otherInstructions: data.other_instructions,
				},
				currentMedications: {
					dosageSchedule: data.dosage_schedule,
					otcMedications: data.OTC_medications,
					prescriptionMedications: data.prescription_medications,
				},
				medicalCondition: {
					allergies: data.allergies,
					chronicConditions: data.chronic_conditions,
					pastSurgeries: data.past_surgeries,
				},
				specialNotes: {
					cognitiveStatus: data.cognitive_status,
					dietaryRestrictions: data.dietary_restrictions,
					mobilityAssistanceNeeds: data.mobility_assistance_needs,
				},
			}
		};

		console.log("Submission Body:", submissionBody);

		try {
			// Note: If the API requires ONLY the carePlan object and NOT the wrapping user object,
			// you might need to use a separate PATCH endpoint dedicated to carePlan updates.
			// For now, we use PUT on the user endpoint and include the nested carePlan.
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
				const updatedData = cleanFetchedData(resData.data.user);
				reset(updatedData);
				setStatus({ variant: "success", text: "Care plan updated successfully!" });
			} else {
				const errorMsg = resData.error || resData.message || `Failed to update care plan (Status ${res.status}).`;
				setStatus({ variant: "error", text: `Error saving: ${errorMsg}` });
			}
		} catch (err) {
			console.error("Submission Error:", err);
			setStatus({ variant: "error", text: "Network error or invalid response during submission." });
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- 7. Cancel Action ---
	const handleCancel = () => {
		reset();
		setStatus(null);
	};


	if (isLoading) {
		return <div className={styles.loading}>Loading Care Plan...</div>;
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<div className={styles.body}>
				{/* MEDICAL CONDITIONS */}
				<Card>
					<CardHeader>Medical Conditions</CardHeader>
					<CardContent>
						<InputField
							label="Chronic Conditions"
							name="chronic_conditions"
							register={register}
							error={errors.chronic_conditions}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Allergies"
							name="allergies"
							register={register}
							error={errors.allergies}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Past Surgeries"
							name="past_surgeries"
							register={register}
							error={errors.past_surgeries}
							type="textarea"
							rows={5}
						/>
					</CardContent>
				</Card>

				{/* CURRENT MEDICATIONS */}
				<Card>
					<CardHeader>Current Medications</CardHeader>
					<CardContent>
						<InputField
							label="Prescription Medications"
							name="prescription_medications"
							register={register}
							error={errors.prescription_medications}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="OTC Medications"
							name="OTC_medications"
							register={register}
							error={errors.OTC_medications}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Dosage & Schedule"
							name="dosage_schedule"
							register={register}
							error={errors.dosage_schedule}
							type="textarea"
							rows={5}
						/>
					</CardContent>
				</Card>

				{/* SPECIAL NOTES */}
				<Card>
					<CardHeader>Special Notes</CardHeader>
					<CardContent>
						<InputField
							label="Dietary Restrictions"
							name="dietary_restrictions"
							register={register}
							error={errors.dietary_restrictions}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Mobility & Assistance Needs"
							name="mobility_assistance_needs"
							register={register}
							error={errors.mobility_assistance_needs}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Cognitive Status"
							name="cognitive_status"
							register={register}
							error={errors.cognitive_status}
							type="textarea"
							rows={5}
						/>
					</CardContent>
				</Card>

				{/* CARE INSTRUCTIONS */}
				<Card>
					<CardHeader>Care Instructions</CardHeader>
					<CardContent>
						<InputField
							label="Daily Care Tasks"
							name="Daily_care_tasks"
							register={register}
							error={errors.Daily_care_tasks}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Emergency Procedures"
							name="emergency_procedures"
							register={register}
							error={errors.emergency_procedures}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Communication Preferences"
							name="communication_preferences"
							register={register}
							error={errors.communication_preferences}
							type="textarea"
							rows={5}
						/>
						<InputField
							label="Other Instructions"
							name="other_instructions"
							register={register}
							error={errors.other_instructions}
							type="textarea"
							rows={5}
						/>
					</CardContent>
				</Card>
			</div>

			{/* BUTTONS */}
			<div className={styles.buttons}>
				<Button variant="secondary" type="button" onClick={handleCancel}>
					Cancel
				</Button>
				<Button variant="primary" type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}