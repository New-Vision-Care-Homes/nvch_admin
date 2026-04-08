"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_admin.module.css";
import { useRouter } from "next/navigation";
import { useAdmins } from "@/hooks/useAdmins";
import ActionMessage from "@/components/UI/ActionMessage";

import { nameRule, emailRule, phoneRule, passwordRule } from "@/utils/validation";

const ADMIN_LEVEL_OPTIONS = [
	{ label: "Super Admin", value: "super" },
	{ label: "Supervisor", value: "supervisor" },
];

const DEPARTMENT_OPTIONS = [
	{ label: "Operations", value: "Operations" },
	{ label: "Human Resources", value: "Human Resources" },
	{ label: "Finance", value: "Finance" },
	{ label: "IT", value: "IT" },
	{ label: "Administration", value: "Administration" },
];

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.required("Email is required"),
	password: passwordRule.required("Password is required"),
	confirmPassword: yup
		.string()
		.required("Please confirm your password")
		.oneOf([yup.ref("password")], "Passwords do not match"),
	phone: phoneRule,
	adminLevel: yup.string().required("Admin level is required"),
	department: yup.string().required("Department is required"),
	region: yup
		.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),
});

export default function Page() {
	const router = useRouter();
	const { addAdmin, isActionPending, actionError } = useAdmins();

	// Checkboxes controlled manually
	const [canManageUsers, setCanManageUsers] = useState(false);
	const [canManageShifts, setCanManageShifts] = useState(false);
	const [canViewReports, setCanViewReports] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
	});

	const onSubmit = (data) => {
		const permissions = [];
		if (canManageUsers) permissions.push("manage_users");
		if (canManageShifts) permissions.push("manage_shifts");
		if (canViewReports) permissions.push("view_reports");

		const body = {
			email: data.email,
			password: data.password,
			region: data.region,
			firstName: data.firstName,
			lastName: data.lastName,
			role: "admin",
			phone: data.phone,
			adminLevel: data.adminLevel,
			permissions,
			department: data.department,
			canManageUsers,
			canManageShifts,
			canViewReports,
		};

		addAdmin(body, {
			onSuccess: () => {
				router.push("/admins");
			},
		});
	};

	return (
		<PageLayout>
			<form onSubmit={handleSubmit(onSubmit)}>
				{/* Header */}
				<div className={styles.header}>
					<h1>Add New Admin</h1>
					<div className={styles.buttons}>
						<Button variant="secondary" onClick={() => router.push("/admins")} type="button">Cancel</Button>
						<Button variant="primary" type="submit" disabled={isActionPending}>
							{isActionPending ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>

				{/* Action Error Banner */}
				{actionError && (
					<ActionMessage variant="error" message={actionError} />
				)}

				<div className={styles.content}>
					<div className={styles.rightPanel} style={{ width: "100%" }}>

						{/* Basic Info */}
						<Card>
							<CardHeader>Basic Information</CardHeader>
							<CardContent>
								<div className={styles.row2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.row2}>
									<InputField label="Email" name="email" register={register} error={errors.email} />
									<InputField label="Phone" name="phone" register={register} error={errors.phone} />
								</div>
								<div className={styles.row2}>
									<InputField label="Region" name="region" type="select" register={register} error={errors.region}
										options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
									/>
									<InputField label="Password" name="password" register={register} error={errors.password} type="password" />
								</div>
								<div className={styles.row2}>
									<InputField label="Confirm Password" name="confirmPassword" register={register} error={errors.confirmPassword} type="password" />
									<div style={{ flex: 1 }} /> {/* spacer to keep grid alignment */}
								</div>
							</CardContent>
						</Card>

						{/* Role & Department */}
						<Card>
							<CardHeader>Role &amp; Department</CardHeader>
							<CardContent>
								<div className={styles.row2}>
									<InputField
										label="Admin Level"
										name="adminLevel"
										type="select"
										register={register}
										error={errors.adminLevel}
										options={ADMIN_LEVEL_OPTIONS}
									/>
									<InputField
										label="Department"
										name="department"
										type="select"
										register={register}
										error={errors.department}
										options={DEPARTMENT_OPTIONS}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Permissions */}
						<Card>
							<CardHeader>Permissions</CardHeader>
							<CardContent>
								<div className="checkboxGroup">
									<label className="checkboxLabel">
										<input
											type="checkbox"
											checked={canManageUsers}
											onChange={() => setCanManageUsers(prev => !prev)}
										/>
										Manage Users
									</label>

									<label className="checkboxLabel">
										<input
											type="checkbox"
											checked={canManageShifts}
											onChange={() => setCanManageShifts(prev => !prev)}
										/>
										Manage Shifts
									</label>

									<label className="checkboxLabel">
										<input
											type="checkbox"
											checked={canViewReports}
											onChange={() => setCanViewReports(prev => !prev)}
										/>
										View Reports
									</label>
								</div>
							</CardContent>
						</Card>

					</div>
				</div>
			</form>
		</PageLayout>
	);
}
