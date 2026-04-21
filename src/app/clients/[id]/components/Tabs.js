import { useState } from "react";
import styles from "./Tabs.module.css";
import Info from "./Info";
import CarePlan from "./CarePlan";
import Assigned from "./Assigned"
import History from "./History";


export default function Tabs() {
	const [activeTab, setActiveTab] = useState("personal");

	const tabs = [
		{ id: "personal", label: "Personal Info", component: <Info /> },
		{ id: "care", label: "Care Plan", component: <CarePlan /> },
		/*{ id: "caregivers", label: "Assigned Caregivers", component: <Assigned /> },*/
		/*{ id: "history", label: "Visit History", component: <History /> },*/
		/*
		{ id: "billing", label: "Billing/Invoices", component: <Billing /> },
		 */
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
