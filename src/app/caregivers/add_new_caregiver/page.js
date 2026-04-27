"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_caregiver.module.css";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import AddressAutocomplete from "@/components/UI/AddressAutocomplete";
import { useCaregivers } from "@/hooks/useCaregivers";
import ActionMessage from "@components/UI/ActionMessage";

// Importing custom validation rules
import { IdRule, nameRule, emailRule, phoneRule, shortTextRule, birthRule, longTextRule, dateRuleOptional, pinRule, dateRule, passwordRule } from "@/utils/validation";


/*
|--------------------------------------------------------------------------
| 1. YUP VALIDATION SCHEMAS
|--------------------------------------------------------------------------
| The nested schemas are relaxed, and the array definitions are fortified 
| to bypass all validation if the array exists, relying solely on onSubmit filtering.
*/

// Schema for each Availability slot (Fields are optional)
const availabilitySchema = yup.object({
	day: shortTextRule.optional(),
	startTime: shortTextRule.optional(),
	endTime: shortTextRule.optional(),
	isAvailable: yup.boolean().optional(), // Optional to simplify, though template sets it
	notes: longTextRule.optional(),
});


// Main Form Schema (MODIFIED ARRAY DEFINITIONS)
const schema = yup.object({
	employeeId: IdRule.required("Employee ID is required"),
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	password: passwordRule.required("Password is required"),
	confirmPassword: yup
		.string()
		.required("Please confirm the password")
		.oneOf([yup.ref("password")], "Passwords do not match"),
	email: emailRule.required("Email is required"),
	phone: phoneRule.required("Phone number is required"),
	dateOfBirth: birthRule.required("Date of Birth is required"),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),

	// Address Fields
	street: longTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("Province is required"),
	pinCode: pinRule,
	country: shortTextRule.required("Country is required"),

	availability: yup.array().of(availabilitySchema)
		.nullable()
		.default(null)
		.optional(), // Allows null, undefined, or [] to pass validation

	// Emergency Contact fields
	emergencyLName: nameRule.required("Emergency Contact Name is required"),
	emergencyFName: nameRule.required("Emergency Contact Name is required"),
	emergencyPhone: phoneRule.required("Emergency Contact Phone is required"),
	emergencyRelationship: shortTextRule.required("Emergency Contact Relationship is required"),
});


/*
|--------------------------------------------------------------------------
| 2. DEFAULT VALUES
|--------------------------------------------------------------------------
| Defines the initial state for the dynamic arrays upon 'append'.
*/

const emptyAvailabilityTemplate = {
	day: "",
	startTime: "",
	endTime: "",
	isAvailable: true,
	notes: ""
};


export default function Page() {
	const router = useRouter();

	const { register, handleSubmit, watch, formState: { errors }, control, setValue } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			// Arrays are initialized as empty, allowing the user to add slots
			availability: [],
		}
	});

	function handleAddressSelect({ street, city, state, country, postalCode, latitude, longitude }) {
		if (street) setValue("street", street, { shouldValidate: true });
		if (city) setValue("city", city, { shouldValidate: true });
		if (state) setValue("state", state, { shouldValidate: true });
		if (country) setValue("country", country, { shouldValidate: true });
		if (postalCode) setValue("pinCode", postalCode, { shouldValidate: true });
		if (latitude !== undefined) setValue("latitude", latitude);
		if (longitude !== undefined) setValue("longitude", longitude);
	}

	// useFieldArray for Availability Schedule
	const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
		control,
		name: "availability",
	});

	const { addCaregiver, caregiverActionError, isCaregiverActionPending } = useCaregivers();


	/*
	|--------------------------------------------------------------------------
	| 3. FORM SUBMISSION LOGIC
	|--------------------------------------------------------------------------
	| Processes data and submits to the API.
	*/
	const onSubmit = async (data) => {

		// --- PROCESSING AVAILABILITY ARRAY ---
		// Filters out empty entries (where day is blank)
		const processedAvailability = data.availability
			.filter(slot => slot.day && slot.day.trim() !== "")
			.map(slot => ({
				...slot,
				day: slot.day.toLowerCase(),
				startTime: slot.startTime,
				endTime: slot.endTime,
				notes: slot.notes,
			}));

		// 3. Construct the Caregiver Registration Body
		const body = {
			email: data.email,
			password: data.password,
			firstName: data.firstName,
			lastName: data.lastName,
			role: "caregiver",
			phone: data.phone,
			employeeId: data.employeeId,
			dateOfBirth: data.dateOfBirth,
			region: data.region,

			address: {
				street: data.street,
				city: data.city,
				state: data.state,
				pinCode: data.pinCode,
				country: data.country,
				gpsCoordinates: {
					latitude: data.latitude || 44.6488, // fallback to Halifax
					longitude: data.longitude || -63.5752, // fallback to Halifax
				},
			},

			availability: processedAvailability,

			emergencyContact: {
				name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
				phone: data.emergencyPhone,
				relationship: data.emergencyRelationship,
			},
		};

		// 4. API Submission Logic
		addCaregiver(body, {
			onSuccess: () => {
				router.push("/caregivers");
			},
		});

	};

	function handleCancel() {
		router.push("/caregivers");
	}

	const dayOptions = [
		{ label: "Monday", value: "Monday" },
		{ label: "Tuesday", value: "Tuesday" },
		{ label: "Wednesday", value: "Wednesday" },
		{ label: "Thursday", value: "Thursday" },
		{ label: "Friday", value: "Friday" },
		{ label: "Saturday", value: "Saturday" },
		{ label: "Sunday", value: "Sunday" },
	];


	/*
	|--------------------------------------------------------------------------
	| 4. RENDER METHOD (JSX)
	|--------------------------------------------------------------------------
	*/
	return (
		<PageLayout>
			<form onSubmit={handleSubmit(onSubmit)}>
				{/* Header and Actions */}
				<div className={styles.header}>
					<h1>Caregiver Profile: Add New Caregiver</h1>
					<div className={styles.buttons}>
						<Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
						<Button variant="primary" type="submit" disabled={isCaregiverActionPending}>
							{isCaregiverActionPending ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>

				{caregiverActionError && <ActionMessage variant="error" message={caregiverActionError} />}

				<div className={styles.content}>
					{/* Form Fields Panel (Right) */}
					<div className={styles.rightPanel} style={{ width: '100%' }} >
						{/* General Info & Contact */}
						<Card>
							<CardHeader>General and Contact Information</CardHeader>
							<CardContent>
								<InputField label="Employee ID" name="employeeId" register={register} error={errors.employeeId} />
								<div className={styles.row2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.row2}>
									<InputField label="Email" name="email" register={register} error={errors.email} />
									<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
								</div>

								<div className={styles.row2}>
									<InputField label="Date of Birth" name="dateOfBirth" register={register} control={control} error={errors.dateOfBirth} type="date" />
									<InputField label="Region" name="region" type="select" register={register} error={errors.region}
										options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
									/>
								</div>

								<div className={styles.row2}>
									<InputField label="Password" name="password" type="password" register={register} error={errors.password} />
									<InputField label="Confirm Password" name="confirmPassword" type="password" register={register} error={errors.confirmPassword} />
								</div>

								{/* Address */}
								<AddressAutocomplete
									label="Search Address"
									onAddressSelect={handleAddressSelect}
									placeholder="Start typing to search for an address..."
									id="caregiver-address-autocomplete"
								/>
								<div className={styles.row2}>
									<InputField label="Street" name="street" register={register} error={errors.street} />
									<InputField label="City" name="city" register={register} error={errors.city} />
								</div>
								<div className={styles.row2}>
									<InputField label="Province" name="state" register={register} error={errors.state} />
									<InputField label="Country" name="country" register={register} error={errors.country} />
									<InputField label="Postal Code" name="pinCode" register={register} error={errors.pinCode} />
								</div>
							</CardContent>
						</Card>

						{/* Emergency Contact */}
						<Card>
							<CardHeader>Emergency Contact</CardHeader>
							<CardContent className={styles.cardContent}>
								<div className={styles.row2}>
									<InputField label="First Name" name="emergencyFName" register={register} error={errors.emergencyFName} />
									<InputField label="Last Name" name="emergencyLName" register={register} error={errors.emergencyLName} />
								</div>
								<div className={styles.row2}>
									<InputField label="Phone" name="emergencyPhone" type="phone" register={register} error={errors.emergencyPhone} />
									<InputField label="Relationship" name="emergencyRelationship" register={register} error={errors.emergencyRelationship} />
								</div>
							</CardContent>
						</Card>

						{/* Availability (Dynamic Array) */}
						<Card>
							<CardHeader>Availability Schedule</CardHeader>
							<CardContent>
								<div className={styles.fieldArrayContainer}>
									{availabilityFields.map((field, index) => (
										<div key={field.id} className={styles.fieldArrayItem}>
											<div>Slot {index + 1}</div>
											<div className={styles.time}>
												{/* Day Select Field */}
												<InputField
													label="Day"
													name={`availability.${index}.day`}
													type="select"
													register={register}
													error={errors.availability?.[index]?.day}
													options={dayOptions}
												/>
												{/* Start Time Input */}
												<InputField
													label="Start Time"
													name={`availability.${index}.startTime`}
													register={register}
													error={errors.availability?.[index]?.startTime}
													type="time"
												/>
												{/* End Time Input */}
												<InputField
													label="End Time"
													name={`availability.${index}.endTime`}
													register={register}
													error={errors.availability?.[index]?.endTime}
													type="time"
												/>
												{/* Notes Input */}
												<InputField
													label="Notes (Optional)"
													name={`availability.${index}.notes`}
													register={register}
													error={errors.availability?.[index]?.notes}
													type="textarea"
													rows={1}
												/>
												{/* Remove Button - DISABLED REMOVED */}
												<Button
													variant="danger"
													size="sm"
													icon={<Trash2 size={16} />}
													onClick={() => removeAvailability(index)}
													className={styles.removeButton}
													type="button"
												>
													Remove
												</Button>
											</div>
											{/* Hidden isAvailable field */}
											<input
												type="hidden"
												{...register(`availability.${index}.isAvailable`)}
												defaultValue={true}
											/>
										</div>
									))}

									{/* Add Button */}
									<Button
										variant="secondary"
										icon={<Plus size={16} />}
										onClick={() => appendAvailability(emptyAvailabilityTemplate)}
										className={styles.addButton}
										type="button"
									>
										Add Another Slot
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</form>
		</PageLayout>
	);
}