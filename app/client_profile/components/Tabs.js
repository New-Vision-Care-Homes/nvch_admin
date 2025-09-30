import { useState } from "react";
import styles from "./Tabs.module.css";
import Info from "./Info";
import CarePlan from "./CarePlan";
import Assigned from "./Assigned"

const AssignedCaregivers = () => <div>Assigned Caregivers Content</div>;
const VisitHistory = () => <div>Visit History Content</div>;
const BillingInvoices = () => <div>Billing/Invoices Content</div>;

export default function Tabs() {
	const [activeTab, setActiveTab] = useState("personal");

	const tabs = [
		{ id: "personal", label: "Personal Info", component: <Info /> },
		{ id: "care", label: "Care Plan", component: <CarePlan /> },
		{ id: "caregivers", label: "Assigned Caregivers", component: <Assigned /> },
		{ id: "history", label: "Visit History", component: <VisitHistory /> },
		{ id: "billing", label: "Billing/Invoices", component: <BillingInvoices /> },
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
