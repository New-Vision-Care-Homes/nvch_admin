"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import styles from "./homes.module.css";
import Button from "@components/UI/Button";
import ReactPaginate from "react-paginate";
import Link from "next/link";
import { Building2, Trash2, Plus, Users, User, MapPin, Search, X } from "lucide-react";
import ErrorState from "@components/UI/ErrorState";
import EmptyState from "@components/UI/EmptyState";
import ActionMessage from "@components/UI/ActionMessage";
import { format } from "date-fns";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import Modal from "@components/UI/Modal";
import {
	HOME_TYPE_OPTIONS,
	HOME_TYPE_COLORS,
	REGION_OPTIONS,
	REGION_COLORS,
	COLOR_FALLBACK,
} from "@/utils/dropdown_list";

export default function Homes() {
	const router = useRouter();
	const { profile } = useProfile();
	const slugs = profile?.permissionSlugs ?? [];
	const canCreate = slugs.includes("create_home");
	const canDelete = slugs.includes("delete_home");

	// --- Pagination ---
	const [currentPage, setCurrentPage] = useState(0);
	const itemsPerPage = 10;

	// --- Filters ---
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [regionFilter, setRegionFilter] = useState("");
	const [homeTypeFilter, setHomeTypeFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	// Debounce search 400 ms before sending to API
	useEffect(() => {
		const timer = setTimeout(() => setSearch(searchInput), 400);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Reset to page 1 whenever any filter changes
	useEffect(() => {
		setCurrentPage(0);
	}, [search, regionFilter, homeTypeFilter, statusFilter]);

	// --- Fetch ---
	const queryParams = {
		page: currentPage + 1,
		limit: itemsPerPage,
		...(search && { search }),
		...(regionFilter && { region: regionFilter }),
		...(homeTypeFilter && { homeType: homeTypeFilter }),
		...(statusFilter !== "" && { isActive: statusFilter }),
	};

	const {
		homes,
		pagination,
		isLoading,
		fetchError,
		actionError,
		isActionPending,
		deleteHome,
		refetch,
	} = useHomes(queryParams);

	// --- Delete ---
	const [showModal, setShowModal] = useState(false);
	const [deletedHomeId, setDeletedHomeId] = useState(null);

	const handleDeleteClick = (id) => { setDeletedHomeId(id); setShowModal(true); };
	const closeModal = () => { if (isActionPending) return; setShowModal(false); };
	const confirmDelete = async () => {
		if (!deletedHomeId) return;
		try { await deleteHome(deletedHomeId); }
		catch { /* surfaced via actionError */ }
		finally { setShowModal(false); setDeletedHomeId(null); }
	};

	const handlePageClick = (event) => setCurrentPage(event.selected);
	const pageCount = pagination?.totalPages || 1;

	const hasFilters = searchInput || regionFilter || homeTypeFilter || statusFilter !== "";
	const clearFilters = () => {
		setSearchInput(""); setSearch("");
		setRegionFilter(""); setHomeTypeFilter(""); setStatusFilter("");
	};

	return (
		<>
			<PageLayout>
				<div className={styles.pageContainer}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Homes</h1>
						{canCreate && (
							<Link href="/homes/add_new_home">
								<Button variant="primary" icon={<Plus />}>Add New Home</Button>
							</Link>
						)}
					</div>

					{actionError && <ActionMessage variant="error" message={actionError} />}

					<div className={styles.tableWrapper}>
						{/* Filter bar */}
						<div className={styles.filterBar}>
							<div className={styles.searchWrap}>
								<Search size={14} className={styles.searchIcon} />
								<input
									className={styles.searchInput}
									type="text"
									placeholder="Search homes…"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
								/>
								{searchInput && (
									<button className={styles.searchClear} onClick={() => { setSearchInput(""); setSearch(""); }}>
										<X size={13} />
									</button>
								)}
							</div>

							<select className={styles.filterSelect} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
								<option value="">All Regions</option>
								{REGION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>

							<select className={styles.filterSelect} value={homeTypeFilter} onChange={(e) => setHomeTypeFilter(e.target.value)}>
								<option value="">All Types</option>
								{HOME_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>

							<select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
								<option value="">All Statuses</option>
								<option value="true">Active</option>
								<option value="false">Inactive</option>
							</select>

							{hasFilters && (
								<button className={styles.clearBtn} onClick={clearFilters}>
									<X size={12} /> Clear
								</button>
							)}

							{pagination?.total != null && (
								<span className={styles.totalBadge}>{pagination.total} total</span>
							)}
						</div>

						{/* Color legend */}
						<div className={styles.legend}>
							<span className={styles.legendLabel}>Type:</span>
							{HOME_TYPE_OPTIONS.map((o) => {
								const c = HOME_TYPE_COLORS[o.value] || COLOR_FALLBACK;
								return (
									<span key={o.value} className={styles.legendChip} style={{ background: c.bg, color: c.text, borderColor: c.border }}>
										{o.label}
									</span>
								);
							})}
							<span className={styles.legendSep} />
							<span className={styles.legendLabel}>Region:</span>
							{REGION_OPTIONS.map((o) => {
								const c = REGION_COLORS[o.value] || COLOR_FALLBACK;
								return (
									<span key={o.value} className={styles.legendChip} style={{ background: c.bg, color: c.text, borderColor: c.border }}>
										{o.label}
									</span>
								);
							})}
						</div>

						<ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

						{!isLoading && !fetchError && (
							<>
								{homes && homes.length > 0 ? (
									<div className={styles.tableWrap}>
										<table className={styles.homesTable}>
											<thead>
												<tr>
													<th>Home</th>
													<th>Type</th>
													<th>Region</th>
													<th>Address</th>
													<th>Caregivers</th>
													<th>Admins</th>
													<th>Clients</th>
													<th>Status</th>
													<th>Opened</th>
													{canDelete && <th></th>}
												</tr>
											</thead>
											<tbody>
												{homes.map((home, idx) => {
													const homeId = home.id || home._id;
													const typeColor = HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK;
													const regionColor = REGION_COLORS[home.region] || COLOR_FALLBACK;
													const isEven = idx % 2 !== 0;
													return (
														<tr
															key={homeId}
															className={`${styles.homeRow} ${isEven ? styles.homeRowEven : ""}`}
															onClick={() => router.push(`/homes/${homeId}`)}
														>
															<td
																className={styles.homeNameCell}
																style={{ borderLeft: `4px solid ${typeColor.border}` }}
															>
																<div className={styles.homeNameInner}>
																	<Building2 size={14} style={{ color: typeColor.border, flexShrink: 0 }} />
																	<span>{home.name}</span>
																</div>
															</td>
															<td>
																{home.homeType ? (
																	<span className={styles.typePill} style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}>
																		{home.homeType}
																	</span>
																) : "—"}
															</td>
															<td>
																{home.region ? (
																	<span className={styles.typePill} style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}>
																		{home.region}
																	</span>
																) : "—"}
															</td>
															<td className={styles.addressCell}>
																{home.address ? (
																	<div className={styles.addressInner}>
																		<MapPin size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
																		<span>{home.address.street}, {home.address.city}</span>
																	</div>
																) : "—"}
															</td>
															<td className={styles.countCell}>
																<div className={styles.countInner}>
																	<User size={12} style={{ opacity: 0.5 }} />
																	{home.caregivers?.length || 0}
																</div>
															</td>
															<td className={styles.countCell}>
																<div className={styles.countInner}>
																	<Users size={12} style={{ opacity: 0.5 }} />
																	{home.admins?.length || 0}
																</div>
															</td>
															<td className={styles.countCell}>
																<div className={styles.countInner}>
																	<User size={12} style={{ opacity: 0.5 }} />
																	{home.clients?.length || 0}
																</div>
															</td>
															<td>
																<span className={`${styles.statusPill} ${home.isActive ? styles.statusActive : styles.statusInactive}`}>
																	{home.isActive ? "Active" : "Inactive"}
																</span>
															</td>
															<td className={styles.dateCell}>
																{home.openedAt ? format(new Date(home.openedAt), "MMM d, yyyy") : "—"}
															</td>
															{canDelete && (
																<td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
																	<Trash2 size={15} className={styles.deleteIcon} onClick={() => handleDeleteClick(homeId)} />
																</td>
															)}
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								) : (
									<EmptyState title="No homes found" message="Try adjusting your search or filters." />
								)}
							</>
						)}

						{/* Pagination */}
						{!isLoading && !fetchError && pageCount > 1 && (
							<ReactPaginate
								pageCount={pageCount}
								onPageChange={handlePageClick}
								forcePage={currentPage}
								pageRangeDisplayed={3}
								marginPagesDisplayed={1}
								breakLabel="..."
								breakClassName={styles.pageItem}
								breakLinkClassName={styles.pageLink}
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

			<Modal isOpen={showModal} onClose={closeModal}>
				<div className={styles.modal_content}>
					<h2>Are you sure you want to delete this home?</h2>
					<div className={styles.modal_buttons}>
						<Button variant="primary" onClick={confirmDelete} disabled={isActionPending}>
							{isActionPending ? "Deleting..." : "Yes"}
						</Button>
						<Button variant="secondary" onClick={closeModal} disabled={isActionPending}>No</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
