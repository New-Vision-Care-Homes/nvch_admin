"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./clients.module.css";
// import DatePicker from "react-datepicker"; // Removed
// import "react-datepicker/dist/react-datepicker.css"; // Removed
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, ChevronDown, Trash2 } from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "@/hooks/useClients";

export default function Clients() {
	const queryClient = useQueryClient();

	// --- State ---
	const [search, setSearch] = useState(""); // Search text
	const [statusFilter, setStatusFilter] = useState(""); // Filter by status (Active/Inactive)
	const [showDropdown, setShowDropdown] = useState(false); // Dropdown visibility

	const [showModal, setShowModal] = useState(false); // Delete confirmation modal
	const [deletedClientId, setDeletedClientId] = useState(null); // ID of client to delete

	// --- Pagination State ---
	const [currentPage, setCurrentPage] = useState(1); // Backend expects 1-indexed
	const itemsPerPage = 5;

	// Determine boolean value for backend based on dropdown status
	let isActiveParam = "";
	if (statusFilter === "Active") isActiveParam = true;
	if (statusFilter === "Inactive") isActiveParam = false;

	// Use backend parameters via hook
	const {
		clients,
		totalPages,
		totalCount,
		isLoading,
		isError,
		errorMessage,
		deleteClient,
		isActionPending
	} = useClients({
		params: {
			page: currentPage,
			limit: itemsPerPage,
			search: search,
			isActive: isActiveParam
		}
	});

	// Reset page to 1 when search query or status filter changes to avoid empty pages
	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter]);

	// --- Delete Handler ---
	const deleteHandler = (id) => {
		setDeletedClientId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		setShowModal(false);
	};

	// --- Confirm Delete ---
	const confirmDelete = async () => {
		deleteClient(deletedClientId);
		setShowModal(false);
		setDeletedClientId(null);
	};

	// --- Pagination Handler ---
	const handlePageClick = (event) => {
		setCurrentPage(event.selected + 1); // event.selected is 0-indexed
	};


	if (isLoading) return <div>Loading clients...</div>;
	if (isError) return <div>Error: {errorMessage}</div>;

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Client Management</h1>
						<Link href="/clients/add_new_client">
							<Button variant="primary" icon={<Plus />}>Add New Client</Button>
						</Link>
					</div>

					{/* Filters */}
					<div className={styles.filter_row}>
						{/* Search Input */}
						<input
							type="text"
							placeholder="Search clients..."
							className={styles.search}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>

						<div className={styles.filter}>
							{/* Status Filter Dropdown */}
							<div className={styles.dropdownContainer}>
								<Button variant="secondary" icon={<ChevronDown />} onClick={() => setShowDropdown(prev => !prev)}>
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

					{/* Clients Table */}
					<div className={styles.tableWrapper}>
						<h2 style={{ marginBottom: "1.5rem" }}>All Clients</h2>
						<Table>
							<TableHeader>
								<TableCell>Client Name</TableCell>
								<TableCell>Client ID</TableCell>
								<TableCell>Contact</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Actions</TableCell>
							</TableHeader>
							{/* Direct map over the backend clients list instead of frontend filtering */}
							{clients.map(client => (
								<TableContent key={client.id}>
									{/* Client Info */}
									<TableCell>
										<Image
											src={client.profilePictureUrl || "/img/navbar/avatar.jpg"}
											width={50}
											height={50}
											alt="avatar"
											style={{ borderRadius: "50%", objectFit: "cover" }}
											unoptimized
										/>
										<span>{client.firstName}</span>
										<span>{client.lastName}</span>
									</TableCell>
									<TableCell>{client.clientId}</TableCell>
									<TableCell>{client.email}</TableCell>

									{/* Status with Color */}
									<TableCell>
										<span className={`${styles.statusPill} ${client.isActive ? styles.statusActive : styles.statusInactive}`}>
											{client.isActive ? "Active" : "Inactive"}
										</span>
									</TableCell>

									{/* Actions */}
									<TableCell>
										<Link href={`/clients/${client.id}`}>
											<Edit color="#1C4A6EFF" style={{ width: '1.5rem', height: '1.5rem' }} />
										</Link>
										<Trash2 color="#ef4444" style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} onClick={() => deleteHandler(client.id)} />
									</TableCell>
								</TableContent>
							))}
						</Table>

						{/* Pagination */}
						<ReactPaginate
							pageCount={totalPages} // use backend pageCount
							forcePage={currentPage - 1} // Sync component with state (0-indexed)
							onPageChange={handlePageClick}
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
				</div>
			</PageLayout>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this client?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete}>Yes</Button>
						<Button variant="secondary" onClick={handleModalCancel}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}

