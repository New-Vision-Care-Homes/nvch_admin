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
import { useAdmins, useDirectLeaderOptions } from "@/hooks/useAdmins";
import { useProfile } from "@/hooks/useProfile";
import { canManageAdmin } from "@/utils/permissions";
import ErrorState from "@components/UI/Feedback/ErrorState";
import { useTabDirty } from "@/context/TabDirtyContext";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import tabStyles from "./tabPanel.module.css";
import styles from "./info.module.css";

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
	// Direct Leader requirements aren't expressed here — they depend on
	// canAssignDirectLeaders and on whether the picker actually has any
	// eligible admin ("no leader available yet" waiver), neither of which a
	// static yup schema can see. Checked manually in onSubmit instead.
	directLeaderSupervisor: yup.string().nullable().optional(),
	directLeaderManager: yup.string().nullable().optional(),
	directLeaderAdministrator: yup.string().nullable().optional(),
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

	const actingIsSuper = profile?.adminLevel === "super";
	// Editing from this admin-management page — including your own record —
	// requires super (or outranking the target); self-edit is NOT a bypass
	// here. A non-super admin edits their own limited info via the separate
	// Settings > Profile self-service page instead. Supers also bypass the
	// update_admin slug requirement itself (per the backend's "supers bypass
	// all slug checks" rule).
	const canEdit = canManageAdmin(profile, user) && (actingIsSuper || profile?.permissionSlugs?.includes("update_admin"));
	// Setting/changing/clearing a Direct Leader slot needs assign_direct_leaders
	// on top of the same rank+update_admin requirement as any other edit
	// (super bypasses). A form whose editor lacks this should leave
	// directLeaders out of the request entirely — not send it as unchanged —
	// so canAssignDirectLeaders also gates whether onSubmit includes it.
	const canAssignDirectLeaders = canEdit && (actingIsSuper || profile?.permissionSlugs?.includes("assign_direct_leaders"));

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

	// Changing the admin level always clears any in-progress Direct Leader
	// picks and makes the user choose again for the new level, rather than
	// silently carrying over a pick that may no longer be valid (or even
	// shown). Wired directly onto the Admin Level <select>'s onChange below,
	// not a useEffect watching selectedAdminLevel — reset() (on initial load
	// and on Cancel) also changes adminLevel back to its saved value without
	// ever firing the select's onChange, so hooking the DOM event itself is
	// the only way to catch "the user changed this" without also matching
	// reset-restored values.
	const clearDirectLeaderPicks = () => {
		setValue("directLeaderSupervisor", "", { shouldDirty: true });
		setValue("directLeaderManager", "", { shouldDirty: true });
		setValue("directLeaderAdministrator", "", { shouldDirty: true });
	};

	// Baseline (unfiltered) eligibility check per slot — shares a cache entry
	// with DirectLeaderField's own initial (pre-search) query for the same
	// params, so this doesn't cost an extra request. Only used to implement
	// the backend's "no leader available yet" waiver in onSubmit below, so
	// only enabled while actually editing (not on every view of this tab) and
	// only when the user can edit these fields at all.
	const supervisorOptions = useDirectLeaderOptions({
		adminLevel: selectedAdminLevel,
		slot: "supervisor",
		excludeId: id,
		enabled: isEditing && canAssignDirectLeaders && directLeaderSlots.includes("supervisor"),
	});
	const managerOptions = useDirectLeaderOptions({
		adminLevel: selectedAdminLevel,
		slot: "manager",
		excludeId: id,
		enabled: isEditing && canAssignDirectLeaders && directLeaderSlots.includes("manager"),
	});
	const administratorOptions = useDirectLeaderOptions({
		adminLevel: selectedAdminLevel,
		slot: "administrator",
		excludeId: id,
		enabled: isEditing && canAssignDirectLeaders && directLeaderSlots.includes("administrator"),
	});
	// True unless a query has settled, for the current params, with a
	// confirmed-empty result. isFetching (not isLoading) covers both the
	// initial fetch and a background refetch after adminLevel changes —
	// placeholderData keeps the previous level's items/isLoading looking
	// "settled" while that refetch is in flight, which isLoading alone
	// wouldn't catch. A fetch error also counts as "unknown", not "empty".
	const hasEligible = {
		supervisor: supervisorOptions.isFetching || !!supervisorOptions.error || supervisorOptions.items.length > 0,
		manager: managerOptions.isFetching || !!managerOptions.error || managerOptions.items.length > 0,
		administrator: administratorOptions.isFetching || !!administratorOptions.error || administratorOptions.items.length > 0,
	};

	useEffect(() => {
		if (user && !isInitialized) {
			reset(cleanFetchedData(user));
			setIsInitialized(true);
		}
	}, [user, isInitialized, reset]);

	const onSubmit = (data) => {
		const applicableSlots = DIRECT_LEADER_SLOTS_BY_LEVEL[data.adminLevel] || [];

		// Only enforce this when the user can actually edit these fields — a
		// read-only admin whose level happens to need a Direct Leader they
		// never see shouldn't be blocked from saving anything else. And only
		// when at least one eligible admin exists for one of the slots — the
		// backend's own "no leader available yet" waiver.
		if (canAssignDirectLeaders && applicableSlots.length > 0) {
			const anyFilled = applicableSlots.some(slot => !!data[SLOT_FORM_FIELD[slot]]);
			const anyEligible = applicableSlots.some(slot => hasEligible[slot]);
			if (!anyFilled && anyEligible) {
				const message = applicableSlots.length === 1
					? `${DIRECT_LEADER_FIELD_LABELS[data.adminLevel]?.[applicableSlots[0]] ?? "A direct leader"} is required`
					: "Please choose at least one direct leader.";
				setStatus({ variant: "error", text: message });
				return;
			}
		}

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
										{!actingIsSuper ? (
											// Only a super admin may change an admin's level at all — show
											// it read-only for everyone else.
											<InfoField label="Admin Level">{ADMIN_LEVEL_LABEL[d.adminLevel] ?? d.adminLevel}</InfoField>
										) : (
											<InputField
												label="Admin Level"
												name="adminLevel"
												type="select"
												register={register}
												error={errors.adminLevel}
												// Super Admin is intentionally hidden from ADMIN_LEVEL_OPTIONS
												// (not assignable to someone who isn't already one) — but a
												// <select> bound to a value with no matching <option> shows
												// blank and silently resets the field, blocking saves on any
												// other field. So when the target IS currently a Super Admin,
												// add it back in just for this select, so the super-acting
												// editor sees a real option (and may change it if they choose).
												options={d.adminLevel === "super" ? [{ label: "Super Admin", value: "super" }, ...ADMIN_LEVEL_OPTIONS] : ADMIN_LEVEL_OPTIONS}
												required
												onChange={(e) => {
													// register(name)'s own onChange must still run — this prop
													// replaces it (InputField spreads {...rest} after
													// {...register(name)}), so the field's value would never
													// reach react-hook-form otherwise.
													register("adminLevel").onChange(e);
													clearDirectLeaderPicks();
												}}
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
