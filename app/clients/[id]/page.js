"use client";

import {React, useState, useEffect} from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, InfoField } from "@components/UI/Card";
import styles from "./client_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Activity, Undo2 } from "lucide-react";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";

export default function Page() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [active, setActive] = useState("Inactive");
	const { id } = useParams();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true); // loading state

	useEffect(() => {
		const fetchUser = async () => {
		const token = localStorage.getItem("token");
		try {
			const res = await fetch(`https://nvch-server.onrender.com/api/auth/admin/users/${id}`,
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
				setUser(data.data.user);
			} else {
				setMessage(data.message || "Failed to fetch user");
			}
		} catch (err) {
			console.error(err);
			setMessage("Error connecting to server");
		} finally {
			setLoading(false);
		}
		};

		fetchUser();
	}, [id]);

	function handleActive() {
		const newStatus = active === "Inactive" ? "Active" : "Inactive";
		setActive(newStatus);
		setIsModalOpen(true);
		setMessage(`The user has been ${newStatus.toLowerCase()}d`);
	}

	function handleCancel() {
		setIsModalOpen(false);
	}

	if (loading) return <p>Loading user data...</p>;

	return (
		<>
			<PageLayout>
				{/* Header */}
				<div className={styles.header}>
					<h1>Client Profile: {user?.firstName} {user?.lastName}</h1>
					<div className={styles.headerActions}>
						<Button
							variant="primary"
							icon={<Activity size={16} />}
							onClick={handleActive}
							className={`${active === "Active" ? styles.active : styles.inactive}`}
						>
							{active}
						</Button>
						<Link href="/clients">
							<Button variant="secondary" icon={<Undo2 size={16}/>}>Back</Button>
						</Link>
					</div>
				</div>

				{/* Client Overview */}
				<Card>
					<CardHeader>Client Overview</CardHeader>
					<div className={styles.content}>
						<div className={styles.text}>
							<div className={styles.column}>
								<InfoField label="Client ID">{user?.clientId}</InfoField>
								<InfoField label="Next Appointment">2024-08-05 (10:00 AM)</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Status">{active}</InfoField>
								<InfoField label="Care Plan Status">On Track</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Last Visit">2024-07-28</InfoField>
							</div>
						</div>
						<div className={styles.picture}>
							<Image
								src="/img/navbar/avatar.jpg"
								alt="Profile Photo"
								width={100}
								height={100}
								className={styles.image}
							/>
							<Button variant="secondary" size="sm" icon={<Edit size={16}/>}>Edit</Button>
						</div>
					</div>
				</Card>

				{/* Tabbed Content */}
				<div className={styles.tabs}>
					<Tabs />
				</div>
				{/* End Tabbed Content */}
			</PageLayout>

			<Modal isOpen={isModalOpen} onClose={handleCancel}>
				<h2>{message}</h2>
			</Modal>
		</>
	);
}

