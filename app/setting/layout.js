"use client";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import SettingsSidebar from "./components/SettingsSidebar";
import styles from "./setting.module.css";

export default function SettingsLayout({ children }) {
	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<SettingsSidebar />
				<div className={styles.body}>
					{children}
				</div>
			</div>
		</div>
	);
}
