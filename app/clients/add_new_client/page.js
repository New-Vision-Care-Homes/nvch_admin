"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_client.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";
import {
	nameRule,
	emailRule,
	phoneRule,
	addressRule,
	shortTextRule,
	longTextRule,
	dateRule,
} from "@app/validation"; 


const schema = yup.object({
	clientId: shortTextRule.required("Client ID is required"),
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule,
	phone: phoneRule,
	address: addressRule,
	gender: shortTextRule.required("Gender is required"),
	birth: dateRule,
	notes: longTextRule,
	emergencyFName: nameRule.optional(),
	emergencyLName: nameRule.optional(),
	relationship: shortTextRule.optional(),
	emergencyPhone: phoneRule.optional(),
	sdmFName: nameRule.optional(),
	sdmLName: nameRule.optional(),
	sdmPhone: phoneRule.optional(),
	sdmEmail: emailRule.optional(),
});

export default function Page() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
	});

	const onSubmit = async (data) => {
		setLoading(true);
		console.log("✅ Submitted data:", data);

		await new Promise((r) => setTimeout(r, 1000));

		setLoading(false);
		router.push("/clients");
	};

	function handleCancel() {
		router.push("/clients");
	}

	return (
		<PageLayout>
			{/* Header */}
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
				<div className={styles.leftPanel}>
					<div className={styles.imageWrapper}>
						{watch("picture")?.[0] ? (
							<Image
								src={URL.createObjectURL(watch("picture")[0])}
								alt="Client Picture"
								width={150}
								height={150}
								className={styles.image}
							/>
							) : (
							<div className={styles.imagePlaceholder}>
								<span>Image Placeholder</span>
							</div>
						)}
					</div>
					<label className={styles.editButton}>
						Upload
						<input
							type="file"
							accept="image/*"
							{...register("picture")}
							className={styles.hiddenInput}
						/>
					</label>
				</div>

				<div className={styles.rightPanel}>
					<Card>
						<CardContent>					
							{/* Personal Info */}
							<InputField label="Client ID" name="clientId" register={register} error={errors.clientId} />
							<div className={styles.row2}>
								<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
								<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
							</div>
							<div className={styles.row2}>
								<InputField label="Date of Birth" name="birth" register={register} error={errors.birth} />
								<InputField
									label="Gender"
									name="gender"
									type="select"
									register={register}
									error={errors.gender}
									options={[
										{ label: "Male", value: "male" },
										{ label: "Female", value: "female" },
										{ label: "Other", value: "other" },
									]}
								/>
							</div>
							<InputField label="Address" name="address" register={register} error={errors.address} />
							<div className={styles.row2}>
								<InputField label="Phone" name="phone" register={register} error={errors.phone} />
								<InputField label="Email" name="email" register={register} error={errors.email} />
							</div>
							<InputField label="Notes" name="notes" type="textarea" rows={4} register={register} error={errors.notes} />
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
								<InputField label="Relationship" name="relationship" register={register} error={errors.relationship} />
								<InputField label="Phone" name="emergencyPhone" register={register} error={errors.emergencyPhone} />
							</div>
						</CardContent>
					</Card>

					{/* SDM */}
					<Card>
						<CardHeader>Statutory Decision Maker (SDM)</CardHeader>
						<CardContent className={styles.cardContent}>
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
				</div>
			</div>
		</PageLayout>
	);
}
