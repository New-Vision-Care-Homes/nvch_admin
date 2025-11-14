"use client";

import React from "react";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { longTextRule } from "@app/validation";

// ✅ Yup validation schema
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

export default function CarePlan() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(carePlanSchema),
	});

	const onSubmit = (data) => {
		console.log("Submitted data:", data);
		alert("Saved successfully!");
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
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
				<Button variant="secondary" type="button" onClick={() => alert("Cancelled")}>
					Cancel
				</Button>
				<Button variant="primary" type="submit">
					Save Changes
				</Button>
			</div>
		</form>
	);
}
