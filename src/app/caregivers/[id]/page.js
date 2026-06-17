"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Link from "next/link";
import { Activity, Calendar, Check, Clock, Hash, Pencil, Undo2, Upload, X } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";
import ProfilePictureModal from "@components/UI/ProfilePictureModal";
import { useCaregivers } from "@/hooks/useCaregivers";
import ErrorState from "@components/UI/ErrorState";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { utcToFullDisplay } from "@/utils/timeHandling";


export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the caregiver

	const {
		caregiverDetail,
		isCaregiverLoading,
		caregiverFetchError,
		isCaregiverActionPending,
		updateCaregiver,
		toggleCaregiverStatus
	} = useCaregivers(id);

	const { profile } = useProfile();
	// The activate/deactivate endpoint requires toggle_caregiver_status, not the update slugs.
	const canToggle = profile?.permissionSlugs?.includes("toggle_caregiver_status");
	// Changing another user's picture requires update rights on the target
	// (same scoping as the edit form — backend assertCanManageUser).
	const canEdit = canManageTarget(profile, caregiverDetail, "update_all_caregivers", "update_assigned_caregivers");

	// --- Image Upload ---
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);

	// --- General UI ---
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");

	// --- Editable Caregiver ID ---
	const [editingId, setEditingId] = useState(false);
	const [idValue, setIdValue] = useState("");
	const [idSaving, setIdSaving] = useState(false);
	const [idError, setIdError] = useState(null);
	const [idSuccess, setIdSuccess] = useState(null);

	useEffect(() => {
		setIdValue(caregiverDetail?.employeeId || "");
	}, [caregiverDetail?.employeeId]);



	const handleActive = () => {
		setIsStatusConfirmModalOpen(true);
	};

	const confirmToggleStatus = () => {
		if (!caregiverDetail) return;
		toggleCaregiverStatus(id, {
			onSuccess: (data) => {
				const newActiveStatus = data?.data?.isActive ?? !caregiverDetail.isActive;
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'success', text: data?.message || `The caregiver has been ${newActiveStatus ? "activated" : "deactivated"} successfully.` });
				setTimeout(() => setInlineMessage(null), 5000);
			},
			onError: (err) => {
				setIsStatusConfirmModalOpen(false);
				setInlineMessage({ type: 'error', text: `Failed to update caregiver status: ${err.message || "Unexpected error"}` });
				setTimeout(() => setInlineMessage(null), 5000);
			}
		});
	};

	const handleStatusConfirmCancel = () => {
		setIsStatusConfirmModalOpen(false);
	};



	// --- Save Caregiver ID ---
	const handleSaveId = () => {
		const trimmed = idValue.trim();
		if (!trimmed) {
			setIdError("Caregiver ID cannot be empty.");
			return;
		}
		setIdSaving(true);
		setIdError(null);
		setIdSuccess(null);

		// PUT requires the full caregiver payload — send all existing fields
		// (same shape as Info.js onSubmit) and override only employeeId.
		const cd = caregiverDetail;
		const fullPayload = {
			email:               cd.email || null,
			firstName:           cd.firstName,
			lastName:            cd.lastName,
			phone:               cd.phone || null,
			dateOfBirth:         cd.dateOfBirth || null,
			employeeStartDate:   cd.employeeStartDate ? new Date(cd.employeeStartDate).toISOString() : null,
			regions:             cd.regions,
			employmentStatus:    cd.employmentStatus || null,
			address: {
				street:  cd.address?.street,
				unit:    cd.address?.unit || null,
				city:    cd.address?.city,
				state:   cd.address?.state,
				pinCode: cd.address?.pinCode,
				country: cd.address?.country,
				gpsCoordinates: {
					latitude:  cd.address?.gpsCoordinates?.latitude,
					longitude: cd.address?.gpsCoordinates?.longitude,
				},
			},
			biWeeklyWorkCapacity: { maxHours: cd.biWeeklyWorkCapacity?.maxHours },
			supervisor:    cd.supervisor || null,
			teamLead:      cd.teamLead   || null,
			emergencyContact: {
				name:         cd.emergencyContact?.name         || null,
				phone:        cd.emergencyContact?.phone        || null,
				relationship: cd.emergencyContact?.relationship || null,
			},
			employeeId: trimmed,
		};

		updateCaregiver(
			{ id, data: fullPayload },
			{
				onSuccess: () => {
					setIdSaving(false);
					setEditingId(false);
					setIdSuccess("Caregiver ID updated successfully.");
					setTimeout(() => setIdSuccess(null), 4000);
				},
				onError: (err) => {
					setIdSaving(false);
					setIdError(
						err?.response?.data?.details?.[0]?.msg ||
						err?.response?.data?.error ||
						"Failed to update Caregiver ID."
					);
				},
			}
		);
	};

	const handleCancelIdEdit = () => {
		setEditingId(false);
		setIdValue(caregiverDetail?.employeeId || "");
		setIdError(null);
	};

	// --- Utility Handlers ---
	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (isCaregiverLoading || caregiverFetchError || !caregiverDetail) return (
		<PageLayout>
			<ErrorState isLoading={isCaregiverLoading} errorMessage={caregiverFetchError ?? (!caregiverDetail ? "Caregiver not found." : null)} />
		</PageLayout>
	);

	const activeStatus = caregiverDetail.isActive;

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
				{/* Header */}
				<div className={styles.header}>
					<h1>Caregiver Profile: {caregiverDetail.firstName} {caregiverDetail.lastName}</h1>
					<div className={styles.headerActions}>
						{canToggle && (
							<Button
								variant={activeStatus ? "dangerLight" : "successLight"}
								icon={<Activity size={16} />}
								onClick={handleActive}
								disabled={isCaregiverActionPending}
							>
								{activeStatus ? "Inactive" : "Active"}
							</Button>
						)}
						<Link href="/caregivers">
							<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
						</Link>
					</div>
				</div>

				{/* Caregiver Overview */}
				<Card>
					<CardHeader>Caregiver Overview</CardHeader>
					<div className={styles.overviewBody}>
						<div className={styles.avatarWrap}>
							<Image
								src={caregiverDetail.profilePictureUrl || defaultAvatar}
								alt="Profile Photo"
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
								<div className={styles.fullName}>{caregiverDetail.firstName} {caregiverDetail.lastName}</div>
								<div className={styles.idSection}>
									{editingId ? (
										<div className={styles.idEditRow}>
											<input
												className={styles.idInput}
												value={idValue}
												onChange={(e) => setIdValue(e.target.value)}
												onKeyDown={(e) => { if (e.key === "Enter") handleSaveId(); if (e.key === "Escape") handleCancelIdEdit(); }}
												disabled={idSaving}
												autoFocus
											/>
											<button className={styles.idSaveBtn} onClick={handleSaveId} disabled={idSaving} title="Save">
												<Check size={13} />
											</button>
											<button className={styles.idCancelBtn} onClick={handleCancelIdEdit} disabled={idSaving} title="Cancel">
												<X size={13} />
											</button>
										</div>
									) : (
										<div className={styles.idViewRow}>
											<Hash size={12} className={styles.idIcon} />
											<span className={styles.idText}>{caregiverDetail.employeeId || "—"}</span>
											{canEdit && (
												<button
													className={styles.idEditTrigger}
													onClick={() => { setEditingId(true); setIdError(null); setIdSuccess(null); }}
													title="Edit Caregiver ID"
												>
													<Pencil size={11} />
												</button>
											)}
										</div>
									)}
									{idError   && <div className={styles.idFeedbackError}>{idError}</div>}
									{idSuccess && <div className={styles.idFeedbackSuccess}>{idSuccess}</div>}
								</div>
								<div className={styles.badges}>
									<span className={`${styles.statusPill} ${activeStatus ? styles.statusActive : styles.statusInactive}`}>
										{activeStatus ? "Active" : "Inactive"}
									</span>
									{caregiverDetail.employmentStatus && (
										<span className={styles.empBadge}>{caregiverDetail.employmentStatus}</span>
									)}
								</div>
							</div>

							<div className={styles.timestamps}>
								<div className={styles.metaItem}>
									<Calendar size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Created</div>
										<div className={styles.metaValue}>{utcToFullDisplay(caregiverDetail.createdAt, "America/Halifax")}</div>
									</div>
								</div>
								<div className={styles.metaItem}>
									<Clock size={13} className={styles.metaIcon} />
									<div>
										<div className={styles.metaLabel}>Last Updated</div>
										<div className={styles.metaValue}>{utcToFullDisplay(caregiverDetail.updatedAt, "America/Halifax")}</div>
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
			<Modal isOpen={isStatusConfirmModalOpen} onClose={handleStatusConfirmCancel}>
				<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
					<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
						Are you sure you want to {activeStatus ? "deactivate" : "activate"} this caregiver?
					</h2>
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
						<Button variant="secondary" onClick={handleStatusConfirmCancel} disabled={isCaregiverActionPending}>
							No, Cancel
						</Button>
						<Button variant="primary" onClick={confirmToggleStatus} disabled={isCaregiverActionPending}>
							Yes, {activeStatus ? "Deactivate" : "Activate"}
						</Button>
					</div>
				</div>
			</Modal>

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
				currentImageUrl={caregiverDetail.profilePictureUrl}
				onSuccess={() => {
					setMessage("Profile picture updated successfully!");
					setIsGeneralModalOpen(true);
				}}
			/>
		</>
	);
}
