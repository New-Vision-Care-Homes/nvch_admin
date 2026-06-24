"use client";

import React, { useState, useEffect } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./clients.module.css";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Pagination from "@components/UI/Pagination";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, Search, Trash2 } from "lucide-react";
import ErrorState from "@/components/UI/ErrorState";
import EmptyState from "@/components/UI/EmptyState";
import { useClients } from "@/hooks/useClients";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { REGION_COLORS, COLOR_FALLBACK } from "@/utils/dropdown_list";

export default function Clients() {
	const { profile } = useProfile();
	const slugs = profile?.permissionSlugs ?? [];
	const canCreate = slugs.includes("create_clients");
	const canDeleteClient = (client) => canManageTarget(profile, client, "delete_all_clients", "delete_assigned_clients");

	// --- State ---
	const [search, setSearch]               = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter]   = useState("");
	const [homeId, setHomeId]               = useState("");
	const [showModal, setShowModal]         = useState(false);
	const [deletedClientId, setDeletedClientId] = useState(null);
	const [currentPage, setCurrentPage]     = useState(1);
	const itemsPerPage = 10;

	// Debounce search — only fire API after user stops typing for 400 ms
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 400);
		return () => clearTimeout(timer);
	}, [search]);

	let isActiveParam = "";
	if (statusFilter === "Active")   isActiveParam = true;
	if (statusFilter === "Inactive") isActiveParam = false;

	const { homes } = useHomes({ limit: 100 });

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
			page:     currentPage,
			limit:    itemsPerPage,
			search:   debouncedSearch,
			isActive: isActiveParam,
			homeId,
		},
	});

	// Reset to page 1 when any filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearch, statusFilter, homeId]);

	// Step back to the previous page if the current one becomes empty after a delete
	useEffect(() => {
		if (!isLoading && clients.length === 0 && currentPage > 1) {
			setCurrentPage((prev) => prev - 1);
		}
	}, [clients, isLoading, currentPage]);

	// --- Handlers ---
	const deleteHandler = (id) => {
		setDeletedClientId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		if (isActionPending) return;
		setShowModal(false);
	};

	const confirmDelete = () => {
		deleteClient(deletedClientId, {
			onSettled: () => {
				setShowModal(false);
				setDeletedClientId(null);
			},
		});
	};

	const handlePageClick = (event) => setCurrentPage(event.selected + 1);

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Client Management</h1>
						{canCreate && (
							<Link href="/clients/add_new_client">
								<Button variant="primary" icon={<Plus />}>Add New Client</Button>
							</Link>
						)}
					</div>

					{actionError && <p className={styles.actionError}>{actionError}</p>}

					<ErrorState
						isLoading={isLoading}
						errorMessage={fetchError}
						onRetry={refetch}
					/>

					{!isLoading && !fetchError && (
						<div className={styles.tableCard}>
							{/* Filter bar */}
							<div className={styles.filter_row}>
								<div className={styles.searchWrapper}>
									<Search size={15} className={styles.searchIcon} />
									<input
										type="text"
										placeholder="Search by name, email or ID…"
										className={styles.search}
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
								<select
									className={styles.filterSelect}
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
								>
									<option value="">All Status</option>
									<option value="Active">Active</option>
									<option value="Inactive">Inactive</option>
								</select>
								<select
									className={styles.filterSelect}
									value={homeId}
									onChange={(e) => setHomeId(e.target.value)}
								>
									<option value="">All Homes</option>
									{homes?.map((h) => {
										const id = h._id || h.id;
										return (
											<option key={id} value={id}>
												{h.name || h.homeName || id}
											</option>
										);
									})}
								</select>
							</div>

							{/* Table */}
							{clients.length === 0 ? (
								<div className={styles.emptyWrapper}>
									<EmptyState
										title="No clients found"
										message="There are no clients matching your criteria."
									/>
								</div>
							) : (
								<div className={styles.tableWrapper}>
									<Table>
										<TableHeader>
											<TableCell className={styles.firstCol}>Client Name</TableCell>
											<TableCell>Client ID</TableCell>
											<TableCell>Region</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Actions</TableCell>
										</TableHeader>
										{clients.map((client) => (
											<TableContent key={client.id}>
												<TableCell className={styles.firstCol}>
													<Image
														src={client.profilePictureUrl || defaultAvatar}
														width={50}
														height={50}
														alt="avatar"
														style={{ borderRadius: "50%", objectFit: "cover" }}
														unoptimized
													/>
													<span>{client.firstName} {client.lastName}</span>
												</TableCell>
												<TableCell><span>{client.clientId}</span></TableCell>
												<TableCell>
													{client.region ? (() => {
														const c = REGION_COLORS[client.region] ?? COLOR_FALLBACK;
														return (
															<span style={{ display: "inline-block", padding: "0.2rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
																{client.region}
															</span>
														);
													})() : <span style={{ color: "#94a3b8" }}>—</span>}
												</TableCell>
												<TableCell>
													<span className={`${styles.statusPill} ${client.isActive ? styles.statusActive : styles.statusInactive}`}>
														{client.isActive ? "Active" : "Inactive"}
													</span>
												</TableCell>
												<TableCell>
													<div className={styles.actionsCell}>
														<IconButton href={`/clients/${client.id}`} title="View Client">
															<Edit size={15} />
														</IconButton>
														{canDeleteClient(client) && (
															<IconButton variant="danger" onClick={() => deleteHandler(client.id)} title="Delete Client">
																<Trash2 size={15} />
															</IconButton>
														)}
													</div>
												</TableCell>
											</TableContent>
										))}
									</Table>
									<Pagination pageCount={totalPages} forcePage={currentPage - 1} onPageChange={handlePageClick} />
								</div>
							)}
					</div>
					)}
				</div>
			</PageLayout>

			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this client?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isActionPending}>
							{isActionPending ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={handleModalCancel} disabled={isActionPending}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
