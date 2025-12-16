"use client";

import React, { useState, useEffect, forwardRef } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./caregivers.module.css"; // Use client CSS for consistency
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, ChevronDown, Trash2 } from "lucide-react";

export default function Caregivers() {
    // --- State ---
    const [search, setSearch] = useState(""); // Search input
    const [statusFilter, setStatusFilter] = useState(""); // Status filter (Active/Inactive)
    const [showDropdown, setShowDropdown] = useState(false); // Dropdown visibility
    const [caregivers, setCaregivers] = useState([]); // List of caregivers

    const [showModal, setShowModal] = useState(false); // Delete confirmation modal
    const [deletedCaregiverId, setDeletedCaregiverId] = useState(null); // ID to delete

    // --- Handle delete button click ---
    const deleteHandler = (id) => {
        setDeletedCaregiverId(id);
        setShowModal(true);
    };

    const handleModalCancel = () => {
        setShowModal(false);
    };

    // --- Fetch caregivers from API ---
    useEffect(() => {
        const fetchCaregivers = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await fetch(
                    "https://nvch-server.onrender.com/api/auth/admin/users?role=caregiver",
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();
                if (res.ok) setCaregivers(data.data.users);
            } catch (err) {
                console.error("Fetch caregivers error:", err);
            }
        };
        fetchCaregivers();
    }, []);

    // --- Confirm delete ---
    const confirmDelete = async () => {
        const token = localStorage.getItem("token");
        if (!token || !deletedCaregiverId) return;

        try {
            const res = await fetch(
                `https://nvch-server.onrender.com/api/auth/admin/users/${deletedCaregiverId}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) setCaregivers(prev => prev.filter(c => c.id !== deletedCaregiverId));
        } catch (err) {
            console.error("Delete error:", err);
        }

        setShowModal(false);
        setDeletedCaregiverId(null);
    };

    // --- Filter caregivers ---
    const filteredCaregivers = caregivers.filter(caregiver => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            caregiver.firstName.toLowerCase().includes(searchLower) ||
            caregiver.lastName.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter
            ? (statusFilter === "Active" ? caregiver.isActive : !caregiver.isActive)
            : true;

        return matchesSearch && matchesStatus;
    });

    // --- Pagination ---
    const itemsPerPage = 5;
    const [currentPage, setCurrentPage] = useState(0);
    const offset = currentPage * itemsPerPage;
    const currentItems = filteredCaregivers.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(filteredCaregivers.length / itemsPerPage);
    const handlePageClick = (event) => setCurrentPage(event.selected);

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
                            {currentItems.map(caregiver => (
                                <TableContent key={caregiver.id}>
                                    {/* Name & Avatar */}
                                    <TableCell>
                                        <Image
                                            src={caregiver.img || "/default-avatar.png"}
                                            width={50}
                                            height={50}
                                            style={{ borderRadius: "50%", objectFit: "cover" }}
                                            alt="avatar"
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

