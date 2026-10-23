"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import PageHeader from "@components/layout/PageHeader";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button/Button";
import { Card, CardHeader } from "@components/UI/Form/Card";
import styles from "./admin_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import { Activity, Calendar, Clock, Hash, Undo2, Upload } from "lucide-react";
import Modal from "@components/UI/Modal/Modal";
import InlineBanner from "@components/UI/Feedback/InlineBanner";
import StatusToggleConfirmModal from "@components/UI/Modal/StatusToggleConfirmModal";
import { useParams, useRouter } from "next/navigation";
import { useAdmins } from "@/hooks/useAdmins";
import { useProfile } from "@/hooks/useProfile";
import ErrorState from "@components/UI/Feedback/ErrorState";
import ProfilePictureModal from "@components/UI/Modal/ProfilePictureModal";
import { formatDateTime } from "@/utils/dates";
import { ADMIN_LEVEL_LABEL } from "@/utils/dropdownList/adminLevel";
import { canManageAdmin } from "@/utils/permissions";

export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the admin
	const router = useRouter();

	const {
		adminDetail: user,
		isLoading,
		fetchError,
		isActionPending,
		toggleAdminStatus,
	} = useAdmins({ adminId: id });


	const { profile } = useProfile();
	const actingIsSuper = profile?.adminLevel === "super";
	const isSelf = profile?.id != null && String(profile.id) === String(id);
	// Editing from this admin-management page — including your own record —
	// requires super (or outranking the target); self-edit is NOT a bypass
	// here. A non-super admin edits their own limited info via the separate
	// Settings > Profile self-service page instead. Supers also bypass the
	// update_admin slug requirement itself (per the backend's "supers bypass
	// all slug checks" rule), so this doesn't block a super whose profile
	// happens not to list that slug explicitly.
	const canEdit = canManageAdmin(profile, user) && (actingIsSuper || profile?.permissionSlugs?.includes("update_admin"));
	// Deactivating/activating follows the same rank+bypass rule, but — unlike
	// editing — you may never toggle your own account.
	const canToggle = !isSelf && canManageAdmin(profile, user) && (actingIsSuper || profile?.permissionSlugs?.includes("toggle_admin_status"));
	// Picture upload is the one exception that's still always allowed on your
	// own profile, regardless of rank — unlike the rest of this page's edit
	// capability, which now requires super (or outranking yourself, which is
	// never true) to touch your own record at all.
	const canUploadPicture = isSelf || canEdit;

	// --- Image Upload States ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);

	// Modal state for general success/error messages
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");

	const handleActive = () => {
		setIsStatusConfirmModalOpen(true);
	};

	const confirmToggleStatus = () => {
		if (!user) return;
		toggleAdminStatus(id, {
			onSuccess: (data) => {
				const newActiveStatus = data?.data?.isActive ?? !user.isActive;
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'success', text: data?.message || `The admin has been ${newActiveStatus ? "activated" : "deactivated"} successfully.` });
				setTimeout(() => setInlineMessage(null), 5000); // automatically clear after 5s
			},
			onError: (err) => {
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'error', text: `Failed to update admin status: ${err.message || "Unexpected error"}` });
				setTimeout(() => setInlineMessage(null), 5000);
			}
		});
	};

	const handleStatusConfirmCancel = () => {
		setIsStatusConfirmModalOpen(false);
	};

	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (isLoading || fetchError || !user) return (
		<PageLayout>
			<ErrorState isLoading={isLoading} errorMessage={fetchError ?? (!user ? "Admin not found." : null)} />
		</PageLayout>
	);

	const activeStatus = user.isActive;

	return (
		<>
			<PageLayout>
				<InlineBanner message={inlineMessage} />

				{/* Header */}
				<PageHeader
					title={`Admin Profile: ${user.firstName} ${user.lastName}`}
					actions={
						<>
							{canToggle && (
								<Button
									variant={activeStatus ? "dangerLight" : "successLight"}
									icon={<Activity size={16} />}
									onClick={handleActive}
									disabled={isActionPending}
								>
									{activeStatus ? "Inactive" : "Active"}
								</Button>
							)}
							<Button variant="secondary" icon={<Undo2 size={16} />} onClick={() => router.back()}>Back</Button>
						</>
					}
				/>

				{/* Admin Overview */}
				<Card>
					<CardHeader>Admin Overview</CardHeader>
					<div className={styles.overviewBody}>
						<div className={styles.avatarWrap}>
							<Image
								src={user.profilePictureUrl || defaultAvatar}
								alt="Profile Photo"
								width={88}
								height={88}
								className={styles.avatar}
								unoptimized
							/>
							{canUploadPicture && (
								<button
									className={styles.uploadTrigger}
									onClick={() => setIsImageModalOpen(true)}
									title="Upload photo"
								>
									<Upload size={13} />
								</button>
							)}
						</div>

						<div className={styles.overviewInfo}>
							<div className={styles.mainInfo}>
								<div className={styles.fullName}>{user.firstName} {user.lastName}</div>
								<div className={styles.idViewRow}>
									<Hash size={13} className={styles.idIcon} />
									<span className={styles.idText}>{user.employeeId || "—"}</span>
								</div>
								<div className={styles.badges}>
									<span className={`${styles.statusPill} ${activeStatus ? styles.statusActive : styles.statusInactive}`}>
										{activeStatus ? "Active" : "Inactive"}
									</span>
									{user.adminLevel && (
										<span className={styles.empBadge}>{ADMIN_LEVEL_LABEL[user.adminLevel] ?? user.adminLevel}</span>
									)}
								</div>
							</div>

							<div className={styles.timestamps}>
								<div className={styles.metaItem}>
									<Calendar size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Created</div>
										<div className={styles.metaValue}>{formatDateTime(user.createdAt)}</div>
									</div>
								</div>
								<div className={styles.metaItem}>
									<Clock size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Last Updated</div>
										<div className={styles.metaValue}>{formatDateTime(user.updatedAt)}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</Card>

				{/* Tabbed Content */}
				<div className={styles.tabs}>
					<Tabs />
				</div>
			</PageLayout>

			{/* Status Confirmation Modal */}
			<StatusToggleConfirmModal
				isOpen={isStatusConfirmModalOpen}
				isActive={activeStatus}
				entityLabel="admin"
				onConfirm={confirmToggleStatus}
				onCancel={handleStatusConfirmCancel}
				isPending={isActionPending}
			/>

			{/* General Success/Error Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={handleGeneralModalCancel}>
				<h2>{message}</h2>
				<div className={styles.modalActions} style={{ justifyContent: 'center' }}>
					<Button variant="primary" onClick={handleGeneralModalCancel}>Close</Button>
				</div>
			</Modal>

			{/* Image Upload Modal */}
			<ProfilePictureModal
				isOpen={isImageModalOpen}
				onClose={() => setIsImageModalOpen(false)}
				userId={id}
				currentImageUrl={user.profilePictureUrl}
				onSuccess={() => {
					setMessage("Profile picture uploaded and saved successfully!");
					setIsGeneralModalOpen(true);
				}}
			/>
		</>
	);
}
