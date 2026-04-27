"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InfoField, InputField } from "@components/UI/Card";
import styles from "./admin_profile.module.css";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Link from "next/link";
import { Activity, Undo2, Upload, Edit, Save, X } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { IdRule, nameRule, emailRule, phoneRule } from "@/utils/validation";
import { useAdmins } from "@/hooks/useAdmins";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { useProfileUpload } from "@/hooks/usePictures";

// --- File Upload Constants ---
const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit

const ADMIN_LEVEL_OPTIONS = [
	{ label: "Super Admin", value: "super" },
	{ label: "Manager", value: "manager" },
	{ label: "Supervisor", value: "supervisor" },
	{ label: "Office Admin", value: "office_admin" },
	{ label: "Team Lead", value: "team_lead" },
	{ label: "Payroll Admin", value: "payroll" },
];

const DEPARTMENT_OPTIONS = [
	{ label: "Operations", value: "Operations" },
	{ label: "Human Resources", value: "Human Resources" },
	{ label: "Finance", value: "Finance" },
	{ label: "IT", value: "IT" },
	{ label: "Administration", value: "Administration" },
];

const schema = yup.object({
	firstName: nameRule.required("First name is required"),
	lastName: nameRule.required("Last name is required"),
	email: emailRule.required("Email is required"),
	phone: phoneRule.required("Phone number is required"),
	adminLevel: yup.string().required("Admin level is required"),
	department: yup.string().required("Department is required"),
	region: yup.string()
		.oneOf(["Central", "Windsor", "HRM", "Yarmouth", "Shelburne", "South Shore"], "Please select a valid region")
		.required("Region is required"),
	adminId: IdRule,
	permissionsGroup: yup
		.array()
		.min(1, "Please select at least one permission group")
		.required("Please select at least one permission group"),
});

export default function Page() {
	const { id } = useParams(); // The userId (MongoDB ObjectId) for the admin

	const {
		adminDetail: user,
		isLoading,
		fetchError,
		updateAdmin,
		isActionPending,
		toggleAdminStatus,
		refetch
	} = useAdmins({ adminId: id });

	// --- Editing State & Form Setup ---
	const [isEditing, setIsEditing] = useState(false);
	const { permissionGroups } = usePermissionGroups();

	const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());

	const { register, handleSubmit, setValue, clearErrors, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			permissionsGroup: []
		}
	});

	const toggleGroup = (groupId) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);

			setValue("permissionsGroup", Array.from(next), { shouldValidate: true });
			return next;
		});
	};

	// --- Image Upload States & Hooks ---
	const { uploadProfilePicture, isUploading } = useProfileUpload();
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);

	// Modal state for general success/error messages
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	// --- Helper Functions (S3 Upload Logic) ---
	const cleanupPreviewUrl = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
	};

	const handleImageUpload = async () => {
		if (!selectedFile) return;
		setError("");

		uploadProfilePicture(
			{ file: selectedFile, userId: id },
			{
				onSuccess: () => {
					setMessage("Profile picture uploaded and saved successfully!");
					setIsGeneralModalOpen(true);
					handleCloseImageModal();
				},
				onError: (err) => {
					setError(`Image upload failed: ${err.message || "Failed to upload image."}`);
				}
			}
		);
	}

	// --- API Calls and Handlers (User Data) ---
	useEffect(() => {
		if (user) {
			reset({
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				adminLevel: user.adminLevel || "",
				department: user.department || "",
				region: user.region || "",
				adminId: user.employeeId || "",
			});

			// Initialize selected groups
			const pg = user.permissionsGroup;
			const initialSelected = new Set();
			if (Array.isArray(pg)) {
				pg.forEach(pid => initialSelected.add(typeof pid === 'string' ? pid : pid._id));
			} else if (pg) {
				initialSelected.add(typeof pg === 'string' ? pg : pg._id);
			}
			setSelectedGroupIds(initialSelected);
			setValue("permissionsGroup", Array.from(initialSelected));
		}
	}, [user, reset, setValue]);

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

	const onSubmit = (data) => {
		const permissionsGroup = data.permissionsGroup.length === 1 ? data.permissionsGroup[0] : data.permissionsGroup;

		const body = {
			...data,
			employeeId: data.adminId,
			permissionsGroup,
		};

		updateAdmin({ id, data: body }, {
			onSuccess: () => {
				setIsEditing(false);
				setMessage("Admin updated successfully!");
				setIsGeneralModalOpen(true);
				refetch(); // Refresh data using react query
			},
			onError: (err) => {
				setMessage(`Failed to update admin: ${err.message || "Unexpected error"}`);
				setIsGeneralModalOpen(true);
			}
		});
	};

	const startEditing = () => {
		if (user) {
			reset({
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				adminLevel: user.adminLevel || "",
				department: user.department || "",
				region: user.region || "",
				adminId: user.employeeId || "",
			});

			const pg = user.permissionsGroup;
			const initialSelected = new Set();
			if (Array.isArray(pg)) {
				pg.forEach(pid => initialSelected.add(typeof pid === 'string' ? pid : pid._id));
			} else if (pg) {
				initialSelected.add(typeof pg === 'string' ? pg : pg._id);
			}
			setSelectedGroupIds(initialSelected);
			setValue("permissionsGroup", Array.from(initialSelected));
		}
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setIsEditing(false);
	};

	// --- Image Modal UI Handlers ---
	const handleFileChange = (e) => {
		cleanupPreviewUrl();
		setError("");
		const file = e.target.files[0];

		if (file) {
			if (file.size > MAX_FILE_SIZE) {
				setError(`File is too large (max ${MAX_FILE_SIZE / 1024}KB).`);
				setSelectedFile(null);
				return;
			}
			if (!SUPPORTED_FORMATS.includes(file.type)) {
				setError(`Unsupported file type.`);
				setSelectedFile(null);
				return;
			}

			setSelectedFile(file);
			setPreviewUrl(URL.createObjectURL(file));
		} else {
			setSelectedFile(null);
		}
	};

	const handleCloseImageModal = () => {
		setIsImageModalOpen(false);
		setSelectedFile(null);
		setError("");
		cleanupPreviewUrl();
	};

	function handleGeneralModalCancel() {
		setIsGeneralModalOpen(false);
	}

	// --- Render Logic ---
	if (isLoading) return <p>Loading admin data...</p>;
	if (fetchError) return <p>{fetchError}</p>;
	if (!user) return <p>Admin data not found or failed to load.</p>;

	const activeStatus = user.isActive;

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
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Header */}
					<div className={styles.header}>
						<h1>{isEditing ? `Edit Admin Profile: ${user.firstName} ${user.lastName}` : `Admin Profile: ${user.firstName} ${user.lastName}`}</h1>
						<div className={styles.headerActions}>
							{!isEditing ? (
								<>
									<Button
										variant="primary"
										icon={<Edit size={16} />}
										onClick={startEditing}
										type="button"
									>
										Edit
									</Button>
									<Button
										variant={activeStatus ? "dangerLight" : "successLight"}
										icon={<Activity size={16} />}
										onClick={handleActive}
										type="button"
									>
										{activeStatus ? "Inactive" : "Active"}
									</Button>
									<Link href="/admins">
										<Button variant="secondary" icon={<Undo2 size={16} />} type="button">Back</Button>
									</Link>
								</>
							) : (
								<>
									<Button
										variant="secondary"
										icon={<X size={16} />}
										onClick={cancelEditing}
										type="button"
										disabled={isActionPending}
									>
										Cancel
									</Button>
									<Button
										variant="primary"
										icon={<Save size={16} />}
										type="submit"
										disabled={isActionPending}
									>
										{isActionPending ? "Saving..." : "Save"}
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Admin Details */}
					<div className={styles.content}>
						<div className={styles.leftPanel}>
							{/* Basic Info */}
							<Card>
								<CardHeader>Basic Information</CardHeader>
								<CardContent>
									{!isEditing ? (
										<>
											<div className={styles.row2}>
												<InfoField label="Admin ID">{user.employeeId}</InfoField>
												<InfoField label="Status">
													<span className={`${styles.statusPill} ${activeStatus ? styles.statusActive : styles.statusInactive}`}>
														{activeStatus ? "Active" : "Inactive"}
													</span>
												</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="First Name">{user.firstName}</InfoField>
												<InfoField label="Last Name">{user.lastName}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Email">{user.email}</InfoField>
												<InfoField label="Phone">{user.phone}</InfoField>
											</div>
										</>
									) : (
										<>
											<div className={styles.row2}>
												<InputField label="Admin ID" name="adminId" register={register} error={errors.adminId} />
												<div style={{ flex: 1 }}></div>
											</div>
											<div className={styles.row2}>
												<InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
												<InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
											</div>
											<div className={styles.row2}>
												<InputField label="Email" name="email" register={register} error={errors.email} />
												<InputField label="Phone" name="phone" type="phone" register={register} error={errors.phone} />
											</div>
										</>
									)}
								</CardContent>
							</Card>

							{/* Role & Department */}
							<Card>
								<CardHeader>Role &amp; Department</CardHeader>
								<CardContent>
									{!isEditing ? (
										<>
											<div className={styles.row2}>
												<InfoField label="Role">Admin</InfoField>
												<InfoField label="Admin Level">{user.adminLevel || "—"}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Department">{user.department || "—"}</InfoField>
												<InfoField label="Region">{user.region || "—"}</InfoField>
											</div>
										</>
									) : (
										<>
											<div className={styles.row2}>
												<InfoField label="Role">Admin</InfoField>
												<InputField
													label="Admin Level"
													name="adminLevel"
													type="select"
													register={register}
													error={errors.adminLevel}
													options={ADMIN_LEVEL_OPTIONS}
												/>
											</div>
											<div className={styles.row2}>
												<InputField
													label="Department"
													name="department"
													type="select"
													register={register}
													error={errors.department}
													options={DEPARTMENT_OPTIONS}
												/>
												<InputField
													label="Region"
													name="region"
													type="select"
													register={register}
													error={errors.region}
													options={[
														{ label: "Central", value: "Central" },
														{ label: "Windsor", value: "Windsor" },
														{ label: "HRM", value: "HRM" },
														{ label: "Yarmouth", value: "Yarmouth" },
														{ label: "Shelburne", value: "Shelburne" },
														{ label: "South Shore", value: "South Shore" }
													]}
												/>
											</div>
										</>
									)}
								</CardContent>
							</Card>

							{/* Permissions */}
							<Card>
								<CardHeader>Permission Groups</CardHeader>
								<CardContent>
									{!isEditing ? (
										<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
											{Array.from(selectedGroupIds).length > 0 ? Array.from(selectedGroupIds).map(id => {
												const group = permissionGroups.find(g => g._id === id);
												if (!group) return null;
												const groupSlugs = group.permissions || [];
												return (
													<div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
														<span style={{ display: 'inline-flex', alignItems: 'center', background: '#f3f4f6', color: '#1f2937', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', width: 'fit-content' }}>
															<Activity size={14} style={{ marginRight: '6px', color: '#6b7280' }} />
															{group.name}
														</span>
														{groupSlugs.length > 0 && (
															<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '0.5rem' }}>
																{groupSlugs.map(slug => (
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
											}) : <span style={{ color: '#6b7280' }}>No permission groups assigned.</span>}
										</div>
									) : (
										<>
											{permissionGroups.length === 0 ? (
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
																<label className="checkboxLabel" style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex' }}>
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={() => toggleGroup(group._id)}
																	/>
																	{group.name}
																</label>
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
										</>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Picture Side Panel */}
						<div className={styles.rightPanel}>
							<Card>
								<CardHeader>Profile Picture</CardHeader>
								<CardContent>
									<div className={styles.picture}>
										<Image
											src={user.profilePictureUrl || defaultAvatar}
											alt="Profile Photo"
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
											type="button"
										>
											Upload Picture
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</form>
			</PageLayout>

			{/* Status Confirmation Modal */}
			<Modal isOpen={isStatusConfirmModalOpen} onClose={handleStatusConfirmCancel}>
				<div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
					<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1f2937' }}>
						Are you sure you want to {activeStatus ? "deactivate" : "activate"} this admin?
					</h2>
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
						<Button variant="secondary" onClick={handleStatusConfirmCancel} disabled={isActionPending}>
							No, Cancel
						</Button>
						<Button variant="primary" onClick={confirmToggleStatus} disabled={isActionPending}>
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
			<Modal isOpen={isImageModalOpen} onClose={handleCloseImageModal}>
				<div className={styles.centeredModalContainer}>
					<h2>Update Profile Picture</h2>
					<div className={styles.uploadModalContent}>
						<div className={styles.imagePreview}>
							<Image
								src={previewUrl || user.profilePictureUrl || defaultAvatar}
								alt="Preview"
								width={150}
								height={150}
								className={styles.image}
								unoptimized
							/>
						</div>

						{/* Custom styled file input label */}
						<label className={styles.fileInputLabelCustom}>
							Select File
							<input
								type="file"
								accept={SUPPORTED_FORMATS.join(',')}
								onChange={handleFileChange}
								className={styles.hiddenFileInput}
								disabled={isUploading}
							/>
						</label>

						{selectedFile && <p className={styles.fileName}>Selected: {selectedFile.name}</p>}

						{error && <p className={styles.errorMessage}>{error}</p>}

						<p className={styles.fileNote}>Max {MAX_FILE_SIZE / 1024}KB. Supported formats: JPG, PNG, WEBP.</p>

						<div className={styles.modalActions}>
							<Button variant="secondary" onClick={handleCloseImageModal} disabled={isUploading}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleImageUpload}
								disabled={!selectedFile || isUploading || !!error}
							>
								{isUploading ? "Uploading..." : "Save Picture"}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
}
