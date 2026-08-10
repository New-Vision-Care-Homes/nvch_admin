import { useState } from "react";
import styles from "./Tabs.module.css";
import Info from "./Info";
import Shifts from "./Shifts"
import Timesheet from "./Timesheet";
import Certification from "./Certification";


export default function Tabs() {
	const [activeTab, setActiveTab] = useState("personal");

	const tabs = [
		{ id: "personal", label: "Personal Info", component: <Info /> },
		{ id: "certification", label: "Certification", component: <Certification /> },
		{ id: "shifts", label: "Shifts & Schedule", component: <Shifts /> },
		{ id: "timesheets", label: "Timesheets & Approvals", component: <Timesheet /> },
		//{ id: "Performance", label: "Performance & Feedback", component: <div>performance</div> },
		//{ id: "payroll", label: "Payroll & Payments", component: <div>payroll</div> },
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
