"use client";

import React, { useState, useEffect } from "react";

import PageLayout from "@components/layout/PageLayout";
import ErrorState from "@components/UI/ErrorState";
import styles from "./admins.module.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Eye, Search, Trash2 } from "lucide-react";
import EmptyState from "@components/UI/EmptyState";
import { useAdmins } from "@/hooks/useAdmins";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import { fullName } from "@/utils/formatting";

export default function Admins() {
	const { profile } = useProfile();
	const canCreate = profile?.permissionSlugs?.includes("create_admin");
	const canDeleteAdmin = (admin) =>
		profile?.permissionSlugs?.includes("delete_admin") &&
		(profile?.adminLevel === "super" || admin?.adminLevel !== "super");

	// --- State ---
	const [search, setSearch]               = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter]   = useState("");
	const [homeId, setHomeId]               = useState("");
	const [showModal, setShowModal]         = useState(false);
	const [deletedAdminId, setDeletedAdminId] = useState(null);
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
		admins,
		isLoading,
		totalPages,
		isActionPending,
		fetchError,
		actionError,
		deleteAdmin,
		refetch,
	} = useAdmins({
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

	// --- Handlers ---
	const deleteHandler = (id) => {
		setDeletedAdminId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		if (isActionPending) return;
		setShowModal(false);
	};

	const confirmDelete = () => {
		if (!deletedAdminId) return;
		deleteAdmin(deletedAdminId, {
			onSettled: () => {
				setShowModal(false);
				setDeletedAdminId(null);
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
						<h1>Admin Management</h1>
						{canCreate && (
							<Link href="/admins/add_new_admin">
								<Button variant="primary" icon={<Plus />}>Add New Admin</Button>
							</Link>
						)}
					</div>

					{actionError && <p className={styles.actionError}>{actionError}</p>}

					<ErrorState
						isLoading={isLoading}
						errorMessage={fetchError}
						onRetry={refetch}
					/>

					{!fetchError && !isLoading && (
						<>
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
							{admins.length === 0 ? (
								<div style={{ marginTop: "2rem" }}>
									<EmptyState
										title="No admins found"
										message="There are no administrators matching your criteria."
									/>
								</div>
							) : (
								<div className={styles.tableWrapper}>
									<Table>
										<TableHeader>
											<TableCell>Admin Name</TableCell>
											<TableCell>Employee ID</TableCell>
											<TableCell>Contact</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Actions</TableCell>
										</TableHeader>
										{admins.map((admin) => (
											<TableContent key={admin.id}>
												<TableCell>
													<Image
														src={admin.profilePictureUrl || defaultAvatar}
														width={50}
														height={50}
														alt="avatar"
														style={{ borderRadius: "50%", objectFit: "cover" }}
														unoptimized
													/>
													<span>{fullName(admin)}</span>
												</TableCell>
												<TableCell><span>{admin.employeeId}</span></TableCell>
												<TableCell><span>{admin.email || "-"}</span></TableCell>
												<TableCell>
													<span className={`${styles.statusPill} ${admin.isActive ? styles.statusActive : styles.statusInactive}`}>
														{admin.isActive ? "Active" : "Inactive"}
													</span>
												</TableCell>
												<TableCell>
													<Link href={`/admins/${admin.id}`}>
														<Eye color="#1C4A6EFF" style={{ width: "1.5rem", height: "1.5rem" }} />
													</Link>
													{canDeleteAdmin(admin) && (
														<Trash2
															color="#ef4444"
															style={{ width: "1.5rem", height: "1.5rem", cursor: "pointer", marginLeft: "0.5rem" }}
															onClick={() => deleteHandler(admin.id)}
														/>
													)}
												</TableCell>
											</TableContent>
										))}
									</Table>
									<ReactPaginate
										pageCount={Math.max(totalPages, 1)}
										forcePage={currentPage - 1}
										onPageChange={handlePageClick}
										pageRangeDisplayed={3}
										marginPagesDisplayed={1}
										breakLabel="..."
										breakClassName={styles.pageItem}
										breakLinkClassName={styles.pageLink}
										previousLabel="Prev"
										nextLabel="Next"
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
							)}
						</>
					)}
				</div>
			</PageLayout>

			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this admin?</h2>
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
