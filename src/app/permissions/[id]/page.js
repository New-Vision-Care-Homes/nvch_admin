"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InputField, InfoField } from "@components/UI/Card";
import styles from "../permissions_group.module.css";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { PERMISSION_SCHEMAS, ALL_PERMISSION_SLUGS } from "@/utils/permissions";
import ErrorState from "@/components/UI/ErrorState";

export default function PermissionGroupDetailPage() {
	const router = useRouter();
	const { id } = useParams();
	const [isEditing, setIsEditing] = useState(false);

	const { 
		permissionGroupDetail, 
		isPermissionGroupsLoading, 
		fetchError, 
		updatePermissionGroup, 
		isPermissionGroupsActionPending, 
		actionError,
		refetch
	} = usePermissionGroups({ permissionGroupId: id });

	const { register, handleSubmit, control, formState: { errors }, setError, reset } = useForm({
		defaultValues: {
			name: "",
			description: "",
			permissions: []
		}
	});

	// Populate form when data arrives or edit mode toggled
	useEffect(() => {
		if (permissionGroupDetail) {
			reset({
				name: permissionGroupDetail.name || "",
				description: permissionGroupDetail.description || "",
				permissions: permissionGroupDetail.permissions || []
			});
		}
	}, [permissionGroupDetail, isEditing, reset]);

	const handleCancelEdit = () => {
		setIsEditing(false);
	};

	const onSubmit = (data) => {
		if (!data.name || data.name.trim().length < 3) {
			setError("name", { type: "manual", message: "Group name must be at least 3 characters." });
			return;
		}
		if (!data.description || data.description.trim() === "") {
			setError("description", { type: "manual", message: "Description is required." });
			return;
		}

		if (ALL_PERMISSION_SLUGS.includes(data.name.trim())) {
			setError("name", {
				type: "manual",
				message: "Group name cannot be the same as an individual permission slug."
			});
			return;
		}

		if (!data.permissions || data.permissions.length === 0) {
			setError("permissions", {
				type: "manual",
				message: "Please select at least one permission."
			});
			return;
		}

		updatePermissionGroup({ id, data }, {
			onSuccess: () => {
				setIsEditing(false);
			}
		});
	};

	// Helper to find modules that are granted
	const getGrantedSchemas = (grantedPerms) => {
		return PERMISSION_SCHEMAS.map(schema => {
			const activeSlugs = schema.slugs.filter(slug => grantedPerms.includes(slug));
			return { ...schema, activeSlugs };
		}).filter(schema => schema.activeSlugs.length > 0);
	};

	return (
		<PageLayout>
			<div className={styles.container}>
				
				<ErrorState
					isLoading={isPermissionGroupsLoading}
					errorMessage={fetchError}
					onRetry={refetch}
				/>

				{!isPermissionGroupsLoading && !fetchError && permissionGroupDetail && (
					<>
						<div className={styles.header}>
							<h1 className={styles.title}>
								{isEditing ? "Edit Permission Group" : "Permission Group Details"}
							</h1>
							{!isEditing && (
								<div style={{ display: 'flex', gap: '10px' }}>
									<Button variant="secondary" onClick={() => router.back()}>Back</Button>
									<Button variant="primary" onClick={() => setIsEditing(true)}>Edit</Button>
								</div>
							)}
						</div>

						{actionError && isEditing && <div className={styles.globalError}>{actionError}</div>}

						<form onSubmit={isEditing ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
							<Card className={styles.formGrid}>
								<CardHeader>Group Details</CardHeader>
								<CardContent>
									{isEditing ? (
										<>
											<InputField
												label="Name"
												name="name"
												register={register}
												error={errors.name}
											/>
											<InputField
												label="Description"
												name="description"
												register={register}
												error={errors.description}
											/>
										</>
									) : (
										<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
											<InfoField label="Name" value={permissionGroupDetail.name} />
											<InfoField label="Description" value={permissionGroupDetail.description} />
										</div>
									)}
								</CardContent>
							</Card>

							<div className={styles.permissionsContainer}>
								<h2 className={styles.permissionsHeader}>Module Permissions</h2>

								{isEditing ? (
									<>
										{errors.permissions && (
											<p className={styles.errorText} style={{ marginBottom: '16px' }}>
												{errors.permissions.message}
											</p>
										)}
										<Controller
											name="permissions"
											control={control}
											render={({ field }) => {
												const togglePermission = (slug) => {
													const currentPerms = field.value || [];
													if (currentPerms.includes(slug)) {
														field.onChange(currentPerms.filter(p => p !== slug));
													} else {
														field.onChange([...currentPerms, slug]);
													}
												};
												return (
													<div>
														{PERMISSION_SCHEMAS.map(schema => (
															<div key={schema.module} className={styles.moduleSection}>
																<div className={styles.moduleTitle}>{schema.module}</div>
																<div className={styles.slugGrid}>
																	{schema.slugs.map(slug => (
																		<label key={slug} className={styles.checkboxItem}>
																			<input
																				type="checkbox"
																				checked={(field.value || []).includes(slug)}
																				onChange={() => togglePermission(slug)}
																			/>
																			<span>{slug}</span>
																		</label>
																	))}
																</div>
															</div>
														))}
													</div>
												);
											}}
										/>
									</>
								) : (
									/* View Mode */
									<div>
										{getGrantedSchemas(permissionGroupDetail.permissions || []).map(schema => (
											<div key={schema.module} className={styles.moduleSection}>
												<div className={styles.moduleTitle}>{schema.module}</div>
												<div className={styles.slugGrid} style={{ gap: '10px' }}>
													{schema.activeSlugs.map(slug => (
														<span key={slug} style={{
															display: 'inline-block',
															background: '#EFF6FF',
															color: '#1D4ED8',
															padding: '4px 10px',
															borderRadius: '6px',
															fontSize: '0.86rem',
															fontWeight: '500',
															marginRight: '8px',
															marginBottom: '8px'
														}}>
															{slug}
														</span>
													))}
												</div>
											</div>
										))}
										{getGrantedSchemas(permissionGroupDetail.permissions || []).length === 0 && (
											<p style={{ color: '#6B7280', fontSize: '0.9rem' }}>No permissions assigned.</p>
										)}
									</div>
								)}
							</div>

							{isEditing && (
								<div className={styles.btnGroup}>
									<Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
									<Button type="submit" variant="primary" disabled={isPermissionGroupsActionPending}>
										{isPermissionGroupsActionPending ? "Saving..." : "Save Changes"}
									</Button>
								</div>
							)}
						</form>
					</>
				)}
			</div>
		</PageLayout>
	);
}
