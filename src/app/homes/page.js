"use client";

import React, { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./homes.module.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import ReactPaginate from "react-paginate";
import Link from "next/link";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import ErrorState from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import { format } from "date-fns";
import { useHomes } from "@/hooks/useHomes";
import Modal from "@components/UI/Modal";

export default function Homes() {
	// --- State for Pagination ---
	const [currentPage, setCurrentPage] = useState(0); // 0-indexed for ReactPaginate
	const itemsPerPage = 10; // Default limit

	// --- Fetch Data ---
	// API is likely 1-indexed for page, so we send currentPage + 1
	const {
		homes,
		pagination,
		isLoading,
		fetchError,
		actionError,
		deleteHome,
		refetch
	} = useHomes({
		page: currentPage + 1,
		limit: itemsPerPage
	});

	// --- Delete State ---
	const [showModal, setShowModal] = useState(false);
	const [deletedHomeId, setDeletedHomeId] = useState(null);

	const handleDeleteClick = (id) => {
		setDeletedHomeId(id);
		setShowModal(true);
	};

	const confirmDelete = async () => {
		if (deletedHomeId) {
			await deleteHome(deletedHomeId);
			setShowModal(false);
			setDeletedHomeId(null);
		}
	};

	const handlePageClick = (event) => {
		setCurrentPage(event.selected);
	};

	// Calculate pagination info from API response if available, else fallback
	const pageCount = pagination?.totalPages || 1;

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Homes</h1>
						<Link href="/homes/add_new_home">
							<Button variant="primary" icon={<Plus />}>Add New Home</Button>
						</Link>
					</div>

					{actionError && <ActionMessage variant="error" message={actionError} />}

					{/* Homes Table */}
					<div className={styles.tableWrapper}>
						<h2 style={{ marginBottom: "1.5rem" }}>All Housing Units</h2>
						
						<ErrorState
							isLoading={isLoading}
							errorMessage={fetchError}
							onRetry={refetch}
						/>

						{!isLoading && !fetchError && (
							<Table>
								<TableHeader>
									<TableCell>Home Name</TableCell>
									<TableCell>Region</TableCell>
									<TableCell>Program Type</TableCell>
									<TableCell>Address</TableCell>
									<TableCell>Caregivers</TableCell>
									<TableCell>Admins</TableCell>
									<TableCell>Clients</TableCell>
									<TableCell>Night Check</TableCell>
									<TableCell>Status</TableCell>
									<TableCell>Opened At</TableCell>
									<TableCell>Actions</TableCell>
								</TableHeader>
								{homes && homes.length > 0 ? (
									homes.map((home) => (
										<TableContent key={home.id || home._id}>
											{/* Home Name */}
											<TableCell>
												<span style={{ fontWeight: 600 }}>{home.name}</span>
											</TableCell>

											{/* Region */}
											<TableCell>{home.region}</TableCell>

											{/* Program Type */}
											<TableCell>
												{home.programTypes?.join(", ") || "-"}
											</TableCell>

											{/* Address */}
											<TableCell>
												{home.address ? `${home.address.street}, ${home.address.city}` : "-"}
											</TableCell>

											{/* Caregivers */}
											<TableCell>
												{home.caregivers?.length || 0}
											</TableCell>

											{/* Admins */}
											<TableCell>
												{home.admins?.length || 0}
											</TableCell>

											{/* Client Number */}
											<TableCell>
												{home.clients?.length || 0}
											</TableCell>

											{/* Night Check */}
											<TableCell>
												{home.nightChecksEnabled
													? `Every ${home.nightCheckFrequency} min`
													: "Disabled"
												}
											</TableCell>

											{/* Status */}
											<TableCell>
												<span className={`${styles.statusPill} ${home.isActive ? styles.statusActive : styles.statusInactive}`}>
													{home.isActive ? "Active" : "Inactive"}
												</span>
											</TableCell>

											{/* Opened At */}
											<TableCell>
												{home.openedAt ? format(new Date(home.openedAt), "MMM d, yyyy") : "-"}
											</TableCell>

											{/* Actions */}
											<TableCell>
												<Link href={`/homes/${home.id || home._id}`}>
													<Edit color="#1C4A6EFF" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} />
												</Link>
												<Trash2
													color="#ef4444"
													style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
													onClick={() => handleDeleteClick(home.id || home._id)}
												/>
											</TableCell>
										</TableContent>
									))
								) : (
									<div style={{ padding: "1rem" }}>No homes found.</div>
								)}
							</Table>
						)}

						{/* Pagination */}
						{!isLoading && !fetchError && pageCount > 1 && (
							<ReactPaginate
								pageCount={pageCount}
								onPageChange={handlePageClick}
								forcePage={currentPage}
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
				</div>
			</PageLayout>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this home?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete}>Yes</Button>
						<Button variant="secondary" onClick={() => setShowModal(false)}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
