"use client";

import react from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./dashboard.module.css";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className={styles.page}>
		<Navbar />
		<div className={styles.container}>
			<Sidebar />
			<div className={styles.main}>
				<h1>
					Dashboard
				</h1>
				<h2 style={{ marginTop: "2rem" }}>
					Overview
				</h2>
				<div className={styles.overview}>
					<div className={styles.card}>
						<div className={styles.c1}>
							<Image
								src="/img/sidebar/clients.svg"
								alt="active clients"
								width={32}
								height={32}
							/>
							<span className={styles.text}>Active Clients</span>
						</div>
						<div className={styles.c2}>125</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<Image
								src="/img/sidebar/clients.svg"
								alt="active clients"
								width={32}
								height={32}
							/>
							<span className={styles.text}>Active Clients</span>
						</div>
						<div className={styles.c2}>125</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<Image
								src="/img/sidebar/clients.svg"
								alt="active clients"
								width={32}
								height={32}
							/>
							<span className={styles.text}>Active Clients</span>
						</div>
						<div className={styles.c2}>125</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<Image
								src="/img/sidebar/clients.svg"
								alt="active clients"
								width={32}
								height={32}
							/>
							<span className={styles.text}>Active Clients</span>
						</div>
						<div className={styles.c2}>125</div>					
					</div>
				</div>

				<h2 style={{ marginTop: "2rem" }}>Quick Actions</h2>
				<div className={styles.actions}>
					<Link href="/" className={styles.action}>
						<Image
							src="/img/dashboard/assign.svg"
							alt="Assign Caregiver"
							width={16}
							height={16}
						/>
						<span className={styles.text}>Assign Caregiver</span>
					</Link>
					<Link href="/" className={styles.action}>
						<Image
							src="/img/dashboard/assign.svg"
							alt="Assign Caregiver"
							width={16}
							height={16}
						/>
						<span className={styles.text}>Assign Caregiver</span>
					</Link>
					<Link href="/" className={styles.action}>
						<Image
							src="/img/dashboard/assign.svg"
							alt="Assign Caregiver"
							width={16}
							height={16}
						/>
						<span className={styles.text}>Assign Caregiver</span>
					</Link>
					<Link href="/" className={styles.action}>
						<Image
							src="/img/dashboard/assign.svg"
							alt="Assign Caregiver"
							width={16}
							height={16}
						/>
						<span className={styles.text}>Assign Caregiver</span>
					</Link>
				</div>

				<div className={styles.activity}>
					<div className={styles.title}>
						<h2>Recent Activity</h2>
						<Link href="/">View All</Link>
					</div>
					<div className={styles.content}>
						<div className={styles.row}>
							<div className={styles.left}>
								<Image
									src="/img/dashboard/assign.svg"
									alt="Assign Caregiver"
									width={20}
									height={20}
								/>
								<span>Client John Doe's care plan updated by Admin</span>
							</div>
							<div className={styles.time}>2 hours ago</div>
						</div>

						<div className={styles.row}>
							<div className={styles.left}>
								<Image
									src="/img/dashboard/assign.svg"
									alt="Assign Caregiver"
									width={20}
									height={20}
								/>
								<span>Client John Doe's care plan updated by Admin</span>
							</div>
							<div className={styles.time}>2 hours ago</div>
						</div>

						<div className={styles.row}>
							<div className={styles.left}>
								<Image
									src="/img/dashboard/assign.svg"
									alt="Assign Caregiver"
									width={20}
									height={20}
								/>
								<span>Client John Doe's care plan updated by Admin</span>
							</div>
							<div className={styles.time}>2 hours ago</div>
						</div>
						<div className={styles.row}>
							<div className={styles.left}>
								<Image
									src="/img/dashboard/assign.svg"
									alt="Assign Caregiver"
									width={20}
									height={20}
								/>
								<span>Client John Doe's care plan updated by Admin</span>
							</div>
							<div className={styles.time}>2 hours ago</div>
						</div>
						<div className={styles.row}>
							<div className={styles.left}>
								<Image
									src="/img/dashboard/assign.svg"
									alt="Assign Caregiver"
									width={20}
									height={20}
								/>
								<span>Client John Doe's care plan updated by Admin</span>
							</div>
							<div className={styles.time}>2 hours ago</div>
						</div>
					</div>
				</div>
			</div>
		</div>
    </div>
  );
}
