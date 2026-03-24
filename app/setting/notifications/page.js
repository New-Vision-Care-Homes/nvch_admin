"use client";

import styles from "./stub.module.css";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Bell size={28} className={styles.icon} />
				<h1 className={styles.title}>Notifications</h1>
			</div>
			<p className={styles.description}>
				Manage how and when you receive alerts, emails, and in-app notifications.
			</p>
			<div className={styles.placeholder}>
				<span>Notification settings coming soon.</span>
			</div>
		</div>
	);
}
