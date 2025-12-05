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

export default function Clients() {
	const [search, setSearch] = useState("");
	const [dateFilter, setDateFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [clients, setClients] = useState([]);

	const [showModal, setShowModal] = useState(false);
	const [deletedClientId, setDeletedClientId] = useState(null);

	const deleteHandler = (id) => {
		setDeletedClientId(id);
		setShowModal(true);
	};

	const handleModalCancel = () => {
        setShowModal(false);
    }

	useEffect(() => {
		const fetchUsers = async () => {
			const token = localStorage.getItem("token");
			if (!token) {
				console.log("No token found. Please log in as admin.");
				return;
			}
		
			try {
				const res = await fetch(
				"https://nvch-server.onrender.com/api/auth/admin/users?role=client",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`,
					},
				}
				);
		
				const data = await res.json();
		
				if (res.ok) {
					setClients(data.data.users);
					console.log(data.data.users);
				} else {
					console.log(data.message || "Failed to fetch users")
				}
			} catch (err) {
				console.error(err);
				setError("Error connecting to server");
			}
		};
	
		fetchUsers();
	  }, []); 

	const confirmDelete = async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			console.error("Delete failed: No token found.");
			setShowModal(false);
			setDeletedClientId(null);
			return;
		}
		
		try {
			console.log("id: ", deletedClientId);
			const url = `https://nvch-server.onrender.com/api/auth/admin/users/${deletedClientId}`;
			const res = await fetch(url, {
				method: "DELETE",
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});

			if (res.ok) {
				// Success: Update UI immediately
				setClients(prev => prev.filter(c => c.id !== deletedClientId));
				// Show success notification to the user
				console.log("Client successfully deleted.");
			} else {
				// Failed: Get error message from server
				const errorData = await res.json();
				const errorMessage = errorData.message || `Failed to delete client. Status: ${res.status}`;
				console.error("Delete failed:", errorMessage);
				// Show error message to the user (e.g., "Permission denied.")
			}
		} catch (err) {
			// Network error
			console.error("Network or parsing error during delete:", err);
			// Show error message to the user
		}
		
		// Always close the modal and reset ID regardless of success or failure
		setShowModal(false);
		setDeletedClientId(null);
	};
	

	// Filter the 'clients' array to only include items
	// whose name contains the current search text (case-insensitive)
	const filtered = clients.filter((client) =>{
		const matchesFSearch = client.firstName.toLowerCase().includes(search.toLowerCase());
		const matchesLSearch = client.lastName.toLowerCase().includes(search.toLowerCase());
		const matchesDate = dateFilter ? client.lastVisit === dateFilter : true;
		const matchesStatus = statusFilter ? client.status === statusFilter : true;
		return matchesFSearch && matchesLSearch && matchesDate && matchesStatus;
	});

	const StatusDropdown = () => (
		<div className={styles.dropdownContainer}>
			<Button
				
				onClick={() => setShowDropdown((prev) => !prev)}
			>
				{statusFilter ? `Status: ${statusFilter}` : "Filter by Status"}
				<ChevronDown className={styles.dropdownIcon} />
			</Button>
			{showDropdown && (
				<div className={styles.dropdownMenu}>
					<div onClick={() => { setStatusFilter(""); setShowDropdown(false); }}>All</div>
					<div onClick={() => { setStatusFilter("Active"); setShowDropdown(false); }}>Active</div>
					<div onClick={() => { setStatusFilter("Inactive"); setShowDropdown(false); }}>Inactive</div>
					<div onClick={() => { setStatusFilter("On Hold"); setShowDropdown(false); }}>On Hold</div>
				</div>
			)}
		</div>
	);

	const itemsPerPage = 4;
	const [currentPage, setCurrentPage] = useState(0);
  
	const offset = currentPage * itemsPerPage;
	const currentItems = filtered.slice(offset, offset + itemsPerPage);
	const pageCount = Math.ceil(filtered.length / itemsPerPage);
  
	const handlePageClick = (event) => {
	  setCurrentPage(event.selected);
	};

	const CustomInput = forwardRef(({ value, onClick }, ref) => (
		<div className={styles.dateWrapper} onClick={onClick} ref={ref}>
			<input
				type="text"
				value={value}
				readOnly
				placeholder="Filter by visit date"
				className={styles.dateButton}
			/>
			<Calendar className={styles.dateIcon} />
		</div>
	));

	return (
		<>
			<PageLayout>
				<div className={styles.header}>
					<h1>Client Management</h1>
					<Link href="/clients/add_new_client">
						<Button variant="primary" icon={<Plus />}>Add New Client</Button>
					</Link>
				</div>

				<div className={styles.filter_row}>
					<input
						type="text"
						placeholder="Search clients..."
						className={styles.search}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>

					<div className={styles.filter}>

						<DatePicker
							selected={dateFilter ? new Date(dateFilter) : null}
							onChange={date => setDateFilter(date.toISOString().split("T")[0])}
							customInput={<CustomInput />}
						/>

						<div className={styles.dropdownContainer}>
							<Button
								variant="secondary"
								icon={<ChevronDown />}
								onClick={() => setShowDropdown((prev) => !prev)}
							>
								{statusFilter ? `Status: ${statusFilter}` : "Filter by Status"}
							</Button>
							{showDropdown && (
								<div className={styles.dropdownMenu}>
									<div onClick={() => { setStatusFilter(""); setShowDropdown(false); }}>All</div>
									<div onClick={() => { setStatusFilter("Active"); setShowDropdown(false); }}>Active</div>
									<div onClick={() => { setStatusFilter("Inactive"); setShowDropdown(false); }}>Inactive</div>
									<div onClick={() => { setStatusFilter("On Hold"); setShowDropdown(false); }}>On Hold</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className={styles.tableWrapper}>
					<h2 style={{ marginBottom: "1.5rem" }}>All Clients</h2>
					<Table>
						<TableHeader>
							<TableCell>Client Name</TableCell>
							<TableCell>Client ID</TableCell>
							<TableCell>Contact</TableCell>
							<TableCell>Status</TableCell>
							{/*<TableCell>Last Visit</TableCell>*/}
							<TableCell>Actions</TableCell>
						</TableHeader>
						{currentItems.map((client) => (
							<TableContent key={client.id}>
								<TableCell>
									<Image 
										src={client.img} 
										width={50}
										height={50}
										style={{
											borderRadius: "50%",
											objectFit: "cover",
											}}
									/>
									<span>{client.firstName}</span>
									<span>{client.lastName}</span>
								</TableCell>
								<TableCell>{client.clientId}</TableCell>
								<TableCell>contact</TableCell>
								<TableCell>status</TableCell>
								{/*<TableCell>lastVisit</TableCell>*/}
								<TableCell>
									<Link href={`/clients/${client.id}`}>
										<Edit 
											color="#1C4A6EFF" 
											style={{ width: '1.5rem', height: '1.5rem' }} 
										/>
									</Link>
									<div>
										<Trash2 
											color="#ef4444" 
											style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} 
											onClick={()=> deleteHandler(client.id)} 
										/>
									</div>
								</TableCell>
							</TableContent>
						))}
					</Table>
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
			</PageLayout>

			<Modal isOpen={showModal} onClose={handleModalCancel}>
				<h2>Are you sure you want to delete this user?</h2>
				<div className={styles.modal_buttons}>
						<Button
							variant="primary"
							onClick={confirmDelete}
						>
							Yes
						</Button>
						<Button
							variant="secondary"
							onClick={handleModalCancel}
						>
							No
						</Button>
				</div>
			</Modal>
		</>
	);
}
