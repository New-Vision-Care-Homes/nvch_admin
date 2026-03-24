"use client";

import styles from "./stub.module.css";
import { SlidersHorizontal } from "lucide-react";

export default function PreferencesPage() {
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<SlidersHorizontal size={28} className={styles.icon} />
				<h1 className={styles.title}>Preferences</h1>
			</div>
			<p className={styles.description}>
				Customize your experience — display language, timezone, theme, and more.
			</p>
			<div className={styles.placeholder}>
				<span>Preference settings coming soon.</span>
			</div>
		</div>
	);
}
