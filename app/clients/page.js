"use client";

import React, { useState } from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./clients.module.css";
import { Plus } from "lucide-react"; 
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import Image from "next/image";
import ReactPaginate from "react-paginate";

export default function Clients() {
	const [search, setSearch] = useState("");

	const clients = [
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

	const filtered = clients.filter((client) =>
		client.name.toLowerCase().includes(search.toLowerCase())
	);

	const itemsPerPage = 4;
	const [currentPage, setCurrentPage] = useState(0);
  
	const offset = currentPage * itemsPerPage;
	const currentItems = filtered.slice(offset, offset + itemsPerPage);
	const pageCount = Math.ceil(filtered.length / itemsPerPage);
  
	const handlePageClick = (event) => {
	  setCurrentPage(event.selected);
	};

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					<div className={styles.header}>
						<h1>Client Management</h1>
						<Button variant="primary" icon={<Plus />} onClick={() => alert("Added")}>Add New Client</Button>
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
							<Button variant="secondary" onClick={() => alert("filter")} className={styles.button}>Filter by Status</Button>
							<Button variant="secondary" onClick={() => alert("filter")} className={styles.button}>Filter by Last Visit</Button>
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
										<span>{client.name}</span>
									</TableCell>
									<TableCell>{client.id}</TableCell>
									<TableCell>{client.contact}</TableCell>
									<TableCell>{client.status}</TableCell>
									<TableCell>{client.lastVisit}</TableCell>
									<TableCell>{client.lastVisit}</TableCell>
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
				</div>
			</div>
		</div>		
	);
}
