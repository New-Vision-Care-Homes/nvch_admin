"use client";

import React, { useState, useEffect, useRef } from "react";
import PageLayout from "@components/layout/PageLayout";
import PageHeader from "@components/layout/PageHeader";
import styles from "./homes.module.css";
import Button from "@components/UI/Button";
import IconButton from "@components/UI/IconButton";
import Pagination from "@components/UI/Pagination";
import Link from "next/link";
import { Building2, Trash2, Eye, Plus, Users, User, MapPin, Search, X } from "lucide-react";
import ErrorState from "@components/UI/ErrorState";
import EmptyState from "@components/UI/EmptyState";
import ActionMessage from "@components/UI/ActionMessage";
import { format } from "date-fns";
import { useHomes } from "@/hooks/useHomes";
import { useProfile } from "@/hooks/useProfile";
import { usePersistedState } from "@/hooks/usePersistedState";
import ConfirmDeleteModal from "@components/UI/ConfirmDeleteModal";
import { PageTable, PageTableRow } from "@components/UI/Table";
import { ColorPill } from "@components/UI/Badge";
import { HOME_TYPE_OPTIONS, HOME_TYPE_COLORS } from "@/utils/dropdownList/homeType";
import { REGION_OPTIONS, REGION_COLORS } from "@/utils/dropdownList/region";
import { COLOR_FALLBACK } from "@/utils/dropdownList/shared";

export default function Homes() {
	const { profile } = useProfile();
	const slugs = profile?.permissionSlugs ?? [];
	const canCreate = slugs.includes("create_home");
	const canDelete = slugs.includes("delete_home");

	// --- Pagination ---
	// Filters persist to sessionStorage so they're still applied (and the
	// matching results still shown) when the admin clicks into a home and
	// then comes back, instead of resetting on every visit to this page.
	const [currentPage, setCurrentPage] = usePersistedState("homes-filters:currentPage", 0);
	const itemsPerPage = 10;

	// --- Filters ---
	const [searchInput, setSearchInput] = usePersistedState("homes-filters:searchInput", "");
	const [search, setSearch] = useState(searchInput);
	const [regionFilter, setRegionFilter] = usePersistedState("homes-filters:regionFilter", "");
	const [homeTypeFilter, setHomeTypeFilter] = usePersistedState("homes-filters:homeTypeFilter", "");
	const [statusFilter, setStatusFilter] = usePersistedState("homes-filters:statusFilter", "");
	const prevFiltersRef = useRef({ search, regionFilter, homeTypeFilter, statusFilter });

	// Debounce search 400 ms before sending to API
	useEffect(() => {
		const timer = setTimeout(() => setSearch(searchInput), 400);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Reset to page 1 whenever any filter changes — but not on the initial
	// mount, which would otherwise wipe out a restored (persisted) page number.
	useEffect(() => {
		const prev = prevFiltersRef.current;
		const filtersChanged =
			prev.search !== search ||
			prev.regionFilter !== regionFilter ||
			prev.homeTypeFilter !== homeTypeFilter ||
			prev.statusFilter !== statusFilter;
		prevFiltersRef.current = { search, regionFilter, homeTypeFilter, statusFilter };
		if (filtersChanged) {
			setCurrentPage(0);
		}
	}, [search, regionFilter, homeTypeFilter, statusFilter, setCurrentPage]);

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
	const [deletedHome, setDeletedHome] = useState(null);

	const handleDeleteClick = (home) => { setDeletedHome(home); setShowModal(true); };
	const closeModal = () => { if (isActionPending) return; setShowModal(false); };
	const confirmDelete = async () => {
		if (!deletedHome) return;
		try {
			await deleteHome(deletedHome.id || deletedHome._id);
			setShowModal(false);
			setDeletedHome(null);
		} catch {
			// Keep the modal open so the error (shown via `actionError` below) stays in context.
		}
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
					<PageHeader
						title="Homes"
						actions={canCreate && (
							<Link href="/homes/add_new_home">
								<Button variant="primary" icon={<Plus size={16} />}>Add New Home</Button>
							</Link>
						)}
					/>

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
							{HOME_TYPE_OPTIONS.map((o) => (
								<ColorPill key={o.value} label={o.label} color={HOME_TYPE_COLORS[o.value] || COLOR_FALLBACK} />
							))}
							<span className={styles.legendSep} />
							<span className={styles.legendLabel}>Region:</span>
							{REGION_OPTIONS.map((o) => (
								<ColorPill key={o.value} label={o.label} color={REGION_COLORS[o.value] || COLOR_FALLBACK} />
							))}
						</div>

						<ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

						{!isLoading && !fetchError && (
							<>
								{homes && homes.length > 0 ? (
									<PageTable>
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
												<th></th>
											</tr>
										</thead>
										<tbody>
											{homes.map((home, idx) => {
												const homeId = home.id || home._id;
												const typeColor = HOME_TYPE_COLORS[home.homeType] || COLOR_FALLBACK;
												const regionColor = REGION_COLORS[home.region] || COLOR_FALLBACK;
												return (
													<PageTableRow
														key={homeId}
														isEven={idx % 2 !== 0}
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
																{home.homeType ? <ColorPill label={home.homeType} color={typeColor} /> : "—"}
															</td>
															<td>
																{home.region ? <ColorPill label={home.region} color={regionColor} /> : "—"}
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
															<td className={styles.actionsCell}>
																<div className={styles.actionsRow}>
																	<IconButton href={`/homes/${homeId}`} title="View home">
																		<Eye size={15} />
																	</IconButton>
																	{canDelete && (
																		<IconButton variant="danger" title="Delete home" onClick={() => handleDeleteClick(home)}>
																			<Trash2 size={15} />
																		</IconButton>
																	)}
																</div>
															</td>
														</PageTableRow>
													);
												})}
											</tbody>
										</PageTable>
								) : (
									<EmptyState title="No homes found" message="Try adjusting your search or filters." />
								)}
							</>
						)}

						{/* Pagination */}
						{!isLoading && !fetchError && <Pagination pageCount={pageCount} forcePage={currentPage} onPageChange={handlePageClick} />}
					</div>
				</div>
			</PageLayout>

			<ConfirmDeleteModal
				isOpen={showModal}
				onClose={closeModal}
				onConfirm={confirmDelete}
				itemName={deletedHome?.name}
				isLoading={isActionPending}
				errorMessage={actionError}
			/>
		</>
	);
}
