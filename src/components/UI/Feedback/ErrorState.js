// components/UI/ErrorState.js

import { AlertCircle, RefreshCw } from "lucide-react";
import styles from "./ErrorState.module.css";

export default function ErrorState({ isLoading, errorMessage, onRetry }) {

	if (isLoading) return (
		<div className={styles.wrap}>
			<div className={styles.spinner} />
			<p className={styles.loadingText}>Loading...</p>
		</div>
	);

	if (errorMessage) return (
		<div className={styles.wrap}>
			<div className={styles.iconCircle}>
				<AlertCircle size={24} color="#DC2626" />
			</div>
			<p className={styles.title}>Failed to load data</p>
			<p className={styles.message}>{errorMessage}</p>
			{onRetry && (
				<button className={styles.retryBtn} onClick={onRetry}>
					<RefreshCw size={14} />
					Try again
				</button>
			)}
		</div>
	);

	return null;
}