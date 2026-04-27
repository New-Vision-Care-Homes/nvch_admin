import { Inbox } from "lucide-react";
import styles from "./EmptyState.module.css";

export default function EmptyState({ title = "No data found", message = "There is no data available at the moment." }) {
	return (
		<div className={styles.wrap}>
			<div className={styles.iconCircle}>
				<Inbox size={24} color="#6B7280" />
			</div>
			<p className={styles.title}>{title}</p>
			<p className={styles.message}>{message}</p>
		</div>
	);
}
