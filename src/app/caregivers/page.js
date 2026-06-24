"use client";

import React, { useState, useEffect } from "react";

import PageLayout from "@components/layout/PageLayout";
import styles from "./caregivers.module.css";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import defaultAvatar from "@/assets/img/navbar/avatar.jpg";
import Pagination from "@components/UI/Pagination";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Eye, Search, Trash2 } from "lucide-react";

import { useCaregivers } from "@/hooks/useCaregivers";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { fullName } from "@/utils/formatting";
import ErrorState from "@components/UI/ErrorState";
import EmptyState from "@components/UI/EmptyState";
import ActionMessage from "@components/UI/ActionMessage";

export default function Caregivers() {
	const { profile } = useProfile();
	const slugs = profile?.permissionSlugs ?? [];
	const canCreate = slugs.includes("create_caregivers");
	const canView = slugs.includes("view_all_caregivers") || slugs.includes("view_assigned_caregivers");
	const canDeleteCaregiver = (caregiver) =>
		canManageTarget(profile, caregiver, "delete_all_caregivers", "delete_assigned_caregivers");

	// --- State ---
	const [search, setSearch]               = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter]   = useState("Active");
	const [homeId, setHomeId]               = useState("");
	const [showModal, setShowModal]         = useState(false);
	const [deletedCaregiverId, setDeletedCaregiverId] = useState(null);
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
		setDeletedCaregiverId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
		if (isCaregiverActionPending) return;
		setShowModal(false);
	};

	const confirmDelete = () => {
		if (!deletedCaregiverId) return;
		deleteCaregiver(deletedCaregiverId, {
			onSettled: () => {
				setShowModal(false);
				setDeletedCaregiverId(null);
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
						<h1>Caregiver Management</h1>
						{canCreate && (
							<Link href="/caregivers/add_new_caregiver">
								<Button variant="primary" icon={<Plus />}>Add New Caregiver</Button>
							</Link>
						)}
					</div>

					<ActionMessage variant="error" message={caregiverActionError} />

					<ErrorState
						isLoading={isCaregiverLoading}
						errorMessage={caregiverFetchError}
						onRetry={refetch}
					/>

					{!caregiverFetchError && !isCaregiverLoading && (
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
							{caregivers.length === 0 ? (
								<div className={styles.emptyWrapper}>
									<EmptyState
										title="No caregivers found"
										message="There are no caregivers matching your criteria."
									/>
								</div>
							) : (
								<div className={styles.tableWrapper}>
									<Table>
										<TableHeader>
											<TableCell className={styles.firstCol}>Caregiver Name</TableCell>
											<TableCell>Employee ID</TableCell>
											<TableCell>Contact</TableCell>
											<TableCell>Status</TableCell>
											<TableCell>Actions</TableCell>
										</TableHeader>
										{caregivers.map((caregiver) => (
											<TableContent key={caregiver.id}>
												<TableCell className={styles.firstCol}>
													<Image
														src={caregiver.profilePictureUrl || defaultAvatar}
														width={50}
														height={50}
														alt="avatar"
														style={{ borderRadius: "50%", objectFit: "cover" }}
														unoptimized
													/>
													<span>{fullName(caregiver)}</span>
												</TableCell>
												<TableCell><span>{caregiver.employeeId}</span></TableCell>
												<TableCell><span>{caregiver.email || "-"}</span></TableCell>
												<TableCell>
													<span className={`${styles.statusPill} ${caregiver.isActive ? styles.statusActive : styles.statusInactive}`}>
														{caregiver.isActive ? "Active" : "Inactive"}
													</span>
												</TableCell>
												<TableCell>
													<div className={styles.actionsCell}>
														{canView && (
															<IconButton href={`/caregivers/${caregiver.id}`} title="View Caregiver">
																<Eye size={15} />
															</IconButton>
														)}
														{canDeleteCaregiver(caregiver) && (
															<IconButton variant="danger" onClick={() => deleteHandler(caregiver.id)} title="Delete Caregiver">
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
					<h2>Are you sure you want to delete this caregiver?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isCaregiverActionPending}>
							{isCaregiverActionPending ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={handleModalCancel} disabled={isCaregiverActionPending}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
