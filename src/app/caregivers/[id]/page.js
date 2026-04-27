"use client";

import React, { useState } from "react";
// Assuming component paths are correct
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Link from "next/link";
import { Activity, Undo2, Upload } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

import ProfilePictureModal from "@components/UI/ProfilePictureModal";
import { useCaregivers } from "@/hooks/useCaregivers";


export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the caregiver

	const {
		caregiverDetail,
		isLoading,
		isError,
		errorMessage,
		isCaregiverActionPending,
		updateCaregiver,
		toggleCaregiverStatus
	} = useCaregivers(id);

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



	// --- Utility Handlers ---
	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (isLoading) return <p>Loading user data...</p>;
	if (isError) return <p>Error: {errorMessage}</p>;
	if (!caregiverDetail) return <p>User data not found or failed to load.</p>;

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
						<Button
							variant={activeStatus ? "dangerLight" : "successLight"}
							icon={<Activity size={16} />}
							onClick={handleActive}
							disabled={isCaregiverActionPending}
						>
							{activeStatus ? "Inactive" : "Active"}
						</Button>
						<Link href="/caregivers">
							<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
						</Link>
					</div>
				</div>

				{/* Caregiver Overview */}
				<Card>
					<CardHeader>Caregiver Overview</CardHeader>
					<div className={styles.content}>
						<div className={styles.text}>
							<div className={styles.column}>
								<InfoField label="Caregiver ID">{caregiverDetail.employeeId}</InfoField>
								<InfoField label="Next Appointment">2024-08-05 (10:00 AM) default data</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Status">
									<span className={`${styles.statusPill} ${activeStatus ? styles.statusActive : styles.statusInactive}`}>
										{activeStatus ? "Active" : "Inactive"}
									</span>
								</InfoField>
								<InfoField label="Care Plan Status">On Track default data</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Last Shift">2024-07-28 default data</InfoField>
							</div>
						</div>
						<div className={styles.picture}>
							<Image
								src={caregiverDetail.profilePictureUrl || defaultAvatar}
								alt="Profile Photo"
								width={100}
								height={100}
								className={styles.image}
								unoptimized
							/>
							{/* Button to open the image upload modal */}
							<Button
								variant="secondary"
								size="sm"
								icon={<Upload size={16} />}
								onClick={() => setIsImageModalOpen(true)}
							>
								Upload
							</Button>
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
