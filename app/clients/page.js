"use client";

import React, { useState, useEffect, forwardRef } from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./clients.module.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";
import Link from "next/link";
import { Plus, Edit, Calendar, ChevronDown, Trash2 } from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "@/hooks/useClients";

export default function Clients() {
	const queryClient = useQueryClient();
	//const { data: clients = [], isLoading, isError, error } = useClients();
	
	const { 
		clients, 
		isLoading, 
		isError, 
		errorMessage, 
		deleteClient, 
		isActionPending 
	} = useClients();

	console.log("clients: ", clients);

    // --- State ---
    const [search, setSearch] = useState(""); // Search text
    const [dateFilter, setDateFilter] = useState(""); // Filter by last visit date
    const [statusFilter, setStatusFilter] = useState(""); // Filter by status (Active/Inactive)
    const [showDropdown, setShowDropdown] = useState(false); // Dropdown visibility
    //const [clients, setClients] = useState([]); // All client data

    const [showModal, setShowModal] = useState(false); // Delete confirmation modal
    const [deletedClientId, setDeletedClientId] = useState(null); // ID of client to delete

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
        const token = localStorage.getItem("token");
        if (!token || !deletedClientId) return;

        try {
            const res = await fetch(`https://nvch-server.onrender.com/api/auth/admin/users/${deletedClientId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) queryClient.invalidateQueries({ queryKey: ["clients"] });

        } catch (err) {
            console.error("Delete error:", err);
        }

        setShowModal(false);
        setDeletedClientId(null);
    };

    // --- Filter Clients ---
    const filteredClients = clients.filter(client => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            client.firstName.toLowerCase().includes(searchLower) ||
            client.lastName.toLowerCase().includes(searchLower);

        const matchesDate = dateFilter
            ? client.lastVisit?.split("T")[0] === dateFilter
            : true;

        const matchesStatus = statusFilter
            ? (statusFilter === "Active" ? client.isActive : !client.isActive)
            : true;

        return matchesSearch && matchesDate && matchesStatus;
    });

    // --- Pagination ---
    const itemsPerPage = 5;
    const [currentPage, setCurrentPage] = useState(0);
    const offset = currentPage * itemsPerPage;
    const currentItems = filteredClients.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(filteredClients.length / itemsPerPage);
    const handlePageClick = (event) => setCurrentPage(event.selected);

    // --- Custom Input for DatePicker ---
    const CustomInput = forwardRef(({ value, onClick }, ref) => (
        <div className={styles.dateWrapper} onClick={onClick} ref={ref}>
            <input type="text" value={value} readOnly placeholder="Filter by visit date" className={styles.dateButton} />
            <Calendar className={styles.dateIcon} />
        </div>
    ));

	if (isLoading) return <div>Loading clients...</div>;
    if (isError) return <div>Error: {error.message}</div>;

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
                            {/* Date Filter
                            <DatePicker
                                selected={dateFilter ? new Date(dateFilter) : null}
                                onChange={date => setDateFilter(date.toISOString().split("T")[0])}
                                customInput={<CustomInput />}
                            />
							*/}
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
                            {currentItems.map(client => (
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

