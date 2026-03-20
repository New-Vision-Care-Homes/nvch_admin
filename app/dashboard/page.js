"use client";

import PageLayout from "@components/layout/PageLayout";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { Users, Calendar, Clock, TriangleAlert, UserPlus, CircleCheckBig, FileWarning, UserPen } from "lucide-react";
import { useClients } from "@/hooks/useClients";

export default function Dashboard() {
	const { clients } = useClients({
		params: { isActive: true }
	});
	console.log(clients);
	return (
		<PageLayout>
			<h1>
				Dashboard
			</h1>
			<h2>
				Overview
			</h2>
			<div className={styles.overview}>
				<div className={styles.card}>
					<div className={styles.c1}>
						<Users size="2.8rem" color="#70E000" />
						<span className={styles.text}>Active Clients</span>
					</div>
					<div className={styles.c2}>{clients?.length}</div>
				</div>

				<div className={styles.card}>
					<div className={styles.c1}>
						<Calendar size="2.8rem" color="#004080FF" />
						<span className={styles.text}>Caregivers on Shift</span>
					</div>
					<div className={styles.c2}>48</div>
				</div>

				<div className={styles.card}>
					<div className={styles.c1}>
						<Clock size="2.8rem" color="#DDA15E" />
						<span className={styles.text}>Pending Approvals</span>
					</div>
					<div className={styles.c2}>12</div>
				</div>

				<div className={styles.card}>
					<div className={styles.c1}>
						<TriangleAlert size="2.8rem" color="#BC4749" />
						<span className={styles.text}>Urgent Alerts</span>
					</div>
					<div className={styles.c2}>3</div>
				</div>
			</div>

			<h2>Quick Actions</h2>
			<div className={styles.actions}>
				<Link href="/" className={styles.action}>
					<UserPlus size="1.8rem" color="#004080FF" />
					<span>Assign Caregiver</span>
				</Link>
				<Link href="/" className={styles.action}>
					<CircleCheckBig size="1.8rem" color="#70E000" />
					<span>Approve Shifts</span>
				</Link>
				<Link href="/" className={styles.action}>
					<FileWarning size="1.8rem" color="#BC4749" />
					<span>View Incidents</span>
				</Link>
			</div>
			<div className={styles.title}>
				<h2>Recent Activity</h2>
				<Link href="/notification">View All</Link>
			</div>
			<div className={styles.activity}>
				<div className={styles.content}>
					<div className={styles.row}>
						<div className={styles.left}>
							<UserPen size="1.6rem" color="#004080FF" />
							<span>Client John Doe's care plan updated by Admin</span>
						</div>
						<div className={styles.time}>2 hours ago</div>
					</div>

					<div className={styles.row}>
						<div className={styles.left}>
							<UserPen size="1.6rem" color="#004080FF" />
							<span>Client John Doe's care plan updated by Admin</span>
						</div>
						<div className={styles.time}>2 hours ago</div>
					</div>

					<div className={styles.row}>
						<div className={styles.left}>
							<UserPen size="1.6rem" color="#004080FF" />
							<span>Shift for Jane Smith (Caregiver) approved for 2024-07-25</span>
						</div>
						<div className={styles.time}>2 hours ago</div>
					</div>
					<div className={styles.row}>
						<div className={styles.left}>
							<UserPen size="1.6rem" color="#004080FF" />
							<span>Client John Doe's care plan updated by Admin</span>
						</div>
						<div className={styles.time}>2 hours ago</div>
					</div>
					<div className={styles.row}>
						<div className={styles.left}>
							<UserPen size="1.6rem" color="#004080FF" />
							<span>Client John Doe's care plan updated by Admin</span>
						</div>
						<div className={styles.time}>2 hours ago</div>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
