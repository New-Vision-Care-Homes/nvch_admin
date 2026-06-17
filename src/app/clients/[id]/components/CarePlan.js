"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./CarePlan.module.css";
import ActionMessage from "@components/UI/ActionMessage";
import { longTextRule } from "@/utils/validation";
import { useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { Edit, Stethoscope, Pill, FileText, ClipboardList } from "lucide-react";

// ── Validation schema ──────────────────────────────────────────────────────────
const carePlanSchema = yup.object({
	chronic_conditions:       longTextRule,
	allergies:                longTextRule,
	past_surgeries:           longTextRule,
	prescription_medications: longTextRule,
	OTC_medications:          longTextRule,
	dosage_schedule:          longTextRule,
	dietary_restrictions:     longTextRule,
	mobility_assistance_needs:longTextRule,
	cognitive_status:         longTextRule,
	Daily_care_tasks:         longTextRule,
	emergency_procedures:     longTextRule,
	communication_preferences:longTextRule,
	other_instructions:       longTextRule,
});

// ── Flatten nested API response into form-compatible shape ────────────────────
const cleanFetchedData = (apiData) => {
	if (!apiData?.carePlan) {
		return {
			chronic_conditions: "", allergies: "", past_surgeries: "",
			prescription_medications: "", OTC_medications: "", dosage_schedule: "",
			dietary_restrictions: "", mobility_assistance_needs: "", cognitive_status: "",
			Daily_care_tasks: "", emergency_procedures: "", communication_preferences: "",
			other_instructions: "",
		};
	}
	const { careInstructions = {}, currentMedications = {}, medicalCondition = {}, specialNotes = {} } = apiData.carePlan;
	return {
		chronic_conditions:        medicalCondition.chronicConditions    || "",
		allergies:                 medicalCondition.allergies            || "",
		past_surgeries:            medicalCondition.pastSurgeries        || "",
		prescription_medications:  currentMedications.prescriptionMedications || "",
		OTC_medications:           currentMedications.otcMedications     || "",
		dosage_schedule:           currentMedications.dosageSchedule     || "",
		dietary_restrictions:      specialNotes.dietaryRestrictions      || "",
		mobility_assistance_needs: specialNotes.mobilityAssistanceNeeds  || "",
		cognitive_status:          specialNotes.cognitiveStatus          || "",
		Daily_care_tasks:          careInstructions.dailyCareTasks       || "",
		emergency_procedures:      careInstructions.emergencyProcedures  || "",
		communication_preferences: careInstructions.communicationPreferences || "",
		other_instructions:        careInstructions.otherInstructions    || "",
	};
};

// ── View-mode field ────────────────────────────────────────────────────────────
function ViewField({ label, value }) {
	return (
		<div className={styles.field}>
			<p className={styles.fieldLabel}>{label}</p>
			{value
				? <p className={styles.fieldVal}>{value}</p>
				: <p className={styles.fieldEmpty}>Not recorded</p>
			}
		</div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CarePlan() {
	const { id } = useParams();
	const [isInitialized, setIsInitialized] = useState(false);
	const [isEditing, setIsEditing]         = useState(false);
	const [status, setStatus]               = useState(null);

	const { clientDetail, updateClient, isLoading, isActionPending } = useClients(id);
	const { profile } = useProfile();
	const canEdit = canManageTarget(profile, clientDetail, "update_all_clients", "update_assigned_clients");

	const { register, handleSubmit, formState: { errors }, reset } = useForm({
		resolver: yupResolver(carePlanSchema),
		defaultValues: cleanFetchedData(null),
	});

	useEffect(() => {
		if (clientDetail && !isInitialized) {
			reset(cleanFetchedData(clientDetail));
			setIsInitialized(true);
		}
	}, [clientDetail, reset, isInitialized]);

	// ── Submit ────────────────────────────────────────────────────────────────
	const onSubmit = (data) => {
		setStatus(null);
		const submissionBody = {
			...clientDetail,
			carePlan: {
				careInstructions: {
					communicationPreferences: data.communication_preferences || null,
					dailyCareTasks:           data.Daily_care_tasks          || null,
					emergencyProcedures:      data.emergency_procedures      || null,
					otherInstructions:        data.other_instructions        || null,
				},
				currentMedications: {
					dosageSchedule:           data.dosage_schedule           || null,
					otcMedications:           data.OTC_medications           || null,
					prescriptionMedications:  data.prescription_medications  || null,
				},
				medicalCondition: {
					allergies:                data.allergies                 || null,
					chronicConditions:        data.chronic_conditions        || null,
					pastSurgeries:            data.past_surgeries            || null,
				},
				specialNotes: {
					cognitiveStatus:          data.cognitive_status          || null,
					dietaryRestrictions:      data.dietary_restrictions      || null,
					mobilityAssistanceNeeds:  data.mobility_assistance_needs || null,
				},
			},
		};

		updateClient({ id, data: submissionBody }, {
			onSuccess: () => {
				setStatus({ variant: "success", text: "Care plan updated successfully!" });
				setIsEditing(false);
				setIsInitialized(false);
			},
			onError: (err) => {
				const resData    = err.response?.data;
				const statusCode = err.response?.status;
				if (statusCode === 400 && resData?.details?.length > 0) {
					setStatus({ variant: "error", text: resData.details.map((d) => `${d.msg}${d.path ? ` (${d.path})` : ""}`).join(" | ") });
				} else {
					setStatus({ variant: "error", text: resData?.message || resData?.error || err.message || "Failed to update care plan." });
				}
			},
		});
	};

	const handleCancel = () => {
		reset(cleanFetchedData(clientDetail));
		setStatus(null);
		setIsEditing(false);
	};

	if (isLoading) return <div className={styles.loading}>Loading Care Plan…</div>;

	// Flat values for view mode (always from canonical API data)
	const v = cleanFetchedData(clientDetail);

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			<div className={styles.sections}>

				{/* ── MEDICAL CONDITIONS ── */}
				<div className={`${styles.section} ${styles.sectionRed}`}>
					<div className={`${styles.secHeader} ${styles.secHeaderRed}`}>
						<Stethoscope size={15} className={styles.secIconRed} />
						Medical Conditions
					</div>
					{isEditing ? (
						<div className={styles.editBody}>
							<InputField label="Chronic Conditions"  name="chronic_conditions" register={register} error={errors.chronic_conditions}  type="textarea" rows={4} />
							<InputField label="Allergies"           name="allergies"           register={register} error={errors.allergies}           type="textarea" rows={4} />
							<InputField label="Past Surgeries"      name="past_surgeries"      register={register} error={errors.past_surgeries}      type="textarea" rows={4} />
						</div>
					) : (
						<div className={styles.viewBody}>
							<ViewField label="Chronic Conditions" value={v.chronic_conditions} />
							<ViewField label="Allergies"          value={v.allergies} />
							<ViewField label="Past Surgeries"     value={v.past_surgeries} />
						</div>
					)}
				</div>

				{/* ── CURRENT MEDICATIONS ── */}
				<div className={`${styles.section} ${styles.sectionViolet}`}>
					<div className={`${styles.secHeader} ${styles.secHeaderViolet}`}>
						<Pill size={15} className={styles.secIconViolet} />
						Current Medications
					</div>
					{isEditing ? (
						<div className={styles.editBody}>
							<InputField label="Prescription Medications" name="prescription_medications" register={register} error={errors.prescription_medications} type="textarea" rows={4} />
							<InputField label="OTC Medications"          name="OTC_medications"           register={register} error={errors.OTC_medications}           type="textarea" rows={4} />
							<InputField label="Dosage & Schedule"        name="dosage_schedule"           register={register} error={errors.dosage_schedule}           type="textarea" rows={4} />
						</div>
					) : (
						<div className={styles.viewBody}>
							<ViewField label="Prescription Medications" value={v.prescription_medications} />
							<ViewField label="OTC Medications"          value={v.OTC_medications} />
							<ViewField label="Dosage & Schedule"        value={v.dosage_schedule} />
						</div>
					)}
				</div>

				{/* ── SPECIAL NOTES ── */}
				<div className={`${styles.section} ${styles.sectionAmber}`}>
					<div className={`${styles.secHeader} ${styles.secHeaderAmber}`}>
						<FileText size={15} className={styles.secIconAmber} />
						Special Notes
					</div>
					{isEditing ? (
						<div className={styles.editBody}>
							<InputField label="Dietary Restrictions"        name="dietary_restrictions"      register={register} error={errors.dietary_restrictions}      type="textarea" rows={4} />
							<InputField label="Mobility & Assistance Needs" name="mobility_assistance_needs"  register={register} error={errors.mobility_assistance_needs}  type="textarea" rows={4} />
							<InputField label="Cognitive Status"            name="cognitive_status"           register={register} error={errors.cognitive_status}           type="textarea" rows={4} />
						</div>
					) : (
						<div className={styles.viewBody}>
							<ViewField label="Dietary Restrictions"        value={v.dietary_restrictions} />
							<ViewField label="Mobility & Assistance Needs" value={v.mobility_assistance_needs} />
							<ViewField label="Cognitive Status"            value={v.cognitive_status} />
						</div>
					)}
				</div>

				{/* ── CARE INSTRUCTIONS ── */}
				<div className={`${styles.section} ${styles.sectionEmerald}`}>
					<div className={`${styles.secHeader} ${styles.secHeaderEmerald}`}>
						<ClipboardList size={15} className={styles.secIconEmerald} />
						Care Instructions
					</div>
					{isEditing ? (
						<div className={styles.editBody}>
							<InputField label="Daily Care Tasks"             name="Daily_care_tasks"           register={register} error={errors.Daily_care_tasks}           type="textarea" rows={4} />
							<InputField label="Emergency Procedures"         name="emergency_procedures"       register={register} error={errors.emergency_procedures}       type="textarea" rows={4} />
							<InputField label="Communication Preferences"    name="communication_preferences"  register={register} error={errors.communication_preferences}  type="textarea" rows={4} />
							<InputField label="Other Instructions"           name="other_instructions"         register={register} error={errors.other_instructions}         type="textarea" rows={4} />
						</div>
					) : (
						<div className={styles.viewBody}>
							<ViewField label="Daily Care Tasks"          value={v.Daily_care_tasks} />
							<ViewField label="Emergency Procedures"      value={v.emergency_procedures} />
							<ViewField label="Communication Preferences" value={v.communication_preferences} />
							<ViewField label="Other Instructions"        value={v.other_instructions} />
						</div>
					)}
				</div>

			</div>

			{canEdit && (
				<div className={styles.actionBar}>
					{!isEditing ? (
						<Button variant="primary" icon={<Edit size={16} />} type="button" onClick={() => setIsEditing(true)}>
							Edit Care Plan
						</Button>
					) : (
						<>
							<Button variant="secondary" type="button" onClick={handleCancel}>
								Cancel
							</Button>
							<Button variant="primary" type="submit" disabled={isActionPending}>
								{isActionPending ? "Saving…" : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			)}
		</form>
	);
}
