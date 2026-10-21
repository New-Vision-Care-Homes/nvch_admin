"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PageLayout from "@components/layout/PageLayout";
import PageHeader from "@components/layout/PageHeader";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Form/Card";
import Button from "@components/UI/Button/Button";
import styles from "./add_new_admin.module.css";
import { useRouter } from "next/navigation";
import { useAdmins } from "@/hooks/useAdmins";
import ActionMessage from "@/components/UI/Feedback/ActionMessage";
import { usePermissionGroups } from "@/hooks/usePermissions";
import RegionCheckboxGroup from "@/components/UI/Form/RegionCheckboxGroup";
import { REGION_OPTIONS } from "@/utils/dropdownList/region";
import { ADMIN_LEVEL_OPTIONS, DIRECT_LEADER_SLOTS_BY_LEVEL, DIRECT_LEADER_FIELD_LABELS } from "@/utils/dropdownList/adminLevel";
import { DEPARTMENT_OPTIONS } from "@/utils/dropdownList/department";
import { IdRule, nameRule, emailRule, phoneRule, passwordRule, dateRule } from "@/utils/validation";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import DirectLeaderField from "../_components/DirectLeaderField";

const TIMEZONE_OPTIONS = [
	{ label: "Newfoundland Time (America/St_Johns)", value: "America/St_Johns" },
	{ label: "Atlantic Time (America/Halifax)", value: "America/Halifax" },
	{ label: "Eastern Time (America/Toronto)", value: "America/Toronto" },
	{ label: "Central Time (America/Winnipeg)", value: "America/Winnipeg" },
	{ label: "Central Standard Time - Saskatchewan (America/Regina)", value: "America/Regina" },
	{ label: "Mountain Time (America/Edmonton)", value: "America/Edmonton" },
	{ label: "Pacific Time (America/Vancouver)", value: "America/Vancouver" },
];

// Levels whose two slots (supervisor, manager) need at least one filled,
// rather than one specific slot being independently required.
const EITHER_OR_LEVELS = ["team_lead", "office_admin", "payroll"];

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
	// Direct Leader requirements per level: team_lead/office_admin/payroll need
	// at least one of supervisor+manager; supervisor needs manager; manager
	// needs administrator; administrator/super render no fields at all.
	// Deliberately does NOT account for the backend's "no leader available
	// yet" waiver (the requirement lifts once no eligible admin exists for a
	// slot) — that's backend-state-dependent and replicating it here risks
	// blocking valid saves; rely on the backend's DIRECT_LEADER_REQUIRED
	// error in that edge case instead.
	directLeaderSupervisor: yup.string().nullable().optional()
		.test("direct-leader-supervisor-or-manager", function (value) {
			const { adminLevel, directLeaderManager } = this.parent;
			if (EITHER_OR_LEVELS.includes(adminLevel) && !value && !directLeaderManager) {
				return this.createError({ message: "Please choose at least one direct leader" });
			}
			return true;
		}),
	directLeaderManager: yup.string().nullable().optional()
		.test("direct-leader-manager-required", function (value) {
			const { adminLevel, directLeaderSupervisor } = this.parent;
			if (EITHER_OR_LEVELS.includes(adminLevel) && !value && !directLeaderSupervisor) {
				return this.createError({ message: "Please choose at least one direct leader" });
			}
			if (adminLevel === "supervisor" && !value) {
				return this.createError({ message: "Manager is required" });
			}
			return true;
		}),
	directLeaderAdministrator: yup.string().nullable()
		.when("adminLevel", {
			is: "manager",
			then: (s) => s.required("Administrator is required"),
			otherwise: (s) => s.optional(),
		}),
});

// Maps a Direct Leader slot name to the flat form field that holds it —
// react-hook-form fields here are flat (matching this codebase's convention
// of nesting only when the API payload is assembled in onSubmit).
const SLOT_FORM_FIELD = {
	supervisor: "directLeaderSupervisor",
	manager: "directLeaderManager",
	administrator: "directLeaderAdministrator",
};

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
			setValue("permissionsGroup", Array.from(next), { shouldValidate: true, shouldDirty: true });

			return next;
		});
	};

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isDirty },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			permissionsGroup: [], // Initialize array so Yup can validate it properly
			regions: [], // Initialize array so Yup can validate it properly
			timezone: "America/Halifax",
			directLeaderSupervisor: "",
			directLeaderManager: "",
			directLeaderAdministrator: "",
		}
	});

	const { setIsDirty } = useRouteDirty();
	useEffect(() => {
		setIsDirty(isDirty);
	}, [isDirty, setIsDirty]);

	const selectedRegions = watch("regions") || [];
	const selectedAdminLevel = watch("adminLevel");
	const directLeaderSlots = DIRECT_LEADER_SLOTS_BY_LEVEL[selectedAdminLevel] || [];

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
			directLeaders: {
				supervisor: directLeaderSlots.includes("supervisor") ? (data.directLeaderSupervisor || null) : null,
				manager: directLeaderSlots.includes("manager") ? (data.directLeaderManager || null) : null,
				administrator: directLeaderSlots.includes("administrator") ? (data.directLeaderAdministrator || null) : null,
			},
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
				<PageHeader
					title="Add New Admin"
					actions={
						<>
							<Button variant="secondary" onClick={() => router.push("/admins")} type="button">Cancel</Button>
							<Button variant="primary" type="submit" disabled={isActionPending}>
								{isActionPending ? "Saving..." : "Save"}
							</Button>
						</>
					}
				/>

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
										onChange={(next) => setValue("regions", next, { shouldValidate: true, shouldDirty: true })}
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

						{/* Direct Leaders — only the slots this admin level has */}
						{directLeaderSlots.length > 0 && (
							<Card>
								<CardHeader>Direct Leaders</CardHeader>
								<CardContent>
									{directLeaderSlots.length > 1 && (
										<p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
											Choose at least one Direct Leader <span style={{ color: '#E53E3E', fontWeight: 700, fontSize: '0.85rem' }}>*</span>
										</p>
									)}
									<div className={styles.row2}>
										{directLeaderSlots.map((slot) => (
											<DirectLeaderField
												key={slot}
												label={DIRECT_LEADER_FIELD_LABELS[selectedAdminLevel]?.[slot] ?? slot}
												name={SLOT_FORM_FIELD[slot]}
												control={control}
												error={errors[SLOT_FORM_FIELD[slot]]}
												slot={slot}
												adminLevel={selectedAdminLevel}
												required={directLeaderSlots.length === 1}
											/>
										))}
									</div>
								</CardContent>
							</Card>
						)}

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
