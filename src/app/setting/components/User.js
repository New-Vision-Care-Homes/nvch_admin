"use client";

import React, { useState } from "react";
import styles from "./User.module.css";
import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, UserPlus } from "lucide-react"; 
import Button from "@components/UI/Button";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";


export default function Page() {

	const [users, setUsers] = useState([
		{
		  id: "1",
		  name: "Alice Johnson",
		  avatar: "https://i.pravatar.cc/150?img=1",
		  role: "Admin",
		  email: "alice.johnson@careconnect.com",
		  status: "Active",
		  lastLogin: "2 hours ago",
		},
		{
		  id: "2",
		  name: "Bob Williams",
		  avatar: "https://i.pravatar.cc/150?img=12",
		  role: "Manager",
		  email: "bob.williams@careconnect.com",
		  status: "Active",
		  lastLogin: "5 hours ago",
		},
		{
		  id: "3",
		  name: "Charlie Brown",
		  avatar: "https://i.pravatar.cc/150?img=13",
		  role: "Staff",
		  email: "charlie.brown@careconnect.com",
		  status: "Inactive",
		  lastLogin: "2 days ago",
		},
		{
		  id: "4",
		  name: "Diana Prince",
		  avatar: "https://i.pravatar.cc/150?img=5",
		  role: "Viewer",
		  email: "diana.prince@careconnect.com",
		  status: "Pending",
		  lastLogin: "10 minutes ago",
		},
		{
		  id: "5",
		  name: "Ethan Hunt",
		  avatar: "https://i.pravatar.cc/150?img=14",
		  role: "Staff",
		  email: "ethan.hunt@careconnect.com",
		  status: "Active",
		  lastLogin: "1 days ago",
		},
		{
		  id: "6",
		  name: "Fiona Glenn",
		  avatar: "https://i.pravatar.cc/150?img=9",
		  role: "Admin",
		  email: "fiona.glenn@careconnect.com",
		  status: "Active",
		  lastLogin: "3 hours ago",
		},
		{
		  id: "7",
		  name: "George Miller",
		  avatar: "https://i.pravatar.cc/150?img=11",
		  role: "Manager",
		  email: "george.miller@careconnect.com",
		  status: "Inactive",
		  lastLogin: "7 days ago",
		},
	  ]);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2>User Accounts</h2>
				<Button icon={<UserPlus />}>Add New User</Button>
			</div>

			<Table>
				<TableHeader>
					<TableCell>User</TableCell>
					<TableCell>Role</TableCell>
					<TableCell>Email</TableCell>
					<TableCell>Status</TableCell>
					<TableCell>Last Login</TableCell>
					<TableCell>Action</TableCell>
				</TableHeader>

				{users.map(c => (
					<TableContent key={c.id}>
						<TableCell>{c.name}</TableCell>
						<TableCell>{c.role}</TableCell>
						<TableCell>{c.email}</TableCell>
						<TableCell>{c.status}</TableCell>
						<TableCell>{c.lastLogin}</TableCell>
						<TableCell>action</TableCell>
					</TableContent>
				))}
			</Table>
		</div>
	);
}


