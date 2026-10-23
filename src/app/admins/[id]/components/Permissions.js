"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Card, CardHeader, CardContent } from "@components/UI/Form/Card";
import Button from "@components/UI/Button/Button";
import ActionMessage from "@components/UI/Feedback/ActionMessage";
import { AlertCircle, Edit, Save, Shield, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useAdmins } from "@/hooks/useAdmins";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";
import ErrorState from "@components/UI/Feedback/ErrorState";
import { useTabDirty } from "@/context/TabDirtyContext";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import tabStyles from "./tabPanel.module.css";
import styles from "./permissions.module.css";

const schema = yup.object({
	permissionsGroup: yup
		.array()
		.min(1, "Please select at least one permission group")
		.required("Please select at least one permission group"),
});

const groupIdsOf = (pg) => {
	const ids = new Set();
	if (Array.isArray(pg)) {
		pg.forEach(p => ids.add(typeof p === "string" ? p : p._id));
	} else if (pg) {
		ids.add(typeof pg === "string" ? pg : pg._id);
	}
	return ids;
};

export default function Permissions() {
	const { id } = useParams();
	const { adminDetail: user, updateAdmin, isLoading, fetchError, isActionPending } = useAdmins({ adminId: id });
	const { permissionGroups } = usePermissionGroups();
	const { profile } = useProfile();

	// permissionsGroup is a super-only field for admin targets (there's no
	// rank-based exception, and no self exception either — a non-super admin
	// can't grant themselves more access by editing their own groups), so
	// this tab's edit capability requires super specifically, not just rank.
	// No separate update_admin slug check — a super bypasses all slug checks
	// on the backend, so requiring it here could wrongly hide this tab for a
	// super whose profile doesn't happen to list that slug explicitly.
	const canEdit = profile?.adminLevel === "super";

	const [isEditing, setIsEditing] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
	const [status, setStatus] = useState(null);

	const { handleSubmit, setValue, formState: { errors, isDirty }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: { permissionsGroup: [] },
	});

	const { setIsDirty: setTabIsDirty } = useTabDirty();
	const { setIsDirty: setRouteIsDirty } = useRouteDirty();
	useEffect(() => {
		setTabIsDirty(isDirty);
		setRouteIsDirty(isDirty);
	}, [isDirty, setTabIsDirty, setRouteIsDirty]);

	useEffect(() => {
		if (user && !isInitialized) {
			const initialSelected = groupIdsOf(user.permissionsGroup);
			setSelectedGroupIds(initialSelected);
			reset({ permissionsGroup: Array.from(initialSelected) });
			setIsInitialized(true);
		}
	}, [user, isInitialized, reset]);

	const toggleGroup = (groupId) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			setValue("permissionsGroup", Array.from(next), { shouldValidate: true, shouldDirty: true });
			return next;
		});
	};

	// The update endpoint replaces the whole admin record, so saving here must
	// carry every other field through unchanged — only permissionsGroup
	// actually changes on this tab.
	const onSubmit = () => {
		if (!user) return;
		const body = {
			employeeId: user.employeeId,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			phone: user.phone,
			adminLevel: user.adminLevel,
			department: user.department,
			regions: Array.isArray(user.regions) && user.regions.length > 0 ? user.regions : (user.region ? [user.region] : []),
			employeeStartDate: user.employeeStartDate,
			permissionsGroup: Array.from(selectedGroupIds),
		};

		updateAdmin({ id, data: body }, {
			onSuccess: () => {
				setStatus({ variant: "success", text: "Permission groups updated successfully!" });
				setIsEditing(false);
			},
			onError: (err) => {
				const errData = err?.response?.data;
				const msg = Array.isArray(errData?.details) && errData.details.length > 0
					? errData.details.map(d => d.msg || d).filter(Boolean).join("; ")
					: (errData?.error || errData?.message || "Failed to update permission groups.");
				setStatus({ variant: "error", text: msg });
			},
		});
	};

	const handleCancel = () => {
		const initialSelected = groupIdsOf(user?.permissionsGroup);
		setSelectedGroupIds(initialSelected);
		reset({ permissionsGroup: Array.from(initialSelected) });
		setStatus(null);
		setIsEditing(false);
	};

	if (isLoading || fetchError) {
		return <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={() => window.location.reload()} />;
	}

	const assignedGroups = Array.from(selectedGroupIds)
		.map(gid => permissionGroups.find(g => g._id === gid))
		.filter(Boolean);

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
					<CardHeader>Permission Groups</CardHeader>
					<CardContent>
						{!isEditing ? (
							assignedGroups.length > 0 ? (
								<div className={styles.groupList}>
									{assignedGroups.map(group => {
										const groupSlugs = group.permissions || [];
										return (
											<div key={group._id} className={styles.groupRow}>
												<div className={styles.groupIconWrap}><Shield size={18} /></div>
												<div className={styles.groupInfo}>
													<div className={styles.groupName}>{group.name}</div>
													{groupSlugs.length > 0 && (
														<div className={styles.slugGrid}>
															{groupSlugs.map(slug => (
																<span key={slug} className={styles.slugPill}>{slug}</span>
															))}
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<p className={styles.emptyText}>No permission groups assigned.</p>
							)
						) : (
							<>
								<p className={styles.selectLabel}>
									Select Group<span className={styles.requiredMark}>*</span>
								</p>
								{permissionGroups.length === 0 ? (
									<p className={styles.emptyText}>No permission groups found.</p>
								) : (
									<div className={styles.editGroupList}>
										{permissionGroups.map(group => {
											const isChecked = selectedGroupIds.has(group._id);
											const groupSlugs = group.permissions || [];

											return (
												<div
													key={group._id}
													className={`${styles.editGroupCard} ${isChecked ? styles.editGroupCardActive : ""}`}
												>
													<label className={styles.editGroupHeader}>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={() => toggleGroup(group._id)}
														/>
														<span className={styles.editGroupIconWrap}><Shield size={15} /></span>
														{group.name}
													</label>
													{groupSlugs.length > 0 && (
														<div className={styles.editGroupSlugs}>
															{groupSlugs.map(slug => (
																<span
																	key={slug}
																	className={`${styles.editSlugPill} ${isChecked ? styles.editSlugPillActive : ""}`}
																>
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
									<p className={styles.errorText}>
										<AlertCircle size={16} />
										{errors.permissionsGroup.message}
									</p>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</form>
	);
}
