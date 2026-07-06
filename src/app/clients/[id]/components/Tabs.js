import { useState } from "react";
import styles from "./Tabs.module.css";
import Info from "./Info";
import CarePlan from "./CarePlan";
import FocusNotes from "./FocusNotes";
import Assigned from "./Assigned";
import History from "./History";


export default function Tabs() {
	const [activeTab, setActiveTab] = useState("personal");

	const tabs = [
		{ id: "personal", label: "Personal Info", component: <Info /> },
		{ id: "care", label: "Care Plan", component: <CarePlan /> },
		{ id: "focus", label: "Focus Notes", component: <FocusNotes /> },
		/*{ id: "caregivers", label: "Assigned Caregivers", component: <Assigned /> },*/
		/*{ id: "history", label: "Visit History", component: <History /> },*/
		/*
		{ id: "billing", label: "Billing/Invoices", component: <Billing /> },
		 */
	];

	const activeComponent = tabs.find((tab) => tab.id === activeTab)?.component;

	return (
		<div>
			{/* Desktop: horizontal pill buttons */}
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

			{/* Mobile: dropdown */}
			<div className={styles.tabsDropdownWrap}>
				<select
					className={styles.tabsDropdown}
					value={activeTab}
					onChange={(e) => setActiveTab(e.target.value)}
				>
					{tabs.map((tab) => (
						<option key={tab.id} value={tab.id}>{tab.label}</option>
					))}
				</select>
			</div>

			<div className={styles.tabContent}>
				{activeComponent}
			</div>
		</div>
	);
}
