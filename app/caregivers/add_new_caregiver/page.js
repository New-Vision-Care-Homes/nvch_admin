"use client";

import {React, useState} from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Tabs from "@app/clients/client_profile/components/Tabs"
import { Card, CardHeader, CardContent, InfoField, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_caregiver.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit } from "lucide-react";

export default function Page() {

	const [caregiverID, setCaregiverID] = useState("");

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Caregiver Profile: Add New Caregiver</h1>
					</div>

					{/* Caregiver Overview */}
					<Card className={styles.card}>
						<CardHeader>Caregiver Overview</CardHeader>
						<div className={styles.content}>
							<div className={styles.picture}>
								<Image
									src="/img/placeholder.png"
									alt="Profile Photo"
									width={100}
									height={100}
									className={styles.Image}
								/>
								<Button icon={<Edit size={16} />} variant="secondary" size="sm" >Edit</Button>
							</div>
							<InputField label="Caregiver ID" value={caregiverID} onChange={e => setCaregiverID(e.target.value)} />
							<div className={styles.button}>
								<Link href="/caregivers">
									<Button variant="secondary">Back</Button>
								</Link>
								{/* action needed: pop up add successgully, add data to database */}
								<Link href="/clients">
									<Button variant="primary">Add New Caregiver</Button>
								</Link>
							</div>
						</div>
					</Card>


					{/* Tabbed Content */}
					<div className={styles.tabs}>
						<Tabs />
					</div>
					{/* End Tabbed Content */}
				</div>
			</div>
		</div>
	);
}