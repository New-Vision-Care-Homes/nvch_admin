import { useState } from "react";
import styles from "./Tabs.module.css";
import User from "./User"
import Info from "./Info";
import CarePlan from "./CarePlan";
import Assigned from "./Assigned"
import History from "./User";
import Billing from "./Billing"


export default function Tabs() {
	const [activeTab, setActiveTab] = useState("user");

	const tabs = [
		{ id: "user", label: "User Management", component: <User /> },
		{ id: "system", label: "System Settings", component: <User /> },
		{ id: "logs", label: "Audit Logs", component: <User /> },
		{ id: "roles", label: "Roles & Permissions", component: <User /> },
	];

	return (
		<div>
			<div className={styles.tabsList}>
				{tabs.map((tab) => (
				<button
					key={tab.id}
					className={`${styles.tabTrigger} ${activeTab === tab.id ? styles.active : ""}`}
					onClick={() => setActiveTab(tab.id)}
				>
					{tab.label}
				</button>
				))}
			</div>

			<div className={styles.tabContent}>
				{tabs.find((tab) => tab.id === activeTab)?.component}
			</div>
		</div>
	);
}
