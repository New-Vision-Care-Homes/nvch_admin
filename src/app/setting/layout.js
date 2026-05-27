"use client";

import { useState } from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import SettingsSidebar from "./components/SettingsSidebar";
import styles from "./setting.module.css";

export default function SettingsLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className={styles.page}>
			<Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
			<div className={styles.container}>
				<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<SettingsSidebar />
				<div className={styles.body}>
					{children}
				</div>
			</div>
		</div>
	);
}
