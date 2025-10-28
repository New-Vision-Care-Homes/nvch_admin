"use client";

import {React, useState} from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Tabs from "@app/clients/client_profile/components/Tabs"
import { Card, CardHeader, CardContent, InfoField, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import styles from "./add_new_client.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit } from "lucide-react";

export default function Page() {

	const [clientID, setClientID] = useState("");

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					{/* Header */}
					<div className={styles.header}>
						<h1>Client Profile: Add New Client</h1>
					</div>

					{/* Client Overview */}
					<Card className={styles.card}>
						<CardHeader>Client Overview</CardHeader>
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
							<InputField label="Client ID" value={clientID} onChange={e => setClientID(e.target.value)} />
							<div className={styles.button}>
								<Link href="/clients">
									<Button variant="secondary">Back</Button>
								</Link>
								{/* action needed: pop up add successgully, add data to database */}
								<Link href="/clients">
									<Button variant="primary">Add New Client</Button>
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