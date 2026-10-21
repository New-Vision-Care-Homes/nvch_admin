"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardContent, InfoField, InputField } from "@components/UI/Form/Card";
import Button from "@components/UI/Button/Button";
import ActionMessage from "@components/UI/Feedback/ActionMessage";
import { Edit, Save, X, Mail, Phone, Briefcase, Globe, Calendar, Network } from "lucide-react";
import { useParams } from "next/navigation";
import { IdRule, nameRule, emailRule, phoneRule, dateRule } from "@/utils/validation";
import { formatDateOnly, toDateInput } from "@/utils/dates";
import { getLabel } from "@/utils/formatting";
import { REGION_OPTIONS } from "@/utils/dropdownList/region";
import { DEPARTMENT_OPTIONS } from "@/utils/dropdownList/department";
import { ADMIN_LEVEL_LABEL, ADMIN_LEVEL_OPTIONS, DIRECT_LEADER_SLOTS_BY_LEVEL, DIRECT_LEADER_FIELD_LABELS } from "@/utils/dropdownList/adminLevel";
import RegionCheckboxGroup from "@components/UI/Form/RegionCheckboxGroup";
import DirectLeaderField from "../../_components/DirectLeaderField";
import { useAdmins } from "@/hooks/useAdmins";
import { useProfile } from "@/hooks/useProfile";
import ErrorState from "@components/UI/Feedback/ErrorState";
import { useTabDirty } from "@/context/TabDirtyContext";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import tabStyles from "./tabPanel.module.css";
import styles from "./info.module.css";

// Levels whose two slots (supervisor, manager) need at least one filled,
// rather than one specific slot being independently required.
const EITHER_OR_LEVELS = ["team_lead", "office_admin", "payroll"];

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.required("Email is required"),
	phone: phoneRule,
	adminLevel: yup.string().required("Admin level is required"),
	department: yup.string().required("Department is required"),
	regions: yup
		.array()
		.of(yup.string().oneOf(REGION_OPTIONS.map(o => o.value), "Please select a valid region"))
		.min(1, "Please select at least one region")
		.required("Please select at least one region"),
	adminId: IdRule.required("Admin ID is required"),
	employeeStartDate: dateRule,
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

const cleanFetchedData = (user) => ({
	firstName: user?.firstName || "",
	lastName: user?.lastName || "",
	email: user?.email || "",
	phone: user?.phone || "",
	adminLevel: user?.adminLevel || "",
	department: user?.department || "",
	regions: Array.isArray(user?.regions) && user.regions.length > 0 ? user.regions : (user?.region ? [user.region] : []),
	adminId: user?.employeeId || "",
	employeeStartDate: toDateInput(user?.employeeStartDate),
	directLeaderSupervisor: user?.directLeaders?.supervisor || "",
	directLeaderManager: user?.directLeaders?.manager || "",
	directLeaderAdministrator: user?.directLeaders?.administrator || "",
});

// The update endpoint replaces the whole admin record, so saving the Info
// tab must carry the permission groups through unchanged rather than wiping
// them — same reasoning as the Permissions tab preserving these fields.
const groupIdsOf = (pg) => {
	const ids = [];
	if (Array.isArray(pg)) {
		pg.forEach(p => ids.push(typeof p === "string" ? p : p._id));
	} else if (pg) {
		ids.push(typeof pg === "string" ? pg : pg._id);
	}
	return ids;
};

export default function Info() {
	const { id } = useParams();
	const { adminDetail: user, updateAdmin, isLoading, fetchError, isActionPending } = useAdmins({ adminId: id });
	const { profile } = useProfile();

	// The backend rejects update on a super admin unless the requester is a
	// super admin, regardless of slugs (assertCanManageUser).
	const actingIsSuper = profile?.adminLevel === "super";
	const canTouchTarget = actingIsSuper || user?.adminLevel !== "super";
	const canEdit = canTouchTarget && profile?.permissionSlugs?.includes("update_admin");
	// Setting/changing/clearing a Direct Leader slot needs assign_direct_leaders
	// on top of update_admin (super bypasses). A form whose editor lacks this
	// should leave directLeaders out of the request entirely — not send it as
	// unchanged — so canAssignDirectLeaders also gates whether onSubmit includes it.
	const canAssignDirectLeaders = actingIsSuper || profile?.permissionSlugs?.includes("assign_direct_leaders");

	const [isEditing, setIsEditing] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [status, setStatus] = useState(null);

	const { register, control, handleSubmit, setValue, watch, formState: { errors, isDirty }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	const { setIsDirty: setTabIsDirty } = useTabDirty();
	const { setIsDirty: setRouteIsDirty } = useRouteDirty();
	useEffect(() => {
		setTabIsDirty(isDirty);
		setRouteIsDirty(isDirty);
	}, [isDirty, setTabIsDirty, setRouteIsDirty]);

	const selectedRegions = watch("regions") || [];
	// Reflects the admin level even when its <select> isn't rendered (read-only
	// cases) — watch() reads from RHF's retained values, not just mounted inputs.
	const selectedAdminLevel = watch("adminLevel");
	const directLeaderSlots = DIRECT_LEADER_SLOTS_BY_LEVEL[selectedAdminLevel] || [];

	useEffect(() => {
		if (user && !isInitialized) {
			reset(cleanFetchedData(user));
			setIsInitialized(true);
		}
	}, [user, isInitialized, reset]);

	const onSubmit = (data) => {
		const body = {
			employeeId: data.adminId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			adminLevel: data.adminLevel,
			department: data.department,
			regions: data.regions,
			employeeStartDate: data.employeeStartDate,
			permissionsGroup: groupIdsOf(user?.permissionsGroup),
		};

		if (canAssignDirectLeaders) {
			const applicableSlots = DIRECT_LEADER_SLOTS_BY_LEVEL[data.adminLevel] || [];
			body.directLeaders = {
				supervisor: applicableSlots.includes("supervisor") ? (data.directLeaderSupervisor || null) : null,
				manager: applicableSlots.includes("manager") ? (data.directLeaderManager || null) : null,
				administrator: applicableSlots.includes("administrator") ? (data.directLeaderAdministrator || null) : null,
			};
		}

		updateAdmin({ id, data: body }, {
			onSuccess: () => {
				setStatus({ variant: "success", text: "Admin updated successfully!" });
				reset(data);
				setIsEditing(false);
			},
			onError: (err) => {
				const errData = err?.response?.data;
				const msg = Array.isArray(errData?.details) && errData.details.length > 0
					? errData.details.map(d => d.msg || d).filter(Boolean).join("; ")
					: (errData?.error || errData?.message || "An unexpected error occurred");
				setStatus({ variant: "error", text: msg });
			},
		});
	};

	const handleCancel = () => {
		reset(cleanFetchedData(user));
		setStatus(null);
		setIsEditing(false);
	};

	if (isLoading || fetchError) {
		return <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={() => window.location.reload()} />;
	}

	const d = user || {};
	const regionList = Array.isArray(d.regions) && d.regions.length > 0 ? d.regions : (d.region ? [d.region] : []);

	const rows = [
		{ key: "email", icon: Mail, label: "Email", value: d.email },
		{ key: "phone", icon: Phone, label: "Phone", value: d.phone },
		{ key: "department", icon: Briefcase, label: "Department", value: d.department },
		{ key: "regions", icon: Globe, label: "Regions", value: regionList.length ? regionList.map(r => getLabel(REGION_OPTIONS, r)).join(", ") : null },
		{ key: "employeeStartDate", icon: Calendar, label: "Employee Start Date", value: d.employeeStartDate ? formatDateOnly(d.employeeStartDate) : null },
		...directLeaderSlots.map((slot) => {
			const info = d.directLeadersInfo?.[slot];
			return {
				key: `directLeader_${slot}`,
				icon: Network,
				label: DIRECT_LEADER_FIELD_LABELS[selectedAdminLevel]?.[slot] ?? slot,
				value: info ? `${info.firstName} ${info.lastName}` : null,
			};
		}),
	];

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<ActionMessage variant={status?.variant} message={status?.text} />

			{canEdit && (
				<div className={tabStyles.top_bar}>
					{!isEditing ? (
						<Button variant="primary" icon={<Edit size={16} />} onClick={() => setIsEditing(true)} type="button">
							Edit
						</Button>
					) : (
						<>
							<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} type="button" disabled={isActionPending}>
								Cancel
							</Button>
							<Button variant="primary" icon={<Save size={16} />} type="submit" disabled={!isDirty || isActionPending}>
								{isActionPending ? "Saving..." : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			)}

			<div className={tabStyles.body}>
				<Card>
					<CardContent>
						{!isEditing ? (
							<>
								<div className={styles.name_display}>
									<div className={styles.name_text}>{d.firstName} {d.lastName}</div>
									{d.adminLevel && (
										<span className={styles.name_badge}>{ADMIN_LEVEL_LABEL[d.adminLevel] ?? d.adminLevel}</span>
									)}
								</div>

								<div className={styles.contact_list}>
									{rows.map(({ key, icon: Icon, label, value }) => (
										<div key={key} className={styles.contact_row}>
											<div className={styles.contact_icon_wrap}><Icon size={16} /></div>
											<div className={styles.contact_detail}>
												<div className={styles.contact_label}>{label}</div>
												<div className={value ? styles.contact_value : styles.contact_value_empty}>{value || "Not provided"}</div>
											</div>
										</div>
									))}
								</div>
							</>
						) : (
							<>
								<div className={styles.card_row_2}>
									<InputField label="Admin ID" name="adminId" register={register} error={errors.adminId} />
									<div style={{ flex: 1 }}></div>
								</div>
								<div className={styles.card_row_2}>
									<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
									<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
								</div>
								<div className={styles.card_row_2}>
									<InputField label="Email" name="email" register={register} error={errors.email} />
									<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
								</div>
								<div className={styles.card_row_2}>
									<div style={{ flex: 1 }}>
										{(d.adminLevel === "super" || !actingIsSuper) ? (
											// Only a super admin may change an admin's level, and Super Admin
											// itself is intentionally hidden from ADMIN_LEVEL_OPTIONS (not
											// assignable via the UI) — a <select> bound to it would have no
											// matching <option> and silently reset the field to empty, blocking
											// saves on any other field. Show it read-only in both cases.
											<InfoField label="Admin Level">{ADMIN_LEVEL_LABEL[d.adminLevel] ?? d.adminLevel}</InfoField>
										) : (
											<InputField
												label="Admin Level"
												name="adminLevel"
												type="select"
												register={register}
												error={errors.adminLevel}
												options={ADMIN_LEVEL_OPTIONS}
												required
											/>
										)}
									</div>
									<div style={{ flex: 1 }}>
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
								</div>
								<div className={styles.card_row_2}>
									<InputField
										label="Employee Start Date"
										name="employeeStartDate"
										type="date"
										register={register}
										error={errors.employeeStartDate}
										required
									/>
									<div style={{ flex: 1 }} />
								</div>
								{directLeaderSlots.length > 1 && (
									<p className={styles.groupLabel}>
										Choose at least one Direct Leader<span className={styles.requiredMark}>*</span>
									</p>
								)}
								{directLeaderSlots.length > 0 && (
									<div className={styles.card_row_2}>
										{directLeaderSlots.map((slot) => {
											const info = d.directLeadersInfo?.[slot];
											return (
												<div key={slot} style={{ flex: 1 }}>
													<DirectLeaderField
														label={DIRECT_LEADER_FIELD_LABELS[selectedAdminLevel]?.[slot] ?? slot}
														name={SLOT_FORM_FIELD[slot]}
														control={control}
														error={errors[SLOT_FORM_FIELD[slot]]}
														slot={slot}
														adminLevel={selectedAdminLevel}
														excludeId={id}
														fallbackDisplayName={info ? `${info.firstName} ${info.lastName}` : ""}
														readOnly={!canAssignDirectLeaders}
														required={directLeaderSlots.length === 1}
													/>
												</div>
											);
										})}
										{directLeaderSlots.length === 1 && <div style={{ flex: 1 }} />}
									</div>
								)}
								<div style={{ marginBottom: "1rem" }}>
									<RegionCheckboxGroup
										label="Regions"
										required
										value={selectedRegions}
										onChange={(next) => setValue("regions", next, { shouldValidate: true, shouldDirty: true })}
										error={errors.regions}
									/>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</form>
	);
}
