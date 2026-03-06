"use client";

import React, { useState } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./admins.module.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, ChevronDown, Trash2 } from "lucide-react";

import { useAdmins } from "@/hooks/useAdmins";

export default function Admins() {
	const {
		admins,
		isLoading,
		isError,
		errorMessage,
		deleteAdmin,
	} = useAdmins();

	// --- State ---
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);

	const [showModal, setShowModal] = useState(false);
	const [deletedAdminId, setDeletedAdminId] = useState(null);

	// --- Handle delete button click ---
	const deleteHandler = (id) => {
		setDeletedAdminId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		setShowModal(false);
	};

	// --- Confirm delete ---
	const confirmDelete = async () => {
		if (!deletedAdminId) return;
		deleteAdmin(deletedAdminId);

		setShowModal(false);
		setDeletedAdminId(null);
	};

	// --- Filter admins ---
	const filteredAdmins = admins.filter(admin => {
		const searchLower = search.toLowerCase();
		const matchesSearch =
			admin.firstName.toLowerCase().includes(searchLower) ||
			admin.lastName.toLowerCase().includes(searchLower);

		const matchesStatus = statusFilter
			? (statusFilter === "Active" ? admin.isActive : !admin.isActive)
			: true;

		return matchesSearch && matchesStatus;
	});

	console.log(filteredAdmins);

	// --- Pagination ---
	const itemsPerPage = 5;
	const [currentPage, setCurrentPage] = useState(0);
	const offset = currentPage * itemsPerPage;
	const currentItems = filteredAdmins.slice(offset, offset + itemsPerPage);
	const pageCount = Math.ceil(filteredAdmins.length / itemsPerPage);
	const handlePageClick = (event) => setCurrentPage(event.selected);

	if (isLoading) return <div>Loading admins...</div>;
	if (isError) return <div>Error: {errorMessage}</div>;

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Admin Management</h1>
						<Link href="/admins/add_new_admin">
							<Button variant="primary" icon={<Plus />}>Add New Admin</Button>
						</Link>
					</div>

					{/* Filters */}
					<div className={styles.filter_row}>
						{/* Search input */}
						<input
							type="text"
							placeholder="Search admins..."
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

					{/* Admins Table */}
					<div className={styles.tableWrapper}>
						<h2 style={{ marginBottom: "1.5rem" }}>All Admins</h2>
						<Table>
							<TableHeader>
								<TableCell>Admin Name</TableCell>
								<TableCell>Employee ID</TableCell>
								<TableCell>Contact</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Actions</TableCell>
							</TableHeader>
							{currentItems.map(admin => (
								<TableContent key={admin.id}>
									{/* Name & Avatar */}
									<TableCell>
										<Image
											src={admin.profilePictureUrl || admin.profilePicture || "/img/navbar/avatar.jpg"}
											width={50}
											height={50}
											alt="avatar"
											style={{ borderRadius: "50%", objectFit: "cover" }}
											unoptimized
										/>
										<span>{admin.firstName} {admin.lastName}</span>
									</TableCell>

									{/* Employee ID */}
									<TableCell>{admin.employeeId}</TableCell>

									{/* Contact */}
									<TableCell>{admin.email || "-"}</TableCell>

									{/* Status with pill */}
									<TableCell>
										<span className={`${styles.statusPill} ${admin.isActive ? styles.statusActive : styles.statusInactive}`}>
											{admin.isActive ? "Active" : "Inactive"}
										</span>
									</TableCell>

									{/* Actions */}
									<TableCell>
										<Link href={`/admins/${admin.id}`}>
											<Edit color="#1C4A6EFF" style={{ width: '1.5rem', height: '1.5rem' }} />
										</Link>
										<Trash2
											color="#ef4444"
											style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', marginLeft: '0.5rem' }}
											onClick={() => deleteHandler(admin.id)}
										/>
									</TableCell>
								</TableContent>
							))}
						</Table>

						{/* Pagination */}
						<ReactPaginate
							pageCount={pageCount}
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
					<h2>Are you sure you want to delete this admin?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete}>Yes</Button>
						<Button variant="secondary" onClick={handleModalCancel}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
