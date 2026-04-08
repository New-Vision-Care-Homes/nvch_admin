"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import styles from "./ActionMessage.module.css";

/**
 * ActionMessage — Reusable success / error banner for form actions.
 *
 * Props:
 *  - variant:  "success" | "error"   (required)
 *  - message:  string                (required)
 *  - onClose:  () => void            (optional) — renders an ✕ dismiss button when provided
 */
export default function ActionMessage({ variant = "error", message, onClose }) {
	if (!message) return null;

	const isSuccess = variant === "success";

	return (
		<div
			className={`${styles.banner} ${isSuccess ? styles.success : styles.error}`}
			role="alert"
		>
			<span className={styles.icon}>
				{isSuccess ? (
					<CheckCircle2 size={16} />
				) : (
					<AlertCircle size={16} />
				)}
			</span>

			<span className={styles.message}>{message}</span>

			{onClose && (
				<button
					type="button"
					className={styles.closeBtn}
					onClick={onClose}
					aria-label="Dismiss"
				>
					<X size={14} />
				</button>
			)}
		</div>
	);
}
