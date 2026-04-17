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
import { usePermissionGroups } from "@/hooks/usePermissions";

import { idRule, nameRule, emailRule, phoneRule, passwordRule } from "@/utils/validation";

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
	adminId: idRule,
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
	permissionsGroup: yup
		.array()
		.min(1, "Please select at least one permission group")
		.required("Please select at least one permission group"),
});

export default function Page() {
	const router = useRouter();
	const { addAdmin, isActionPending, actionError } = useAdmins();
	const { permissionGroups } = usePermissionGroups();

	// selectedGroupIds: Set of permission group _ids the admin will be assigned
	const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());

	const toggleGroup = (groupId) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);

			// Sync with react-hook-form so Yup validates it inline
			setValue("permissionsGroup", Array.from(next), { shouldValidate: true });

			return next;
		});
	};

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			permissionsGroup: [], // Initialize array so Yup can validate it properly
		}
	});

	const onSubmit = (data) => {
		// If 1 group: send string. If >1: send array of strings. 
		// We'll pass the array for multiple, and single string for one, as the backend requested.
		const permissionsGroup = data.permissionsGroup.length === 1 ? data.permissionsGroup[0] : data.permissionsGroup;

		const body = {
			employeeId: data.adminId,
			email: data.email,
			password: data.password,
			region: data.region,
			firstName: data.firstName,
			lastName: data.lastName,
			role: "admin",
			phone: data.phone,
			adminLevel: data.adminLevel,
			department: data.department,
			permissionsGroup,
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
									<InputField label="Admin ID" name="adminId" register={register} error={errors.adminId} />
									<InputField label="Region" name="region" type="select" register={register} error={errors.region}
										options={[{ label: "Central", value: "Central" }, { label: "Windsor", value: "Windsor" }, { label: "HRM", value: "HRM" }, { label: "Yarmouth", value: "Yarmouth" }, { label: "Shelburne", value: "Shelburne" }, { label: "South Shore", value: "South Shore" }]}
									/>
								</div>
								<div className={styles.row2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.row2}>
									<InputField label="Email" name="email" register={register} error={errors.email} />
									<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
								</div>
								<div className={styles.row2}>
									<InputField label="Password" name="password" register={register} error={errors.password} type="password" />
									<InputField label="Confirm Password" name="confirmPassword" register={register} error={errors.confirmPassword} type="password" />
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
							<CardHeader>Permission Groups</CardHeader>
							<CardContent>
								{permissionGroups.length === 0 ? (
									<p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
										No permission groups found.
									</p>
								) : (
									<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
										{permissionGroups.map(group => {
											const isChecked = selectedGroupIds.has(group._id);
											const groupSlugs = group.permissions || [];

											return (
												<div key={group._id} style={{
													border: `1px solid ${isChecked ? '#3b82f6' : 'var(--border-primary)'}`,
													borderRadius: '8px',
													padding: '1rem',
													background: isChecked ? '#eff6ff' : '#fafafa',
													transition: 'background 0.15s, border-color 0.15s',
												}}>
													{/* Group name as checkbox title */}
													<label className="checkboxLabel" style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex' }}>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={() => toggleGroup(group._id)}
														/>
														{group.name}
													</label>
													{/* Read-only slug tags showing what permissions this group has */}
													{groupSlugs.length > 0 && (
														<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '1.75rem' }}>
															{groupSlugs.map(slug => (
																<span key={slug} style={{
																	display: 'inline-block',
																	background: isChecked ? '#dbeafe' : '#e5e7eb',
																	color: isChecked ? '#1d4ed8' : '#374151',
																	padding: '2px 8px',
																	borderRadius: '4px',
																	fontSize: '0.78rem',
																	fontWeight: '500',
																	transition: 'background 0.15s, color 0.15s',
																}}>
																	{slug}
																</span>
															))}
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}

								{errors.permissionsGroup && (
									<p style={{ color: "#b91c1c", fontSize: "0.85rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
										{errors.permissionsGroup.message}
									</p>
								)}
							</CardContent>
						</Card>

					</div>
				</div>
			</form>
		</PageLayout>
	);
}
