"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@components/layout/PageLayout";
import styles from "./caregivers.module.css";
import { Plus, Edit } from "lucide-react";
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";

export default function Caregivers() {
	const [search, setSearch] = useState("");
	const [caregivers, setCaregivers] = useState([]);
	const [currentPage, setCurrentPage] = useState(0);

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
									<Edit />
								</Link>
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
	);
}
