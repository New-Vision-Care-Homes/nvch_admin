import { useState } from "react";
import styles from "./Tabs.module.css";
import Info from "./Info";
import Shifts from "./Shifts"
import Timesheet from "./Timesheet";
import Certification from "./Certification";
import Device from "./Device";
import { TabDirtyProvider, useTabDirty } from "@/context/TabDirtyContext";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import UnsavedChangesModal from "@components/UI/Modal/UnsavedChangesModal";


export default function Tabs() {
	return (
		<TabDirtyProvider>
			<TabsInner />
		</TabDirtyProvider>
	);
}

function TabsInner() {
	const [activeTab, setActiveTab] = useState("personal");
	const [pendingTab, setPendingTab] = useState(null);
	const { isDirty, setIsDirty } = useTabDirty();
	const { setIsDirty: setRouteIsDirty } = useRouteDirty();

	const tabs = [
		{ id: "personal", label: "Personal Info", component: <Info /> },
		{ id: "certification", label: "Certification", component: <Certification /> },
		{ id: "shifts", label: "Shifts & Schedule", component: <Shifts /> },
		{ id: "timesheets", label: "Timesheets & Approvals", component: <Timesheet /> },
		{ id: "device", label: "Device", component: <Device /> },
		//{ id: "Performance", label: "Performance & Feedback", component: <div>performance</div> },
		//{ id: "payroll", label: "Payroll & Payments", component: <div>payroll</div> },
	];

	const activeComponent = tabs.find((tab) => tab.id === activeTab)?.component;

	function requestTabChange(tabId) {
		if (tabId === activeTab) return;
		if (isDirty) {
			setPendingTab(tabId);
		} else {
			setActiveTab(tabId);
		}
	}

	function confirmDiscard() {
		setIsDirty(false);
		// Also clear the route-level flag: the tab being switched to might be
		// read-only (e.g. Shifts, Device) and never report its own dirty state,
		// which would otherwise leave a stale "dirty" flag for the sidebar.
		setRouteIsDirty(false);
		setActiveTab(pendingTab);
		setPendingTab(null);
	}

	return (
		<div>
			{/* Desktop: horizontal pill buttons */}
			<div className={styles.tabsList}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={`${styles.tabTrigger} ${activeTab === tab.id ? styles.active : ""}`}
						onClick={() => requestTabChange(tab.id)}
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
					onChange={(e) => requestTabChange(e.target.value)}
				>
					{tabs.map((tab) => (
						<option key={tab.id} value={tab.id}>{tab.label}</option>
					))}
				</select>
			</div>

			<div className={styles.tabContent}>
				{activeComponent}
			</div>

			<UnsavedChangesModal
				isOpen={pendingTab !== null}
				onClose={() => setPendingTab(null)}
				onConfirm={confirmDiscard}
			/>
		</div>
	);
}
