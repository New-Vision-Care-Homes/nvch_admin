// components/PageLayout.jsx
"use client";
import React, { useState } from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import { useSidebarCollapsed } from "@components/layout/useSidebarCollapsed";
import styles from "./PageLayout.module.css";

export default function PageLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();

	return (
		<div className={styles.page}>
			<Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
			<div className={styles.container}>
				<Sidebar
					open={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
					collapsed={sidebarCollapsed}
					onToggleCollapsed={toggleSidebarCollapsed}
				/>
				<div className={styles.main}>
					{children}
				</div>
			</div>
		</div>
	);
}
