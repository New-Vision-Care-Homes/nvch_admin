"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./info.module.css";
import { nameRule, emailRule, phoneRule, addressRule, dateRule } from "@app/validation";

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	gender: yup.string().required("Gender is required"),
	birth: dateRule,
	phone: phoneRule,
	email: emailRule,
	address: addressRule,
	emergencyFName: nameRule,
	emergencyLName: nameRule,
	emergencyPhone: phoneRule,
	relationship: yup.string().trim().max(50, "Relationship too long"),
	sdmFName: nameRule.required("SDM first name is required"),
	sdmLName: nameRule.required("SDM last name is required"),
	sdmPhone: phoneRule,
	sdmEmail: emailRule,
});

export default function Info() {
	const { register, handleSubmit, formState: { errors } } = useForm({
		resolver: yupResolver(schema),
	});

	const onSubmit = (data) => {
		alert("✅ Form submitted:", data);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<div className={styles.body}>
				<Card>
					<CardHeader>Basic Information</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
							<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Date of Birth" name="birth" register={register} error={errors.birth} />
							<InputField label="Gender" name="gender" type="select" register={register} error={errors.gender}   
								options={[
									{ label: "Male", value: "male" },
									{ label: "Female", value: "female" },
									{ label: "Other", value: "other" },
								]} />
						</div>
						<div className={styles.card_row_1}>
							<InputField label="Address" name="address" register={register} error={errors.address} />
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
			</div>

			<div className={styles.buttons}>
				<Button variant="secondary" onClick={() => console.log("Cancel")}>Cancel</Button>
				<Button type="submit" variant="primary">Save Changes</Button>
			</div>
		</form>
	);
}
