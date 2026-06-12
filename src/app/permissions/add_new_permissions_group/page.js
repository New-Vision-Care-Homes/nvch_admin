"use client";

import React from "react";
import PageLayout from "@components/layout/PageLayout";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import styles from "../permissions_group.module.css";
import { usePermissionGroups, usePermissionDefinitions } from "@/hooks/usePermissions";
import { PERMISSION_SCHEMAS, IMPLICIT_SELF_SLUGS } from "@/utils/permissions";

export default function AddPermissionGroupPage() {
	const router = useRouter();

	const { addPermissionGroup, isPermissionGroupsActionPending, permissionGroupsActionError } = usePermissionGroups();

	// Fetch the live slug list from the backend.
	// We use this instead of the hardcoded utils/permissions.js array so that
	// new slugs added server-side appear here without any frontend changes.
	const {
		permissionSlugs,
		isPermissionDefinitionsLoading,
		permissionDefinitionsError,
		refetchDefinitions,
	} = usePermissionDefinitions();

	const { register, handleSubmit, control, formState: { errors }, setError } = useForm({
		defaultValues: {
			name: "",
			description: "",
			permissions: [],
		}
	});

	const onSubmit = (data) => {
		if (!data.name || data.name.trim().length < 3) {
			setError("name", { type: "manual", message: "Group name must be at least 3 characters." });
			return;
		}
		if (!data.description || data.description.trim() === "") {
			setError("description", { type: "manual", message: "Description is required." });
			return;
		}
		// Prevent accidentally naming a group the same as a permission slug,
		// which would be confusing when assigning permissions to users. The
		// backend checks the full catalog, including the implicit self slugs
		// that the definitions endpoint no longer returns.
		if (permissionSlugs.includes(data.name.trim()) || IMPLICIT_SELF_SLUGS.includes(data.name.trim())) {
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

		addPermissionGroup(data, {
			onSuccess: () => {
				router.push("/permissions");
			}
		});
	};

	return (
		<PageLayout>
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>Create New Permission Group</h1>
				</div>

				{/* API error from the create mutation (e.g. duplicate name) */}
				{permissionGroupsActionError && (
					<div className={styles.globalError}>{permissionGroupsActionError}</div>
				)}

				<form onSubmit={handleSubmit(onSubmit)}>
					<Card className={styles.formGrid}>
						<CardHeader>Group Details</CardHeader>
						<CardContent>
							<InputField
								label="Name"
								name="name"
								placeholder="Enter group name (e.g. Caregiver managers)"
								register={register}
								error={errors.name}
							/>
							<InputField
								label="Description"
								name="description"
								placeholder="Describe what users in this group can do"
								register={register}
								error={errors.description}
							/>
						</CardContent>
					</Card>

					<div className={styles.permissionsContainer}>
						<h2 className={styles.permissionsHeader}>Module Permissions</h2>

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

									// Build a Set of slugs that exist in our local grouping config.
									// Using a Set here gives O(1) lookups in the filter below.
									const knownSlugs = new Set(PERMISSION_SCHEMAS.flatMap(s => s.slugs));

									// For each local module group, keep only the slugs that the
									// backend confirmed are still valid. Drop the whole module if
									// none of its slugs are active anymore.
									const groupedSchemas = PERMISSION_SCHEMAS
										.map(schema => ({
											...schema,
											slugs: schema.slugs.filter(slug => permissionSlugs.includes(slug))
										}))
										.filter(schema => schema.slugs.length > 0);

									// Any slug the backend returned that isn't in our local grouping
									// config (e.g. a brand-new slug added server-side) goes into
									// an "Other" section so it's never silently hidden.
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
					</div>

					<div className={styles.btnGroup}>
						<Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
						<Button type="submit" variant="primary" disabled={isPermissionGroupsActionPending}>
							{isPermissionGroupsActionPending ? "Saving..." : "Create Group"}
						</Button>
					</div>
				</form>
			</div>
		</PageLayout>
	);
}
