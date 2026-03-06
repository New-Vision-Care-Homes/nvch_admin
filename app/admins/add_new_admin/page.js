"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_admin.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UploadCloud } from "lucide-react";

// Importing custom validation rules
import { IdRule, nameRule, emailRule, phoneRule, shortTextRule, birthRule, longTextRule, dateRuleOptional, pinRule, dateRule } from "@app/validation";


/*
|--------------------------------------------------------------------------
| 1. YUP VALIDATION SCHEMAS
|--------------------------------------------------------------------------
| A simplified schema tailored for typical Admin registration.
*/

const schema = yup.object({
	employeeId: IdRule.required("Employee ID is required"),
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.required("Email is required"),
	phone: phoneRule.required("Phone number is required"),
	dateOfBirth: birthRule.required("Date of Birth is required"),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),

	// Address Fields
	street: shortTextRule.required("Street is required"),
	city: shortTextRule.required("City is required"),
	state: shortTextRule.required("State/Province is required"),
	pinCode: pinRule,
	country: shortTextRule.required("Country is required"),

	// Emergency Contact fields
	emergencyLName: nameRule.required("Emergency Contact Name is required"),
	emergencyFName: nameRule.required("Emergency Contact Name is required"),
	emergencyPhone: phoneRule.required("Emergency Contact Phone is required"),
	emergencyRelationship: shortTextRule.required("Emergency Contact Relationship is required"),

	// Optional Picture
	picture: yup.mixed().optional(),
});


export default function Page() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState(null);

	const { register, handleSubmit, formState: { errors } } = useForm({
		resolver: yupResolver(schema),
	});

	/*
	|--------------------------------------------------------------------------
	| 3. FORM SUBMISSION LOGIC
	|--------------------------------------------------------------------------
	| Processes data and submits to the API.
	*/
	const onSubmit = async (data) => {
		setLoading(true);
		console.log("DEBUG: onSubmit function triggered");

		// Construct the Admin Registration Body
		const body = {
			email: data.email,
			password: "SecurePass123!",
			firstName: data.firstName,
			lastName: data.lastName,
			role: "admin", // Explicitly set role to admin
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
					"latitude": 44.6488,
					"longitude": -63.5752
				},
			},

			emergencyContact: {
				name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
				phone: data.emergencyPhone,
				relationship: data.emergencyRelationship,
			},
		};

		// API Submission Logic
		try {
			const token = localStorage.getItem("token");
			console.log("Submitting Admin Body: ", body);

			const res = await fetch("https://nvch-server.onrender.com/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(body)
			});

			let resData = {};
			try { resData = await res.json(); } catch (e) { }

			if (res.ok) {
				router.push("/admins");
			} else {
				let errorMessageToDisplay = `Failed to register admin (Status ${res.status}).`;
				if (resData.error) {
					errorMessageToDisplay = resData.error;
				} else if (resData.message) {
					errorMessageToDisplay = resData.message;
				} else if (res.status === 400 && resData.details) {
					const detailMessages = resData.details.map(detail => {
						const path = detail.path ? `(${detail.path})` : '';
						return `${detail.msg} ${path}`;
					});
					errorMessageToDisplay = detailMessages.join(' | ');
				}
				if (res.status === 401 || res.status === 403) {
					if (!resData.error && !resData.message) {
						errorMessageToDisplay = "Authentication failed. Please log in again.";
					}
				}

				setErrorMsg(errorMessageToDisplay);
			}
		} catch (err) {
			console.error("Caught critical error:", err);
			setErrorMsg("Could not connect to the server or received an invalid response.");
		} finally {
			setLoading(false);
		}
	};

	function handleCancel() {
		router.push("/admins");
	}

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
					<h1>Admin Profile: Add New Admin</h1>
					<div className={styles.buttons}>
						<Button variant="secondary" onClick={handleCancel} type="button">Cancel</Button>
						<Button variant="primary" type="submit" disabled={loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>

				<div className={styles.content}>
					{/* Form Fields Panel */}
					<div className={styles.rightPanel} style={{ width: '100%' }} >
						{/* General Info & Contact */}
						<Card>
							<CardHeader>General and Contact Information</CardHeader>
							<CardContent>
								{errorMsg !== null ? <div className={styles.formError}>Error: {errorMsg}</div> : null}

								<InputField label="Employee ID" name="employeeId" register={register} error={errors.employeeId} />
								<div className={styles.row2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.row2}>
									<InputField label="Email" name="email" register={register} error={errors.email} />
									<InputField label="Phone" name="phone" register={register} error={errors.phone} />
								</div>
								<div className={styles.row2}>
									<InputField label="Date of Birth" name="dateOfBirth" register={register} error={errors.dateOfBirth} type="date" />
									<InputField label="Region" name="region" type="select" register={register} error={errors.region}
										options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
									/>
								</div>
								{/* Address */}
								<div className={styles.row2}>
									<InputField label="Street" name="street" register={register} error={errors.street} />
									<InputField label="City" name="city" register={register} error={errors.city} />
								</div>
								<div className={styles.row2}>
									<InputField label="State" name="state" register={register} error={errors.state} />
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
									<InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
									<InputField label="Relationship" name="emergencyRelationship" register={register} error={errors.emergencyRelationship} />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</form>
		</PageLayout>
	);
}
