"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@components/layout/PageLayout";
import styles from "./caregivers.module.css";
import { Plus, Edit, Trash2 } from "lucide-react";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";
import Modal from "@components/UI/Modal";

export default function Caregivers() {
	const [search, setSearch] = useState("");
	const [caregivers, setCaregivers] = useState([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [showModal, setShowModal] = useState(false);
	const [deletedCaregiverId, setDeletedCaregiverId] = useState(null);

	const deleteHandler = (id) => {
		setDeletedCaregiverId(id);
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
					"https://nvch-server.onrender.com/api/auth/admin/users?role=caregiver",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
				);

				const data = await res.json();

				if (res.ok) {
					setCaregivers(data.data.users);
					console.log("success: ", data.data);
				} else {
					console.log(data.message || "Failed to fetch users");
				}
			} catch (err) {
				console.error(err);
			}
		};

		fetchUsers();
	}, []);

	const confirmDelete = async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			console.error("Delete failed: No token found.");
			setShowModal(false);
			setDeletedCaregiverId(null);
			return;
		}
		
		try {
			console.log("id: ", deletedCaregiverId);
			const url = `https://nvch-server.onrender.com/api/auth/admin/users/${deletedCaregiverId}`;
			const res = await fetch(url, {
				method: "DELETE",
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});

			if (res.ok) {
				// Success: Update UI immediately
				setCaregivers(prev => prev.filter(c => c.id !== deletedCaregiverId));
				// Show success notification to the user
				console.log("Caregiver successfully deleted.");
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
		setDeletedCaregiverId(null);
	};

	const filtered = caregivers.filter((caregiver) => {
		const fullName = `${caregiver.firstName} ${caregiver.lastName}`.toLowerCase();
		return fullName.includes(search.toLowerCase());
	});


	const itemsPerPage = 4;
	const offset = currentPage * itemsPerPage;
	const currentItems = filtered.slice(offset, offset + itemsPerPage);
	const pageCount = Math.ceil(filtered.length / itemsPerPage);

	const handlePageClick = (event) => {
		setCurrentPage(event.selected);
	};

	return (
		<>
			<PageLayout>
				<div className={styles.header}>
					<h1>Caregiver Management</h1>
					<Link href="/caregivers/add_new_caregiver">
						<Button variant="primary" icon={<Plus />}>
							Add New Caregiver
						</Button>
					</Link>
				</div>

				<div className={styles.filter_row}>
					<input
						type="text"
						placeholder="Search caregivers..."
						className={styles.search}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>

					<div className={styles.filter}>
						<Button variant="secondary" className={styles.button}>
							Filter by Status
						</Button>
						<Button variant="secondary" className={styles.button}>
							Filter by Certifications
						</Button>
					</div>
				</div>

				<div className={styles.tableWrapper}>
					<h2 style={{ marginBottom: "1.5rem" }}>All Caregivers</h2>
					<Table>
						<TableHeader>
							<TableCell>Caregiver Name</TableCell>
							<TableCell>Caregiver ID</TableCell>
							<TableCell>Contact</TableCell>
							<TableCell>Certifications</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Actions</TableCell>
						</TableHeader>

						{currentItems.map((caregiver) => (
							<TableContent key={caregiver.id}>
								<TableCell>
									<Image
										src={caregiver.img || "/default-avatar.png"}
										width={50}
										height={50}
										style={{
											borderRadius: "50%",
											objectFit: "cover",
										}}
										alt="avatar"
									/>
									<span>{caregiver.firstName} {caregiver.lastName}</span>
								</TableCell>

								<TableCell>{caregiver.employeeId}</TableCell>
								<TableCell>-</TableCell>
								<TableCell>-</TableCell>
								<TableCell>-</TableCell>

								<TableCell>
									<Link href={`/caregivers/${caregiver.id}`}>
										<Edit 
											color="#1C4A6EFF" 
											style={{ width: '1.5rem', height: '1.5rem' }} 
										/>
									</Link>
									<div>
										<Trash2 
											color="#ef4444" 
											style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }} 
											onClick={()=> deleteHandler(caregiver.id)}
										/>
									</div>
								</TableCell>
							</TableContent>
						))}
					</Table>
				</div>

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
