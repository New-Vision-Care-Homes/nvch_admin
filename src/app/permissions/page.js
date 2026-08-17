"use client";

import React, { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./permissions.module.css";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import { PageTable, PageTableRow } from "@components/UI/Table";
import Pagination from "@components/UI/Pagination";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Eye, Trash2 } from "lucide-react";
import ErrorState from "@/components/UI/ErrorState";
import EmptyState from "@/components/UI/EmptyState";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";

export default function Permissions() {
	// Track which group the user clicked "delete" on before the confirmation modal opens.
	const [showModal, setShowModal] = useState(false);
	const [deletedGroupId, setDeletedGroupId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 8;

	const { profile } = useProfile();
	const slugs = profile?.permissionSlugs ?? [];
	// Creating a group uses the same backend slug as updating one.
	const canUpdate = slugs.includes("update_permissions_groups");
	const canDelete = slugs.includes("delete_permissions_groups");

	const {
		permissionGroups,
		totalPages,
		isPermissionGroupsLoading,
		permissionGroupsFetchError,   // shown via <ErrorState> (full-page error UI)
		permissionGroupsActionError,  // shown inline above the table (delete errors)
		isPermissionGroupsActionPending,
		deletePermissionGroup,
		refetch,
	} = usePermissionGroups({
		params: {
			page: currentPage,
			limit: itemsPerPage,
		}
	});

	// Open the confirmation modal and remember which group was targeted.
	const deleteHandler = (id) => {
		setDeletedGroupId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		setShowModal(false);
	};

	const confirmDelete = () => {
		deletePermissionGroup(deletedGroupId, {
			onSettled: () => {
				setShowModal(false);
				setDeletedGroupId(null);
				// If the user deleted the last item on a non-first page,
				// step back one page so they don't land on an empty page.
				if (permissionGroups.length === 1 && currentPage > 1) {
					setCurrentPage(prev => prev - 1);
				}
			}
		});
	};

	// ReactPaginate uses 0-based page index; our API uses 1-based pages.
	const handlePageClick = (event) => {
		setCurrentPage(event.selected + 1);
	};

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>

					{/* Header */}
					<div className={styles.header}>
						<h1>Permission Groups</h1>
						{canUpdate && (
							<Link href="/permissions/add_new_permissions_group">
								<Button variant="primary" icon={<Plus />}>New Permission Group</Button>
							</Link>
						)}
					</div>

					{/* Inline error for delete failures */}
					{permissionGroupsActionError && (
						<p className={styles.actionError}>{permissionGroupsActionError}</p>
					)}

					{/* Full-page loading / error state */}
					<ErrorState
						isLoading={isPermissionGroupsLoading}
						errorMessage={permissionGroupsFetchError}
						onRetry={refetch}
					/>

					{!isPermissionGroupsLoading && !permissionGroupsFetchError && (
						<>
							{permissionGroups?.length === 0 ? (
								<EmptyState
									title="No permission groups found"
									message="There are no permission groups matching your criteria."
								/>
							) : (
								<div className={styles.tableWrapper}>
									<PageTable>
										<thead>
											<tr>
												<th>Name</th>
												<th>Description</th>
												<th>Granted Permissions</th>
												<th>Created</th>
												<th>Updated</th>
												<th>Actions</th>
											</tr>
										</thead>
										<tbody>
											{permissionGroups?.map?.((group, idx) => (
												<PageTableRow key={group._id} isEven={idx % 2 !== 0}>
													<td><strong>{group.name}</strong></td>
													<td>
														<span style={{ color: "#6B7280", fontSize: "0.9rem" }}>
															{group.description?.length > 60
																? group.description.substring(0, 60) + "..."
																: group.description}
														</span>
													</td>
													<td>
														<span className={styles.pillBadge}>
															{group.permissions?.length || 0} Modules
														</span>
													</td>
													<td>
														{format(new Date(group.createdAt), "MMM d, yyyy")}
													</td>
													<td>
														{format(new Date(group.updatedAt), "MMM d, yyyy")}
													</td>
													<td>
														<div className={styles.actionsCell}>
															<IconButton href={`/permissions/${group._id}`} title="View Permission Group">
																<Eye size={15} />
															</IconButton>
															{canDelete && (
																<IconButton variant="danger" onClick={() => deleteHandler(group._id)} title="Delete Permission Group">
																	<Trash2 size={15} />
																</IconButton>
															)}
														</div>
													</td>
												</PageTableRow>
											))}
										</tbody>
									</PageTable>

									<Pagination pageCount={totalPages} forcePage={currentPage - 1} onPageChange={handlePageClick} />
								</div>
							)}
						</>
					)}
				</div>
			</PageLayout>

			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Delete Permission Group?</h2>
					<p style={{ marginTop: '0.5rem', color: '#4B5563', fontSize: '0.9rem' }}>
						Users assigned to this group will lose these permissions if deleted. This action cannot be undone.
					</p>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isPermissionGroupsActionPending}>
							{isPermissionGroupsActionPending ? "Deleting..." : "Yes, Delete"}
						</Button>
						<Button variant="secondary" onClick={handleModalCancel}>Cancel</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
