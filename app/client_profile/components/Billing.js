"use client";

import React, { useState } from "react";
import styles from "./Billing.module.css";
import { Trash2, CirclePlus } from "lucide-react";
import { Table, TableHeader, TableCell, TableContent} from "@components/UI/Table";

export default function Billing() {
	const invoices = [
		{ id: 1, invoice: "INV-001", date: "2025-10-01", amount: "$120.00", status: "Paid" },
		{ id: 2, invoice: "INV-002", date: "2025-10-02", amount: "$75.50", status: "Pending" },
		{ id: 3, invoice: "INV-003", date: "2025-09-28", amount: "$320.00", status: "Overdue" },
		{ id: 4, invoice: "INV-004", date: "2025-09-30", amount: "$200.00", status: "Paid" },
		{ id: 5, invoice: "INV-005", date: "2025-09-29", amount: "$150.00", status: "Pending" },
	  ];

	function handleDelete(id) {
		setCaregivers(caregivers.filter(c => c.id !== id));
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2>Billing & Invoices</h2>
				<h6>Manage your client's invoices here.</h6>
			</div>

			<Table>
				<TableHeader>
					<TableCell>Invoice</TableCell>
					<TableCell>Date</TableCell>
					<TableCell>Amount</TableCell>
					<TableCell>Status</TableCell>
					<TableCell>Actions</TableCell>
				</TableHeader>

				{invoices.map(c => (
					<TableContent key={c.id}>
						<TableCell>{c.invoice}</TableCell>
						<TableCell>{c.date}</TableCell>
						<TableCell>{c.amount}</TableCell>
						<TableCell>{c.status}</TableCell>
						<TableCell>{c.invoice}</TableCell>
					</TableContent>
				))}
			</Table>
		</div>
	);
}