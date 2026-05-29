"use client";

import React, { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./permissions.module.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Eye, Trash2 } from "lucide-react";
import ErrorState from "@/components/UI/ErrorState";
import EmptyState from "@/components/UI/EmptyState";
import { usePermissionGroups } from "@/hooks/usePermissions";
import { format } from "date-fns";

export default function Permissions() {
	// Track which group the user clicked "delete" on before the confirmation modal opens.
	const [showModal, setShowModal] = useState(false);
	const [deletedGroupId, setDeletedGroupId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 8;

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
						<Link href="/permissions/add_new_permissions_group">
							<Button variant="primary" icon={<Plus />}>New Permission Group</Button>
						</Link>
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
									<Table>
										<TableHeader>
											<TableCell>Name</TableCell>
											<TableCell>Description</TableCell>
											<TableCell>Granted Permissions</TableCell>
											<TableCell>Created</TableCell>
											<TableCell>Updated</TableCell>
											<TableCell>Actions</TableCell>
										</TableHeader>
										{permissionGroups?.map?.((group) => (
											<TableContent key={group._id}>
												<TableCell><strong>{group.name}</strong></TableCell>
												<TableCell>
													<span style={{ color: "#6B7280", fontSize: "0.9rem" }}>
														{group.description?.length > 60
															? group.description.substring(0, 60) + "..."
															: group.description}
													</span>
												</TableCell>
												<TableCell>
													<span className={styles.pillBadge}>
														{group.permissions?.length || 0} Modules
													</span>
												</TableCell>
												<TableCell>
													{format(new Date(group.createdAt), "MMM d, yyyy")}
												</TableCell>
												<TableCell>
													{format(new Date(group.updatedAt), "MMM d, yyyy")}
												</TableCell>
												<TableCell>
													<Link href={`/permissions/${group._id}`}>
														<Eye color="#1C4A6E" style={{ width: '1.25rem', height: '1.25rem', marginRight: '1rem' }} />
													</Link>
													<Trash2
														color="#ef4444"
														style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
														onClick={() => deleteHandler(group._id)}
													/>
												</TableCell>
											</TableContent>
										))}
									</Table>

									{/* Only render pagination when there is more than one page */}
									{totalPages > 1 && (
										<ReactPaginate
											pageCount={Math.max(totalPages, 1)}
											forcePage={currentPage - 1} // convert 1-based → 0-based for ReactPaginate
											onPageChange={handlePageClick}
											pageRangeDisplayed={5}
											marginPagesDisplayed={1}
											previousLabel={"Prev"}
											nextLabel={"Next"}
											containerClassName={styles.pagination}
											pageClassName={styles.pageItem}
											pageLinkClassName={styles.pageLink}
											previousClassName={styles.pageItem}
											previousLinkClassName={styles.pageLink}
											nextClassName={styles.pageItem}
											nextLinkClassName={styles.pageLink}
											activeClassName={styles.active}
										/>
									)}
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
