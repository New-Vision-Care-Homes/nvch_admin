"use client";

import React, { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InputField, InputFieldLR } from "@components/UI/Card";
import styles from "../permissions_group.module.css";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { PERMISSION_SCHEMAS, ALL_PERMISSION_SLUGS } from "@/utils/permissions";

export default function AddPermissionGroupPage() {
	const router = useRouter();
	const { addPermissionGroup, isPermissionGroupsActionPending, actionError } = usePermissionGroups();

	const { register, handleSubmit, control, formState: { errors }, setError } = useForm({
		defaultValues: {
			name: "",
			description: "",
			permissions: []
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

		// Validation: Name cannot equal any slug name
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

				{actionError && <div className={styles.globalError}>{actionError}</div>}

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

						<Controller
							name="permissions"
							control={control}
							render={({ field }) => {
								
								// Toggle a single permission
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
