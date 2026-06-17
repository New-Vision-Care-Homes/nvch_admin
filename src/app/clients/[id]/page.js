"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader } from "@components/UI/Card";
import styles from "./client_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Activity, Calendar, Clock, Hash, Undo2, Upload } from "lucide-react";
import { utcToFullDisplay } from "@/utils/timeHandling";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

import ProfilePictureModal from "@components/UI/ProfilePictureModal";
import { useClients } from "@/hooks/useClients";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import ErrorState from "@components/UI/ErrorState";


import defaultAvatar from "@/assets/img/navbar/avatar.jpg";

/**
 * Client Profile Page Component
 * 
 * Main container for a single client's profile.
 * Features:
 * - Fetches and displays top-level client details (Name, ID, Status)
 * - Toggles active/inactive status
 * - Uploads and updates the client's profile picture using AWS S3 pre-signed URLs
 * - Renders a tabbed navigation interface for detailed sub-sections (Info, Care Plan, etc.)
 */
export default function Page() {
	const { id } = useParams();

	const {
		clientDetail,
		isLoading,
		fetchError,
		isActionPending,
		toggleClientStatus
	} = useClients(id);

	const { profile } = useProfile();
	// The activate/deactivate endpoint requires toggle_client_status.
	const canToggle = profile?.permissionSlugs?.includes("toggle_client_status");
	// Changing another user's picture requires update rights on the target
	// (same scoping as the edit form — backend assertCanManageUser).
	const canEdit = canManageTarget(profile, clientDetail, "update_all_clients", "update_assigned_clients");


	// --- Image Upload States ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);

	// --- General UI States ---
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");




	const handleActive = () => {
		setIsStatusConfirmModalOpen(true);
	};

	const confirmToggleStatus = () => {
		if (!clientDetail) return;
		toggleClientStatus(id, {
			onSuccess: (data) => {
				const newActiveStatus = data?.data?.isActive ?? !clientDetail.isActive;
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'success', text: data?.message || `The client has been ${newActiveStatus ? "activated" : "deactivated"} successfully.` });
				setTimeout(() => setInlineMessage(null), 5000);
			},
			onError: (err) => {
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'error', text: `Failed to update client status: ${err.message || "Unexpected error"}` });
				setTimeout(() => setInlineMessage(null), 5000);
			}
		});
	};

	const handleStatusConfirmCancel = () => {
		setIsStatusConfirmModalOpen(false);
	};



	if (isLoading || fetchError || !clientDetail) {
		return (
			<PageLayout>
				<ErrorState isLoading={isLoading} errorMessage={fetchError ?? (!clientDetail ? "Client not found." : null)} />
			</PageLayout>
		);
	}



	return (
		<>
			<PageLayout>
				{inlineMessage && (
					<div style={{
						backgroundColor: inlineMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
						color: inlineMessage.type === 'error' ? '#991b1b' : '#166534',
						padding: '1rem',
						borderRadius: '6px',
						marginBottom: '1rem',
						fontWeight: '500',
						textAlign: 'center',
						border: `1px solid ${inlineMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`
					}}>
						{inlineMessage.text}
					</div>
				)}
				<div className={styles.header}>
					<h1>Client Profile: {clientDetail.firstName} {clientDetail.lastName}</h1>
					<div className={styles.headerActions}>
						{canToggle && (
							<Button
								variant={clientDetail.isActive ? "dangerLight" : "successLight"}
								icon={<Activity size={16} />}
								onClick={handleActive}
								disabled={isActionPending}
							>
								{clientDetail.isActive ? "Inactive" : "Active"}
							</Button>
						)}
						<Link href="/clients">
							<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
						</Link>
					</div>
				</div>

				<Card>
					<CardHeader>Client Overview</CardHeader>
					<div className={styles.overviewBody}>
						<div className={styles.avatarWrap}>
							<Image
								src={clientDetail.profilePictureUrl || defaultAvatar}
								alt="Profile"
								width={88}
								height={88}
								className={styles.avatar}
								unoptimized
							/>
							{canEdit && (
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
								<div className={styles.fullName}>{clientDetail.firstName} {clientDetail.lastName}</div>
								<div className={styles.idLine}>
									<Hash size={12} />
									{clientDetail.clientId || "—"}
								</div>
								<span className={`${styles.statusPill} ${clientDetail.isActive ? styles.statusActive : styles.statusInactive}`}>
									{clientDetail.isActive ? "Active" : "Inactive"}
								</span>
							</div>

							<div className={styles.timestamps}>
								<div className={styles.metaItem}>
									<Calendar size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Created</div>
										<div className={styles.metaValue}>{utcToFullDisplay(clientDetail.createdAt, "America/Halifax")}</div>
									</div>
								</div>
								<div className={styles.metaItem}>
									<Clock size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Last Updated</div>
										<div className={styles.metaValue}>{utcToFullDisplay(clientDetail.updatedAt, "America/Halifax")}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</Card>

				<div className={styles.tabs}>
					<Tabs />
				</div>
			</PageLayout>

			{/* Status Confirmation Modal */}
			<Modal isOpen={isStatusConfirmModalOpen} onClose={handleStatusConfirmCancel}>
				<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
					<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
						Are you sure you want to {clientDetail.isActive ? "deactivate" : "activate"} this client?
					</h2>
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
						<Button variant="secondary" onClick={handleStatusConfirmCancel} disabled={isActionPending}>
							No, Cancel
						</Button>
						<Button variant="primary" onClick={confirmToggleStatus} disabled={isActionPending}>
							Yes, {clientDetail.isActive ? "Deactivate" : "Activate"}
						</Button>
					</div>
				</div>
			</Modal>

			{/* General Feedback Modal */}
			<Modal isOpen={isGeneralModalOpen} onClose={() => setIsGeneralModalOpen(false)}>
				<h2>{message}</h2>
				<div className={styles.modalActions} style={{ justifyContent: 'center', marginTop: '15px' }}>
					<Button variant="primary" onClick={() => setIsGeneralModalOpen(false)}>Close</Button>
				</div>
			</Modal>

			{/* Image Upload Popup */}
			<ProfilePictureModal
				isOpen={isImageModalOpen}
				onClose={() => setIsImageModalOpen(false)}
				userId={id}
				currentImageUrl={clientDetail.profilePictureUrl}
				onSuccess={() => {
					setMessage("Profile picture updated successfully!");
					setIsGeneralModalOpen(true);
				}}
			/>
		</>
	);
}

