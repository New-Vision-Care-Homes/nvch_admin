// components/PageLayout.jsx
import React from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./PageLayout.module.css";

export default function PageLayout({ children }) {
	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.main}>
					{children}
				</div>
			</div>
		</div>
	);
}
