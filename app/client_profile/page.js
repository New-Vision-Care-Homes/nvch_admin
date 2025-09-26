"use client";

import {React, useState} from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import Tabs from "./components/Tabs";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import styles from "./client_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Archive } from "lucide-react";

export default function Page() {

	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.body}>
					{/* Header */}
					<div className={styles.header}>
						<h1 className={styles.title}>Client Profile: Eleanor Vance</h1>
						<div className={styles.headerActions}>
							<button className={styles.actionbtn}>
								<Edit size={16} />
								Edit Client
							</button>
							<button className={styles.actionbtn} style={{ backgroundColor: "red", color: "white" }}>
								<Archive size={16} />
								Archive Client
							</button>
						</div>
					</div>

					{/* Client Overview */}
					<Card>
						<CardHeader>Client Overview</CardHeader>
						<div className={styles.content}>
							<div className={styles.text}>
								<div className={styles.column}>
									<InfoField label="Client ID">CC-00123</InfoField>
									<InfoField label="Next Appointment">2024-08-05 (10:00 AM)</InfoField>
								</div>
								<div className={styles.column}>
									<InfoField label="Status">Active</InfoField>
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
								/>
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
