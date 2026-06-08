"use client";

import React, { useState, useEffect } from "react";
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
import { IdRule, nameRule, emailRule, phoneRule, dateRule } from "@/utils/validation";
import { REGION_OPTIONS } from "@/utils/dropdown_list";
import RegionCheckboxGroup from "@components/UI/RegionCheckboxGroup";
import { useAdmins } from "@/hooks/useAdmins";
import ErrorState from "@components/UI/ErrorState";
import { usePermissionGroups } from "@/hooks/usePermissions";
import ProfilePictureModal from "@components/UI/ProfilePictureModal";

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
	} = useAdmins({ adminId: id });

	// --- Editing State & Form Setup ---
	const [isEditing, setIsEditing] = useState(false);
	const { permissionGroups } = usePermissionGroups();

	const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());

	const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			permissionsGroup: [],
			regions: []
		}
	});

	const selectedRegions = watch("regions") || [];

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
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);

	// Modal state for general success/error messages
	const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
	const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
	const [inlineMessage, setInlineMessage] = useState(null);
	const [message, setMessage] = useState("");



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
				regions: Array.isArray(user.regions) && user.regions.length > 0 ? user.regions : (user.region ? [user.region] : []),
				adminId: user.employeeId || "",
				employeeStartDate: user.employeeStartDate ? user.employeeStartDate.slice(0, 10) : "",
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
			permissionsGroup: Array.isArray(data.permissionsGroup) ? data.permissionsGroup : [data.permissionsGroup].filter(Boolean),
		};

		updateAdmin({ id, data: body }, {
			onSuccess: () => {
				setIsEditing(false);
				setMessage("Admin updated successfully!");
				setIsGeneralModalOpen(true);
			},
			onError: (err) => {
				const data = err?.response?.data;
				let msg;
				if (Array.isArray(data?.details) && data.details.length > 0) {
					msg = data.details.map(d => d.msg || d).filter(Boolean).join("; ");
				} else {
					msg = data?.error || data?.message || "An unexpected error occurred";
				}
				setMessage(msg);
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
				regions: Array.isArray(user.regions) && user.regions.length > 0 ? user.regions : (user.region ? [user.region] : []),
				adminId: user.employeeId || "",
				employeeStartDate: user.employeeStartDate ? user.employeeStartDate.slice(0, 10) : "",
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
												<InfoField label="Regions">{(Array.isArray(user.regions) && user.regions.length > 0 ? user.regions.join(", ") : user.region) || "—"}</InfoField>
											</div>
											<div className={styles.row2}>
												<InfoField label="Employee Start Date">{user.employeeStartDate ? user.employeeStartDate.slice(0, 10) : "—"}</InfoField>
												<div style={{ flex: 1 }} />
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
													required
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
													required
												/>
												<InputField
													label="Employee Start Date"
													name="employeeStartDate"
													type="date"
													register={register}
													error={errors.employeeStartDate}
													required
												/>
											</div>
											<div style={{ marginBottom: "1rem" }}>
												<RegionCheckboxGroup
													label="Regions"
													required
													value={selectedRegions}
													onChange={(next) => setValue("regions", next, { shouldValidate: true })}
													error={errors.regions}
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
											<p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
												Select Group <span style={{ color: '#E53E3E', fontWeight: 700, fontSize: '0.85rem' }}>*</span>
											</p>
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
