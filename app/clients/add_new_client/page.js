"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_client.module.css";
import { useRouter } from "next/navigation";
import { useClients } from "@/hooks/useClients";

import {
	IdRule,
	nameRule,
	emailRule,
	phoneRule,
	shortTextRule,
	longTextRule,
	dateRule,
	pinRule,
	passwordRule,
	birthRule,
} from "@app/validation";

const schema = yup.object({
	// Personal
	clientId: IdRule,
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule,
	phone: phoneRule,
	birth: birthRule,
	password: passwordRule.required("Password is required"),
	region: yup
		.string()
		.oneOf(
			["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"],
			"Please select a valid region"
		)
		.required("Region is required"),
	// optional, max 50
	maritalStatus: yup.string().max(50, "Marital status must be at most 50 characters").nullable().optional(),
	// optional, integer 1-5
	levelOfSupport: yup
		.number()
		.integer("Level of support must be a whole number")
		.min(1, "Level of support must be between 1 and 5")
		.max(5, "Level of support must be between 1 and 5")
		.nullable()
		.transform((v, o) => (o === "" ? null : v)),
	notes: longTextRule,

	// Address
	street: shortTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("Province is required"),
	pinCode: pinRule,
	country: shortTextRule.required("Country is required"),
	latitude: yup.number().nullable().transform((v, o) => (o === "" ? null : v)),
	longitude: yup.number().nullable().transform((v, o) => (o === "" ? null : v)),

	// Health Card -- both optional per backend, number max 50
	healthCardNumber: yup.string().max(50, "Health card number must be at most 50 characters").nullable().optional(),
	healthCardExpiryDate: dateRule.nullable().optional(),

	// Emergency Contact
	emergencyFName: nameRule,
	emergencyLName: nameRule,
	emergencyPhone: phoneRule,
	relationship: shortTextRule,

	// Next of Kin -- all optional, name max 100 (50 per part)
	nokFName: nameRule,
	nokLName: nameRule,
	nokPhone: phoneRule,
	nokEmail: emailRule,

	// SDM
	sdmFName: nameRule,
	sdmLName: nameRule,
	sdmPhone: phoneRule,
	sdmEmail: emailRule,

	// Care Coordinator -- name + phone + email all required
	careCoordinatorFName: nameRule,
	careCoordinatorLName: nameRule,
	careCoordinatorPhone: phoneRule,
	careCoordinatorEmail: emailRule,

	// Power of Attorney -- all optional, name max 100 (50 per part)
	poaFName: nameRule,
	poaLName: nameRule,
	poaPhone: phoneRule,
	poaEmail: emailRule,

	// Personal Directive -- all optional, name max 100
	pdFName: nameRule,
	pdLName: nameRule,
	pdPhone: phoneRule,
	pdEmail: emailRule,

	// Legal Guardianship -- all optional, name max 100
	lgFName: nameRule,
	lgLName: nameRule,
	lgPhone: phoneRule,
	lgEmail: emailRule,

	// Adult Protection / Public Trustee -- all optional, name max 100
	aptFName: nameRule,
	aptLName: nameRule,
	aptPhone: phoneRule,
	aptEmail: emailRule,

	// Community Treatment Order -- notes optional, max 2000
	ctoNotes: yup.string().max(2000, "Notes must be at most 2000 characters").nullable().optional(),

	// Care Plan
	chronicConditions: longTextRule,
	allergies: longTextRule,
	pastSurgeries: longTextRule,
	prescriptionMedications: longTextRule,
	otcMedications: longTextRule,
	dosageSchedule: longTextRule,
	dietaryRestrictions: longTextRule,
	mobilityAssistanceNeeds: longTextRule,
	cognitiveStatus: longTextRule,
	dailyCareTasks: longTextRule,
	emergencyProcedures: longTextRule,
	communicationPreferences: longTextRule,
	otherInstructions: longTextRule,
});

const fullName = (first, last) =>
	`${first || ""} ${last || ""}`.trim() || null;

export default function Page() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState(null);
	const { addClient, isActionPending, isError, errorMessage } = useClients();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		shouldFocusError: true,
	});

	const onSubmit = async (data) => {
		setLoading(true);

		const body = {
			email: data.email,
			password: data.password,
			firstName: data.firstName,
			lastName: data.lastName,
			role: "client",
			phone: data.phone,
			clientId: data.clientId,
			dateOfBirth: data.birth,
			region: data.region,
			maritalStatus: data.maritalStatus || null,
			levelOfSupport: data.levelOfSupport || null,

			address: {
				street: data.street,
				city: data.city,
				state: data.state,
				pinCode: data.pinCode,
				country: data.country,
				gpsCoordinates: {
					latitude: 44.6488,
					longitude: -63.5752,
				},
			},

			healthCard: {
				number: data.healthCardNumber,
				expiryDate: data.healthCardExpiryDate,
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

			carePlan: {
				medicalCondition: {
					chronicConditions: data.chronicConditions || null,
					allergies: data.allergies || null,
					pastSurgeries: data.pastSurgeries || null,
				},
				currentMedications: {
					prescriptionMedications: data.prescriptionMedications || null,
					otcMedications: data.otcMedications || null,
					dosageSchedule: data.dosageSchedule || null,
				},
				specialNotes: {
					dietaryRestrictions: data.dietaryRestrictions || null,
					mobilityAssistanceNeeds: data.mobilityAssistanceNeeds || null,
					cognitiveStatus: data.cognitiveStatus || null,
				},
				careInstructions: {
					dailyCareTasks: data.dailyCareTasks || null,
					emergencyProcedures: data.emergencyProcedures || null,
					communicationPreferences: data.communicationPreferences || null,
					otherInstructions: data.otherInstructions || null,
				},
			},

			notes: data.notes || null,
		};

		try {
			addClient(body, {
				onSuccess: () => {
					router.push("/clients");
					setErrorMsg(null);
					setLoading(false);
				},
				onError: (err) => {
					const resData = err.response?.data;
					const status = err.response?.status;
					let errorMessage = "An unknown error occurred on the server.";

					if (status === 400 && resData) {
						if (resData.details && Array.isArray(resData.details) && resData.details.length > 0) {
							errorMessage = resData.details
								.map((detail) => {
									const path = detail.path ? `(${detail.path})` : "";
									return `${detail.msg} ${path}`;
								})
								.join(" | ");
						} else {
							errorMessage = resData.error || resData.message || errorMessage;
						}
						console.error("400 Error:", errorMessage);
						setErrorMsg(errorMessage);
					} else if ((status === 401 || status === 403) && resData) {
						errorMessage = resData.message || "Authentication failed. Please log in again.";
						console.error("Auth Error:", errorMessage);
						setErrorMsg(errorMessage);
					} else {
						errorMessage = resData?.message || err.message || `Failed to register client (Status ${status}).`;
						console.error(errorMessage);
						setErrorMsg(errorMessage);
					}
					setLoading(false);
				}
			});
		} catch (err) {
			console.error("Caught critical error:", err);
			setErrorMsg("Could not connect to the server or received an invalid response.");
			setLoading(false);
		}
	};

	function handleCancel() {
		router.push("/clients");
	}

	return (
		<PageLayout>
			<div className={styles.header}>
				<h1>Client Profile: Add New Client</h1>
				<div className={styles.buttons}>
					<Button variant="secondary" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						variant="primary"
						type="submit"
						onClick={handleSubmit(onSubmit)}
						disabled={loading}
					>
						{loading ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.rightPanel}>

					{isError && <div className={styles.formError}>Error: {errorMessage}</div>}
					{/* ── Personal Information ── */}
					<Card>
						<CardHeader>Personal Information</CardHeader>
						<CardContent>
							{errorMsg && (
								<div className={styles.formError}>Error: {errorMsg}</div>
							)}
							<InputField label="Client ID" name="clientId" register={register} error={errors.clientId} />
							<div className={styles.row2}>
								<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
								<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Date of Birth" name="birth" register={register} error={errors.birth} />
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
							</div>
							<div className={styles.row2}>
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
								<InputField label="Phone" name="phone" register={register} error={errors.phone} />
								<InputField label="Email" name="email" register={register} error={errors.email} />
							</div>

							<InputField label="Password" name="password" type="password" register={register} error={errors.password} />
							<InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />

							{/* Address */}
							<h5 className={styles.subSectionTitle}>Address</h5>
							<div className={styles.row2}>
								<InputField label="Street" name="street" register={register} error={errors.street} />
								<InputField label="City" name="city" register={register} error={errors.city} />
							</div>
							<div className={styles.row2}>
								<InputField label="Province" name="state" register={register} error={errors.state} />
								<InputField label="Country" name="country" register={register} error={errors.country} />
								<InputField label="Postal Code" name="pinCode" register={register} error={errors.pinCode} />
							</div>

							{/* Health Card */}
							<h5 className={styles.subSectionTitle}>Health Card</h5>
							<div className={styles.row2}>
								<InputField label="Health Card Number" name="healthCardNumber" register={register} error={errors.healthCardNumber} />
								<InputField label="Health Card Expiry Date" name="healthCardExpiryDate" register={register} error={errors.healthCardExpiryDate} />
							</div>

							{/* Care Coordinator */}
							<h5 className={styles.subSectionTitle}>Care Coordinator / DSP Case Manager</h5>
							<div className={styles.row2}>
								<InputField label="First Name" name="careCoordinatorFName" register={register} error={errors.careCoordinatorFName} />
								<InputField label="Last Name" name="careCoordinatorLName" register={register} error={errors.careCoordinatorLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="careCoordinatorPhone" register={register} error={errors.careCoordinatorPhone} />
								<InputField label="Email" name="careCoordinatorEmail" register={register} error={errors.careCoordinatorEmail} />
							</div>
						</CardContent>
					</Card>

					{/* ── Emergency Contact ── */}
					<Card>
						<CardHeader>Emergency Contact</CardHeader>
						<CardContent>
							<div className={styles.row2}>
								<InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
								<InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
								<InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
							</div>
						</CardContent>
					</Card>

					{/* ── Next of Kin ── */}
					<Card>
						<CardHeader>Next of Kin</CardHeader>
						<CardContent>
							<div className={styles.row2}>
								<InputField label="First Name" name="nokFName" register={register} error={errors.nokFName} />
								<InputField label="Last Name" name="nokLName" register={register} error={errors.nokLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="nokPhone" register={register} error={errors.nokPhone} />
								<InputField label="Email" name="nokEmail" register={register} error={errors.nokEmail} />
							</div>
						</CardContent>
					</Card>

					{/* ── Statutory Decision Maker ── */}
					<Card>
						<CardHeader>Statutory Decision Maker (SDM)</CardHeader>
						<CardContent>
							<div className={styles.row2}>
								<InputField label="First Name" name="sdmFName" register={register} error={errors.sdmFName} />
								<InputField label="Last Name" name="sdmLName" register={register} error={errors.sdmLName} />
							</div>
							<div className={styles.row2}>
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
							<div className={styles.row2}>
								<InputField label="First Name" name="poaFName" register={register} error={errors.poaFName} />
								<InputField label="Last Name" name="poaLName" register={register} error={errors.poaLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="poaPhone" register={register} error={errors.poaPhone} />
								<InputField label="Email" name="poaEmail" register={register} error={errors.poaEmail} />
							</div>

							<h5 className={styles.subSectionTitle}>Personal Directive</h5>
							<div className={styles.row2}>
								<InputField label="First Name" name="pdFName" register={register} error={errors.pdFName} />
								<InputField label="Last Name" name="pdLName" register={register} error={errors.pdLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="pdPhone" register={register} error={errors.pdPhone} />
								<InputField label="Email" name="pdEmail" register={register} error={errors.pdEmail} />
							</div>

							<h5 className={styles.subSectionTitle}>Legal Guardianship</h5>
							<div className={styles.row2}>
								<InputField label="First Name" name="lgFName" register={register} error={errors.lgFName} />
								<InputField label="Last Name" name="lgLName" register={register} error={errors.lgLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="lgPhone" register={register} error={errors.lgPhone} />
								<InputField label="Email" name="lgEmail" register={register} error={errors.lgEmail} />
							</div>

							<h5 className={styles.subSectionTitle}>Adult Protection / Public Trustee</h5>
							<div className={styles.row2}>
								<InputField label="First Name" name="aptFName" register={register} error={errors.aptFName} />
								<InputField label="Last Name" name="aptLName" register={register} error={errors.aptLName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Phone" name="aptPhone" register={register} error={errors.aptPhone} />
								<InputField label="Email" name="aptEmail" register={register} error={errors.aptEmail} />
							</div>

							<h5 className={styles.subSectionTitle}>Community Treatment Order</h5>
							<InputField label="Notes" name="ctoNotes" type="textarea" rows={3} register={register} error={errors.ctoNotes} />

						</CardContent>
					</Card>

					{/* ── Medical Conditions ── */}
					<Card>
						<CardHeader>Medical Conditions</CardHeader>
						<CardContent>
							<InputField label="Chronic Conditions" name="chronicConditions" register={register} error={errors.chronicConditions} />
							<InputField label="Allergies" name="allergies" register={register} error={errors.allergies} />
							<InputField label="Past Surgeries" name="pastSurgeries" register={register} error={errors.pastSurgeries} />
						</CardContent>
					</Card>

					{/* ── Current Medications ── */}
					<Card>
						<CardHeader>Current Medications</CardHeader>
						<CardContent>
							<InputField label="Prescription Medications" name="prescriptionMedications" register={register} error={errors.prescriptionMedications} />
							<InputField label="OTC Medications" name="otcMedications" register={register} error={errors.otcMedications} />
							<InputField label="Dosage & Schedule" name="dosageSchedule" register={register} error={errors.dosageSchedule} />
						</CardContent>
					</Card>

					{/* ── Special Notes ── */}
					<Card>
						<CardHeader>Special Notes</CardHeader>
						<CardContent>
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
							<InputField label="Dietary Restrictions" name="dietaryRestrictions" register={register} error={errors.dietaryRestrictions} />
							<InputField label="Mobility & Assistance Needs" name="mobilityAssistanceNeeds" register={register} error={errors.mobilityAssistanceNeeds} />
							<InputField label="Cognitive Status" name="cognitiveStatus" register={register} error={errors.cognitiveStatus} />
						</CardContent>
					</Card>

					{/* ── Care Instructions ── */}
					<Card>
						<CardHeader>Care Instructions</CardHeader>
						<CardContent>
							<InputField label="Daily Care Tasks" name="dailyCareTasks" register={register} error={errors.dailyCareTasks} />
							<InputField label="Emergency Procedures" name="emergencyProcedures" register={register} error={errors.emergencyProcedures} />
							<InputField label="Communication Preferences" name="communicationPreferences" register={register} error={errors.communicationPreferences} />
							<InputField label="Other Instructions" name="otherInstructions" register={register} error={errors.otherInstructions} type="textarea" rows={3} />
						</CardContent>
					</Card>

				</div>
			</div>
		</PageLayout>
	);
}
