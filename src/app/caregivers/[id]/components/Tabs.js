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
