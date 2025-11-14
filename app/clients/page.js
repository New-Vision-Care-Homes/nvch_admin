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
import Link from "next/link";
import { Plus, Edit, Calendar, ChevronDown } from "lucide-react";

export default function Clients() {
	const [search, setSearch] = useState("");
	const [dateFilter, setDateFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [clients, setClients] = useState([]);

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

	const clients_2 = [
		{
			id: "C001",
			name: "Jane Doe",
			contact: "jane.doe@example.com",
			status: "Active",
			lastVisit: "2023-11-20",
			img: "https://i.pravatar.cc/40?img=1",
		},
		{
			id: "C002",
			name: "John Smith",
			contact: "+1-555-123-4567",
			status: "On Hold",
			lastVisit: "2023-10-15",
			img: "https://i.pravatar.cc/40?img=2",
		},
		{
			id: "C003",
			name: "Emily White",
			contact: "emily.white@example.com",
			status: "Active",
			lastVisit: "2023-11-25",
			img: "https://i.pravatar.cc/40?img=3",
		},
		{
			id: "C004",
			name: "Michael Brown",
			contact: "+1-555-987-6543",
			status: "Inactive",
			lastVisit: "2023-09-01",
			img: "https://i.pravatar.cc/40?img=4",
		},
		{
			id: "C005",
			name: "Sarah Green",
			contact: "sarah.green@example.com",
			status: "Active",
			lastVisit: "2023-11-18",
			img: "https://i.pravatar.cc/40?img=5",
		},
		{
			id: "C006",
			name: "Sarah Green",
			contact: "sarah.green@example.com",
			status: "Active",
			lastVisit: "2023-11-18",
			img: "https://i.pravatar.cc/40?img=5",
		},
	];

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
						<TableCell>Last Visit</TableCell>
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
							<TableCell>lastVisit</TableCell>
							<TableCell>
								<Link href={`/clients/${client.id}`}>
										<Edit />
								</Link>
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
	);
}
