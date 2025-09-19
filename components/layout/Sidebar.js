"use client";
import react from "react";
import { useState } from "react";
import Image from "next/image";
import styles from "./Sidebar.module.css";

const tabs = [
	{ id: 1, label: "Dashboard", icon: "/img/sidebar/dashboard.svg" },
	{ id: 2, label: "Clients", icon: "/img/sidebar/clients.svg" },
	{ id: 3, label: "Caregivers", icon: "/img/sidebar/caregivers.svg" },
	{ id: 4, label: "Scheduling", icon: "/img/sidebar/Scheduling.svg" },
	{ id: 5, label: "Billing & Payroll", icon: "/img/sidebar/billing.svg" },
	{ id: 6, label: "Incidents & Compliance", icon: "/img/sidebar/incidents.svg" },
	{ id: 7, label: "Messaging", icon: "/img/sidebar/message.svg" },
	{ id: 8, label: "Reports & Analytics", icon: "/img/sidebar/reports.svg" },
	{ id: 9, label: "Settings", icon: "/img/sidebar/setting.svg" }
];

export default function Sidebar() {
	const [activeTab, setActiveTab] = useState(1);

	return (
		<div className={styles.sidebar}>
			{tabs.map((tab) => (
				<div
					key={tab.id}
					className={styles.tab}
					onClick={() => setActiveTab(tab.id)}
				>
					<div>
						<Image src={tab.icon} alt={tab.label} width={24} height={24} />
					</div>
					<div>{tab.label}</div>
				</div>
			))}
		</div>
	);
}
