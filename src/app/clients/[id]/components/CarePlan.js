"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import { longTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";

// --- 1. Yup Validation Schema (Flat for Form Fields) ---
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

// --- 2. Data Cleaning/Flattening Function ---
const cleanFetchedData = (apiData) => {
	if (!apiData || !apiData.carePlan) {
		return {
			chronic_conditions: "", allergies: "", past_surgeries: "",
			prescription_medications: "", OTC_medications: "", dosage_schedule: "",
			dietary_restrictions: "", mobility_assistance_needs: "", cognitive_status: "",
			Daily_care_tasks: "", emergency_procedures: "", communication_preferences: "",
			other_instructions: ""
		};
	}

	const carePlan = apiData.carePlan;
	const careInstructions = carePlan.careInstructions || {};
	const currentMedications = carePlan.currentMedications || {};
	const medicalCondition = carePlan.medicalCondition || {};
	const specialNotes = carePlan.specialNotes || {};

	return {
		chronic_conditions: medicalCondition.chronicConditions || "",
		allergies: medicalCondition.allergies || "",
		past_surgeries: medicalCondition.pastSurgeries || "",

		prescription_medications: currentMedications.prescriptionMedications || "",
		OTC_medications: currentMedications.otcMedications || "",
		dosage_schedule: currentMedications.dosageSchedule || "",

		dietary_restrictions: specialNotes.dietaryRestrictions || "",
		mobility_assistance_needs: specialNotes.mobilityAssistanceNeeds || "",
		cognitive_status: specialNotes.cognitiveStatus || "",

		Daily_care_tasks: careInstructions.dailyCareTasks || "",
		emergency_procedures: careInstructions.emergencyProcedures || "",
		communication_preferences: careInstructions.communicationPreferences || "",
		other_instructions: careInstructions.otherInstructions || "",
	};
};

export default function CarePlan() {
	const { id } = useParams();
	const [isInitialized, setIsInitialized] = useState(false);
	const [status, setStatus] = useState(null); // { variant: 'success'|'error', text: string }

	const {
		clientDetail,
		updateClient,
		isLoading,
		isActionPending,
	} = useClients(id);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm({
		resolver: yupResolver(carePlanSchema),
		defaultValues: cleanFetchedData(null),
	});

	// --- 3. Data Loading ---
	useEffect(() => {
		if (clientDetail && !isInitialized) {
			reset(cleanFetchedData(clientDetail));
			setIsInitialized(true);
		}
	}, [clientDetail, reset, isInitialized]);

	// --- 4. Form Submission ---
	const onSubmit = (data) => {
		setStatus(null);

		const submissionBody = {
			...clientDetail,
			carePlan: {
				careInstructions: {
					communicationPreferences: data.communication_preferences || null,
					dailyCareTasks: data.Daily_care_tasks || null,
					emergencyProcedures: data.emergency_procedures || null,
					otherInstructions: data.other_instructions || null,
				},
				currentMedications: {
					dosageSchedule: data.dosage_schedule || null,
					otcMedications: data.OTC_medications || null,
					prescriptionMedications: data.prescription_medications || null,
				},
				medicalCondition: {
					allergies: data.allergies || null,
					chronicConditions: data.chronic_conditions || null,
					pastSurgeries: data.past_surgeries || null,
				},
				specialNotes: {
					cognitiveStatus: data.cognitive_status || null,
					dietaryRestrictions: data.dietary_restrictions || null,
					mobilityAssistanceNeeds: data.mobility_assistance_needs || null,
				},
			}
		};

		updateClient(
			{ id, data: submissionBody },
			{
				onSuccess: (res) => {
					setStatus({ variant: "success", text: "Care plan updated successfully!" });
				},
				onError: (err) => {
					const resData = err.response?.data;
					const statusCode = err.response?.status;
					if (statusCode === 400 && resData?.details?.length > 0) {
						setStatus({ variant: "error", text: resData.details.map((d) => `${d.msg}${d.path ? ` (${d.path})` : ""}`).join(" | ") });
					} else {
						setStatus({ variant: "error", text: resData?.message || resData?.error || err.message || "Failed to update care plan." });
					}
				},
			}
		);
	};

	const handleCancel = () => {
		reset(cleanFetchedData(clientDetail));
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
				<Button variant="primary" type="submit" disabled={isActionPending}>
					{isActionPending ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}