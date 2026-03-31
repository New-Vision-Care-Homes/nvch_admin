"use client";
import React from "react";
import PageLayout from "@components/layout/PageLayout";
import styles from "./notification.module.css";
import {
	CheckCircle,
	AlertTriangle,
	Info,
	XCircle,
	UserPlus,
	Database,
} from "lucide-react";

const notifications = [
	{
		id: 1,
		date: "2025-11-07",
		type: "success",
		message: "New client 'Jane Smith' has been added to the system.",
		time: "09:35 AM",
	},
	{
		id: 2,
		date: "2025-11-07",
		type: "update",
		message: "Profile information for 'John Doe' was updated.",
		time: "08:50 AM",
	},
	{
		id: 3,
		date: "2025-11-06",
		type: "info",
		message: "System backup completed successfully.",
		time: "06:12 PM",
	},
	{
		id: 4,
		date: "2025-11-05",
		type: "warning",
		message: "Storage usage has reached 85% capacity.",
		time: "03:48 PM",
	},
	{
		id: 5,
		date: "2025-11-05",
		type: "error",
		message: "Failed to sync data for client ‘Emily Zhang’.",
		time: "02:10 PM",
	},
];

const iconMap = {
	success: <CheckCircle className={styles.iconSuccess} size={20} />,
	warning: <AlertTriangle className={styles.iconWarning} size={20} />,
	info: <Info className={styles.iconInfo} size={20} />,
	error: <XCircle className={styles.iconError} size={20} />,
	update: <Database className={styles.iconUpdate} size={20} />,
	default: <UserPlus className={styles.iconDefault} size={20} />,
};

export default function NotificationsPage() {
	const grouped = notifications.reduce((acc, item) => {
		acc[item.date] = acc[item.date] || [];
		acc[item.date].push(item);
		return acc;
	}, {});

	return (
		<PageLayout>
			<div className={styles.pageHeader}>
				<h1>Notifications</h1>
				<p className={styles.subtitle}>Recent activities and updates</p>
			</div>

			<div className={styles.wrapper}>
				{Object.entries(grouped).map(([date, items]) => (
					<div key={date} className={styles.section}>
						<h2 className={styles.dateTitle}>{date}</h2>
						<div className={styles.list}>
							{items.map((n) => (
								<div key={n.id} className={styles.item}>
								<div className={styles.iconWrapper}>
									{iconMap[n.type] || iconMap.default}
								</div>
								<p className={styles.message}>{n.message}</p>
								<span className={styles.time}>{n.time}</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</PageLayout>
	);
}
