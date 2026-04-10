"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./clients.module.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, ChevronDown, Trash2 } from "lucide-react";
import ErrorState from "@/components/UI/ErrorState";
import { useClients } from "@/hooks/useClients";

export default function Clients() {

	// --- State ---
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [deletedClientId, setDeletedClientId] = useState(null);
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
		clients,
		totalPages,
		isLoading,
		fetchError,
		actionError,
		isActionPending,
		deleteClient,
		refetch,
	} = useClients({
		params: {
			page: currentPage,
			limit: itemsPerPage,
			search: debouncedSearch,
			isActive: isActiveParam,
		}
	});

	console.log("test", {
		currentPage,
		totalPages,
		clientsLength: clients.length,
		debouncedSearch
	});

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch, statusFilter]);

	// --- Handlers ---
	const deleteHandler = (id) => {
		setDeletedClientId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		setShowModal(false);
	};

	const confirmDelete = () => {
		deleteClient(deletedClientId);
		setShowModal(false);
		setDeletedClientId(null);

		if (clients.length === 1 && currentPage > 1) {
			setCurrentPage(prev => prev - 1);
		}
	};

	const handlePageClick = (event) => {
		setCurrentPage(event.selected + 1);
	};

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>

					{/* Header — always visible */}
					<div className={styles.header}>
						<h1>Client Management</h1>
						<Link href="/clients/add_new_client">
							<Button variant="primary" icon={<Plus />}>Add New Client</Button>
						</Link>
					</div>

					{/* Action error — shown when delete/create/update fails */}
					{actionError && (
						<p className={styles.actionError}>{actionError}</p>
					)}

					{/* Fetch error or loading state */}
					<ErrorState
						isLoading={isLoading}
						errorMessage={fetchError}
						onRetry={refetch}
					/>

					{/* Main content — only shown when not loading and no fetch error */}
					{!isLoading && !fetchError && (
						<>
							{/* Filters */}
							<div className={styles.filter_row}>
								<input
									type="text"
									placeholder="Search clients..."
									className={styles.search}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
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
									{clients.map(client => (
										<TableContent key={client.id}>
											<TableCell>
												<Image
													src={client.profilePictureUrl || defaultAvatar}
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
											<TableCell>
												<span className={`${styles.statusPill} ${client.isActive ? styles.statusActive : styles.statusInactive}`}>
													{client.isActive ? "Active" : "Inactive"}
												</span>
											</TableCell>
											<TableCell>
												<Link href={`/clients/${client.id}`}>
													<Edit color="#1C4A6EFF" style={{ width: '1.5rem', height: '1.5rem' }} />
												</Link>
												<Trash2
													color="#ef4444"
													style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
													onClick={() => deleteHandler(client.id)}
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
							</div>
						</>
					)}

				</div>
			</PageLayout>

			{/* Delete Confirmation Modal */}
			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this client?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isActionPending}>
							{isActionPending ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={handleModalCancel}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}

