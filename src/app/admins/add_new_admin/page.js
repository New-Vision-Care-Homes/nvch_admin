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
import RegionCheckboxGroup from "@/components/UI/RegionCheckboxGroup";
import { REGION_OPTIONS, ADMIN_LEVEL_OPTIONS } from "@/utils/dropdown_list";
import { IdRule, nameRule, emailRule, phoneRule, passwordRule, dateRule } from "@/utils/validation";

const DEPARTMENT_OPTIONS = [
	{ label: "Operations", value: "Operations" },
	{ label: "Human Resources", value: "Human Resources" },
	{ label: "Finance", value: "Finance" },
	{ label: "IT", value: "IT" },
	{ label: "Administration", value: "Administration" },
];

const TIMEZONE_OPTIONS = [
	{ label: "Newfoundland Time (America/St_Johns)", value: "America/St_Johns" },
	{ label: "Atlantic Time (America/Halifax)", value: "America/Halifax" },
	{ label: "Eastern Time (America/Toronto)", value: "America/Toronto" },
	{ label: "Central Time (America/Winnipeg)", value: "America/Winnipeg" },
	{ label: "Central Standard Time - Saskatchewan (America/Regina)", value: "America/Regina" },
	{ label: "Mountain Time (America/Edmonton)", value: "America/Edmonton" },
	{ label: "Pacific Time (America/Vancouver)", value: "America/Vancouver" },
];

const schema = yup.object({
	adminId: IdRule.required("Admin ID is required"),
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
	regions: yup
		.array()
		.of(yup.string().oneOf(REGION_OPTIONS.map(o => o.value), "Please select a valid region"))
		.min(1, "Please select at least one region")
		.required("Please select at least one region"),
	timezone: yup.string().required("Timezone is required"),
	employeeStartDate: dateRule,
	permissionsGroup: yup
		.array()
		.min(1, "Please select at least one permission group")
		.required("Please select at least one permission group"),
});

export default function Page() {
	const router = useRouter();
	const { addAdmin, isActionPending, actionError } = useAdmins();
	const { permissionGroups, permissionGroupsFetchError } = usePermissionGroups();

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
		watch,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			permissionsGroup: [], // Initialize array so Yup can validate it properly
			regions: [], // Initialize array so Yup can validate it properly
			timezone: "America/Halifax",
		}
	});

	const selectedRegions = watch("regions") || [];

	const onSubmit = (data) => {
		const body = {
			employeeId: data.adminId,
			email: data.email,
			password: data.password,
			regions: data.regions,
			firstName: data.firstName,
			lastName: data.lastName,
			role: "admin",
			phone: data.phone,
			adminLevel: data.adminLevel,
			department: data.department,
			timezone: data.timezone,
			employeeStartDate: data.employeeStartDate,
			permissionsGroup: Array.isArray(data.permissionsGroup) ? data.permissionsGroup : [data.permissionsGroup].filter(Boolean),
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
									<InputField label="Admin ID" name="adminId" register={register} error={errors.adminId} required />
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} required />
								</div>
								<div className={styles.row2}>
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} required />
								</div>
								<div style={{ marginBottom: "1rem" }}>
									<RegionCheckboxGroup
										label="Regions"
										required
										value={selectedRegions}
										onChange={(next) => setValue("regions", next, { shouldValidate: true })}
										error={errors.regions}
									/>
								</div>
								<div className={styles.row2}>
									<InputField label="Email" name="email" register={register} error={errors.email} required />
									<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
								</div>
								<div className={styles.row2}>
									<InputField label="Password" name="password" register={register} error={errors.password} type="password" required />
									<InputField label="Confirm Password" name="confirmPassword" register={register} error={errors.confirmPassword} type="password" required />
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
										required
									/>
									<InputField
										label="Department"
										name="department"
										type="select"
										register={register}
										error={errors.department}
										options={DEPARTMENT_OPTIONS}
										required
									/>
								</div>
								<div className={styles.row2}>
									<InputField
										label="Employee Start Date"
										name="employeeStartDate"
										type="date"
										register={register}
										error={errors.employeeStartDate}
										required
									/>
									<InputField
										label="Timezone"
										name="timezone"
										type="select"
										register={register}
										error={errors.timezone}
										options={TIMEZONE_OPTIONS}
										required
									/>
								</div>
							</CardContent>
						</Card>

						{/* Permissions */}
						<Card>
							<CardHeader>Permission Groups</CardHeader>
							<CardContent>
								<p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
									Select Group <span style={{ color: '#E53E3E', fontWeight: 700, fontSize: '0.85rem' }}>*</span>
								</p>
								{permissionGroupsFetchError ? (
									/* Without view_permissions_groups the list request 403s — say so
									   instead of showing a dead-end empty picklist (a group is required). */
									<p style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
										Couldn&apos;t load permission groups: {permissionGroupsFetchError}.
										Creating an admin requires selecting a permission group — ask for the
										&quot;view permission groups&quot; permission if you don&apos;t have it.
									</p>
								) : permissionGroups.length === 0 ? (
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
