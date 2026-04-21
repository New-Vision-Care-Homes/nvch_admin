"use client";

import React, { useState, useEffect } from "react";

import PageLayout from "@components/layout/PageLayout";
import styles from "./caregivers.module.css"; // Use client CSS for consistency
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, ChevronDown, Trash2 } from "lucide-react";

import { useCaregivers } from "@/hooks/useCaregivers";
import ErrorState from "@components/UI/ErrorState";

export default function Caregivers() {
	// --- State ---
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [deletedCaregiverId, setDeletedCaregiverId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;

	// Debounce search — only fire API after user stops typing for 400ms
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 400);
		return () => clearTimeout(timer);
	}, [search]);

	let isActiveParam = "";
	if (statusFilter === "Active") isActiveParam = true;
	if (statusFilter === "Inactive") isActiveParam = false;

	const {
		caregivers,
		totalPages,
		isCaregiverLoading,
		isCaregiverActionPending,
		caregiverFetchError,
		caregiverActionError,
		deleteCaregiver,
		refetch,
	} = useCaregivers({
		params: {
			page: currentPage,
			limit: itemsPerPage,
			search: debouncedSearch,
			isActive: isActiveParam,
		}
	});

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch, statusFilter]);

	// --- Handle delete button click ---
	const deleteHandler = (id) => {
		setDeletedCaregiverId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		setShowModal(false);
	};

	// --- Confirm delete ---
	const confirmDelete = async () => {
		if (!deletedCaregiverId) return;
		deleteCaregiver(deletedCaregiverId);
		setShowModal(false);
		setDeletedCaregiverId(null);
	};

	const handlePageClick = (event) => {
		setCurrentPage(event.selected + 1);
	};

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Caregiver Management</h1>
						<Link href="/caregivers/add_new_caregiver">
							<Button variant="primary" icon={<Plus />}>Add New Caregiver</Button>
						</Link>
					</div>

					{/* Action error — shown when delete/create/update fails */}
					<ErrorState
						isLoading={isCaregiverLoading}
						errorMessage={caregiverFetchError}
						onRetry={refetch}
					/>

					{/* Only show filters and table when there is no fetch error and not loading */}
					{!caregiverFetchError && !isCaregiverLoading && (
						<>
							{/* Filters */}
							<div className={styles.filter_row}>
								{/* Search input */}
								<input
									type="text"
									placeholder="Search caregivers..."
									className={styles.search}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>

								{/* Status filter dropdown */}
								<div className={styles.filter}>
									<div className={styles.dropdownContainer}>
										<Button
											variant="secondary"
											icon={<ChevronDown />}
											onClick={() => setShowDropdown(prev => !prev)}
										>
											{statusFilter ? `Status: ${statusFilter}` : "Filter by Status"}
										</Button>
										{showDropdown && (
											<div className={styles.dropdownMenu}>
												<div onClick={() => { setStatusFilter(""); setShowDropdown(false); }}>All</div>
												<div onClick={() => { setStatusFilter("Active"); setShowDropdown(false); }}>Active</div>
												<div onClick={() => { setStatusFilter("Inactive"); setShowDropdown(false); }}>Inactive</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Caregivers Table */}
							<div className={styles.tableWrapper}>
								<h2 style={{ marginBottom: "1.5rem" }}>All Caregivers</h2>
								<Table>
									<TableHeader>
										<TableCell>Caregiver Name</TableCell>
										<TableCell>Employee ID</TableCell>
										<TableCell>Contact</TableCell>
										<TableCell>Status</TableCell>
										<TableCell>Actions</TableCell>
									</TableHeader>
									{caregivers.map(caregiver => (
										<TableContent key={caregiver.id}>
											{/* Name & Avatar */}
											<TableCell>
												<Image
													src={caregiver.profilePictureUrl || defaultAvatar}
													width={50}
													height={50}
													alt="avatar"
													style={{ borderRadius: "50%", objectFit: "cover" }}
													unoptimized
												/>
												<span>{caregiver.firstName} {caregiver.lastName}</span>
											</TableCell>

											{/* Employee ID */}
											<TableCell>{caregiver.employeeId}</TableCell>

											{/* Contact */}
											<TableCell>{caregiver.email || "-"}</TableCell>

											{/* Status with pill */}
											<TableCell>
												<span className={`${styles.statusPill} ${caregiver.isActive ? styles.statusActive : styles.statusInactive}`}>
													{caregiver.isActive ? "Active" : "Inactive"}
												</span>
											</TableCell>

											{/* Actions */}
											<TableCell>
												<Link href={`/caregivers/${caregiver.id}`}>
													<Edit color="#1C4A6EFF" style={{ width: '1.5rem', height: '1.5rem' }} />
												</Link>
												<Trash2
													color="#ef4444"
													style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', marginLeft: '0.5rem' }}
													onClick={() => deleteHandler(caregiver.id)}
												/>
											</TableCell>
										</TableContent>
									))}
								</Table>

								{/* Pagination */}
								<ReactPaginate
									pageCount={Math.max(totalPages, 1)}
									forcePage={currentPage - 1}
									onPageChange={handlePageClick}
									pageRangeDisplayed={Math.max(totalPages, 1)}
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
							</div>
						</>
					)}
				</div>
			</PageLayout>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this caregiver?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete}>Yes</Button>
						<Button variant="secondary" onClick={handleModalCancel}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}

