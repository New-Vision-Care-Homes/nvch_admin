"use client";

import styles from "./stub.module.css";
import { Shield } from "lucide-react";

export default function SecurityPage() {
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Shield size={28} className={styles.icon} />
				<h1 className={styles.title}>Security</h1>
			</div>
			<p className={styles.description}>
				Update your password, manage two-factor authentication, and review active sessions.
			</p>
			<div className={styles.placeholder}>
				<span>Security settings coming soon.</span>
			</div>
		</div>
	);
}
