"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
// Importing custom validation rules
import { phoneRule, shortTextRule } from "@/utils/validation";

import { Card, CardHeader, InfoField, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import Image from "next/image";
import styles from "./profile.module.css";
import { useProfile } from "@/hooks/useProfile";
import ErrorState from "@components/UI/ErrorState";
import { Edit, Upload, Save, X, Activity } from "lucide-react";
import ProfilePictureModal from "@components/UI/ProfilePictureModal";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import { usePermissionGroups } from "@/hooks/usePermissions";

const schema = yup.object({
	phone: phoneRule,
	emergencyContactName: shortTextRule,
	emergencyContactPhone: phoneRule,
	emergencyContactRelationship: shortTextRule,
});

export default function ProfilePage() {
	const { profile, updateProfile, isLoading, isActionPending, fetchError, actionError, refetch } = useProfile();

	const [isEditing, setIsEditing] = useState(false);

	const { permissionGroups } = usePermissionGroups();

	const { register, handleSubmit, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			phone: profile?.phone || "",
			emergencyContactName: profile?.emergencyContact?.name || profile?.emergencyContactName || "",
			emergencyContactPhone: profile?.emergencyContact?.phone || profile?.emergencyContactPhone || "",
			emergencyContactRelationship: profile?.emergencyContact?.relationship || profile?.emergencyContactRelationship || "",
		}
	});

	// Image Upload States
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);


	const onSubmit = (data) => {
		const body = {
			phone: data.phone,
			emergencyContact: {
				name: data.emergencyContactName,
				phone: data.emergencyContactPhone,
				relationship: data.emergencyContactRelationship,
			},
		};
		updateProfile(body, {
			onSuccess: () => {
				setIsEditing(false);
			},
		});
	};

	const handleCancel = () => {
		setIsEditing(false);
		reset({
			phone: profile?.phone || "",
			emergencyContactName: profile?.emergencyContact?.name || profile?.emergencyContactName || "",
			emergencyContactPhone: profile?.emergencyContact?.phone || profile?.emergencyContactPhone || "",
			emergencyContactRelationship: profile?.emergencyContact?.relationship || profile?.emergencyContactRelationship || "",
		});
	};


	return (
		<>
			<div className={styles.header}>
				<h1 className={styles.title}>My Profile</h1>
				<div className={styles.headerActions}>
					{!isEditing ? (
						<Button variant="primary" icon={<Edit size={16} />} onClick={() => setIsEditing(true)}>
							Edit Profile
						</Button>
					) : (
						<>
							<Button variant="secondary" icon={<X size={16} />} onClick={handleCancel} disabled={isActionPending}>
								Cancel
							</Button>
							<Button variant="primary" icon={<Save size={16} />} onClick={handleSubmit(onSubmit)} disabled={isActionPending}>
								{isActionPending ? "Saving..." : "Save Changes"}
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Action error — shown when delete/create/update fails */}
			{actionError && (
				<p className={styles.actionError}>{actionError}</p>
			)}

			{/* Fetch error or loading state */}
			<ErrorState
				isLoading={isLoading}
				errorMessage={fetchError}
				onRetry={refetch}
			/>


			{!fetchError && !isLoading && profile && (
				<>
					<div className={styles.section}>
						<Card>
							<CardHeader>Personal Information</CardHeader>
							<div className={styles.content}>
								<div className={styles.picture}>
									<Image
										src={profile.profilePictureUrl || defaultAvatar}
										alt="Profile"
										width={120}
										height={120}
										className={styles.image}
										unoptimized
									/>
									<Button
										variant="secondary"
										size="sm"
										icon={<Upload size={16} />}
										onClick={() => setIsImageModalOpen(true)}
									>
										Update Picture
									</Button>
								</div>

								<div className={styles.infoGrid}>
									<InfoField label="Status">
										<div className={styles.paddingVal}>
											<span className={`${styles.statusBadge} ${profile.isActive ? styles.active : styles.inactive}`}>
												{profile.isActive ? "Active" : "Inactive"}
											</span>
										</div>
									</InfoField>

									<InfoField label="First Name" value={profile.firstName || "N/A"} />

									<InfoField label="Last Name" value={profile.lastName || "N/A"} />

									<InfoField label="ID" value={profile.employeeId || "N/A"} />

									<InfoField label="Email" value={profile.email || "N/A"} />

									<InfoField label="Role">
										<span className={styles.paddingVal} style={{ textTransform: "capitalize", display: "inline-block" }}>{profile.role || "N/A"}</span>
									</InfoField>

									{isEditing ? (
										<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
									) : (
										<InfoField label="Phone" value={profile.phone || "N/A"} />
									)}

									<InfoField label="Region" value={profile.region || "N/A"} />

									<InfoField label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "N/A"} />
								</div>
							</div>
						</Card>
					</div>

					<div className={styles.section}>
						<Card>
							<CardHeader>Emergency Contact</CardHeader>
							<div className={styles.content}>
								<div className={styles.infoGrid}>
									{isEditing ? (
										<InputField label="Name" name="emergencyContactName" register={register} error={errors.emergencyContactName} />
									) : (
										<InfoField label="Name" value={profile.emergencyContact?.name || profile.emergencyContactName || "N/A"} />
									)}
									{isEditing ? (
										<InputField label="Phone" name="emergencyContactPhone" type="phone" register={register} error={errors.emergencyContactPhone} />
									) : (
										<InfoField label="Phone" value={profile.emergencyContact?.phone || profile.emergencyContactPhone || "N/A"} />
									)}
									{isEditing ? (
										<InputField label="Relationship" name="emergencyContactRelationship" register={register} error={errors.emergencyContactRelationship} />
									) : (
										<InfoField label="Relationship" value={profile.emergencyContact?.relationship || profile.emergencyContactRelationship || "N/A"} />
									)}
								</div>
							</div>
						</Card>
					</div>

					<div className={styles.section}>
						<div className={styles.gridContainer}>
							<Card className={styles.fullHeight}>
								<CardHeader>Administrative Details</CardHeader>
								<div className={styles.text}>
									<div className={styles.column}>
										<InfoField label="Department" value={profile.department || "N/A"} />
										<InfoField label="Admin Level" value={profile.adminLevel || "N/A"} />
										<InfoField label="Permissions">
											{(() => {
												const pg = profile.permissionsGroup;
												const groupIds = Array.isArray(pg) ? pg : (pg ? [pg] : []);
												if (groupIds.length > 0) {
													return (
														<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
															{groupIds.map((g) => {
																const id = typeof g === 'string' ? g : g._id;
																const group = permissionGroups?.find(pg => pg._id === id);
																if (!group) return null;
																const groupName = group.name;
																const groupSlugs = group.permissions || [];
																return (
																	<div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
																		<span style={{ display: 'inline-flex', alignItems: 'center', background: '#f3f4f6', color: '#1f2937', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', width: 'fit-content' }}>
																			<Activity size={14} style={{ marginRight: '6px', color: '#6b7280' }} />
																			{groupName}
																		</span>
																		{groupSlugs.length > 0 && (
																			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '0.5rem' }}>
																				{groupSlugs.map((slug) => (
																					<span key={slug} style={{
																						display: 'inline-block',
																						background: '#e5e7eb',
																						color: '#374151',
																						padding: '2px 8px',
																						borderRadius: '4px',
																						fontSize: '0.78rem',
																						fontWeight: '500',
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
													);
												}
												return <span style={{ color: '#6b7280' }}>No permission groups assigned</span>;
											})()}
										</InfoField>
									</div>
								</div>
							</Card>
						</div>
					</div>
				</>
			)}

			{/* Image Upload Popup */}
			<ProfilePictureModal
				isOpen={isImageModalOpen}
				onClose={() => setIsImageModalOpen(false)}
				userId={profile?.id || profile?._id}
				currentImageUrl={profile?.profilePicture || profile?.profilePictureUrl}
				onSuccess={() => { }}
			/>
		</>
	);
}
