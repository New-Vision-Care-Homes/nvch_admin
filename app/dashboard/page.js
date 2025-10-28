"use client";

import react from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./dashboard.module.css";
import Image from "next/image";
import Link from "next/link";
import { Users, Calendar, Clock, TriangleAlert } from "lucide-react";

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
							<Users size={32} />
							<span className={styles.text}>Active Clients</span>
						</div>
						<div className={styles.c2}>125</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<Calendar size={32} />
							<span className={styles.text}>Caregivers on Shift</span>
						</div>
						<div className={styles.c2}>48</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<Clock size={32} />
							<span className={styles.text}>Pending Approvals</span>
						</div>
						<div className={styles.c2}>12</div>					
					</div>

					<div className={styles.card}>
						<div className={styles.c1}>
							<TriangleAlert size={32} />
							<span className={styles.text}>Urgent Alerts</span>
						</div>
						<div className={styles.c2}>3</div>					
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
						<span className={styles.text}>Approve Shifts</span>
					</Link>
					<Link href="/" className={styles.action}>
						<Image
							src="/img/dashboard/assign.svg"
							alt="Assign Caregiver"
							width={16}
							height={16}
						/>
						<span className={styles.text}>View Incidents</span>
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
								<span>Shift for Jane Smith (Caregiver) approved for 2024-07-25</span>
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
