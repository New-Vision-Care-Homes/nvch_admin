"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InputField, InfoField } from "@components/UI/Card";
import styles from "../permissions_group.module.css";
import { usePermissionGroups, usePermissionDefinitions } from "@/hooks/usePermissions";
import { PERMISSION_SCHEMAS } from "@/utils/permissions";
import ErrorState from "@/components/UI/ErrorState";
import ActionMessage from "@/components/UI/ActionMessage";

export default function PermissionGroupDetailPage() {
	const router = useRouter();
	const { id } = useParams();
	const [isEditing, setIsEditing] = useState(false);
	const [successMessage, setSuccessMessage] = useState(null);

	// Fetch this specific group's data (name, description, permissions).
	const {
		permissionGroupDetail,
		isPermissionGroupsLoading,
		permissionGroupsFetchError,
		updatePermissionGroup,
		isPermissionGroupsActionPending,
		permissionGroupsActionError,
		refetch
	} = usePermissionGroups({ permissionGroupId: id });

	// Fetch the live slug list from the backend.
	// Only needed in edit mode (for the checkboxes), but fetched upfront so
	// checkboxes appear instantly when the user clicks Edit.
	const {
		permissionSlugs,
		isPermissionDefinitionsLoading,
		permissionDefinitionsError,
		refetchDefinitions,
	} = usePermissionDefinitions();

	const { register, handleSubmit, control, formState: { errors }, setError, reset } = useForm({
		defaultValues: { name: "", description: "", permissions: [] }
	});

	// Pre-fill the form whenever the fetched group data arrives, or when
	// the user cancels an edit (isEditing toggles back to false), to reset
	// any unsaved changes back to the last saved values.
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
		// The useEffect above will fire and reset the form to saved values.
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
		// Prevent naming a group the same as a permission slug.
		if (permissionSlugs.includes(data.name.trim())) {
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
				setSuccessMessage("Permission group updated successfully.");
			}
		});
	};

	return (
		<PageLayout>
			<div className={styles.container}>

				{/* Full-page loading / error state for the group detail fetch */}
				<ErrorState
					isLoading={isPermissionGroupsLoading}
					errorMessage={permissionGroupsFetchError}
					onRetry={refetch}
				/>

				{!isPermissionGroupsLoading && !permissionGroupsFetchError && permissionGroupDetail && (
					<>
						<div className={styles.header}>
							<h1 className={styles.title}>
								{isEditing ? "Edit Permission Group" : "Permission Group Details"}
							</h1>
							{!isEditing && (
								<div style={{ display: 'flex', gap: '10px' }}>
									<Button variant="secondary" onClick={() => router.back()}>Back</Button>
									<Button variant="primary" onClick={() => { setIsEditing(true); setSuccessMessage(null); }}>Edit</Button>
								</div>
							)}
						</div>

						{/* Success banner — shown in view mode after a successful save */}
						<ActionMessage
							variant="success"
							message={successMessage}
							onClose={() => setSuccessMessage(null)}
						/>

						{/* Error banner — shown in edit mode when the update API call fails */}
						<ActionMessage
							variant="error"
							message={isEditing ? permissionGroupsActionError : null}
						/>

						{/*
						 * The form element wraps both view and edit modes.
						 * In view mode the submit handler is suppressed (e.preventDefault)
						 * so accidental Enter-key presses don't trigger anything.
						 */}
						<form onSubmit={isEditing ? handleSubmit(onSubmit) : (e) => e.preventDefault()}>
							<Card className={styles.formGrid}>
								<CardHeader>Group Details</CardHeader>
								<CardContent>
									{isEditing ? (
										<>
											<InputField label="Name" name="name" register={register} error={errors.name} />
											<InputField label="Description" name="description" register={register} error={errors.description} />
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

										{isPermissionDefinitionsLoading && (
											<p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading permissions...</p>
										)}

										{permissionDefinitionsError && (
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
												<p className={styles.errorText}>{permissionDefinitionsError}</p>
												<button
													type="button"
													onClick={refetchDefinitions}
													style={{ fontSize: '0.85rem', color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
												>
													Retry
												</button>
											</div>
										)}

										{!isPermissionDefinitionsLoading && !permissionDefinitionsError && (
											<Controller
												name="permissions"
												control={control}
												render={({ field }) => {
													// Add or remove a slug from the selected permissions array.
													const togglePermission = (slug) => {
														const current = field.value || [];
														if (current.includes(slug)) {
															field.onChange(current.filter(p => p !== slug));
														} else {
															field.onChange([...current, slug]);
														}
													};

													// Build a Set of slugs in our local grouping config for O(1) lookups.
													const knownSlugs = new Set(PERMISSION_SCHEMAS.flatMap(s => s.slugs));

													// Keep only slugs the backend confirms are still valid;
													// drop modules where all slugs have been removed server-side.
													const groupedSchemas = PERMISSION_SCHEMAS
														.map(schema => ({
															...schema,
															slugs: schema.slugs.filter(slug => permissionSlugs.includes(slug))
														}))
														.filter(schema => schema.slugs.length > 0);

													// Show any brand-new backend slugs not yet in our grouping config
													// under an "Other" section so they're never silently hidden.
													const otherSlugs = permissionSlugs.filter(slug => !knownSlugs.has(slug));
													if (otherSlugs.length > 0) {
														groupedSchemas.push({ module: "Other", slugs: otherSlugs });
													}

													return (
														<div>
															{groupedSchemas.map(schema => (
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
										)}
									</>
								) : (
									/* View mode — show granted slugs as blue badge pills */
									<div className={styles.slugGrid} style={{ gap: '10px' }}>
										{(permissionGroupDetail.permissions || []).map(slug => (
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
										{(permissionGroupDetail.permissions || []).length === 0 && (
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
