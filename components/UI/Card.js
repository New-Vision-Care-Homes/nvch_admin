// components/ui/Card.js
import React from "react";
import styles from "./Card.module.css"

export function Card({ children, className }) {
  	return <div className={`${styles.card} ${className || ""}`}>{children}</div>;
}

export function CardHeader({ children, className }) {
  	return <div className={`${styles.header} ${className || ""}`}>{children}</div>;
}

export function CardContent({ children, className }) {
	return <div className={`${styles.content} ${className || ""}`}>{children}</div>;
}

export default function InputField({ label, value, onChange, type = "input", rows = 1 }) {
	return (
		<div className={styles.field}>
			<label className={styles.label}>{label}</label>
			{type === "textarea" ? (
				<textarea
				 className={styles.input}
				 value={value}
				 onChange={onChange}
				 rows={rows}
				/>
			) : (
				<input
				 className={styles.input}
				 value={value}
				 onChange={onChange}
				/>
			)}
		</div>
	);
}


export function InfoField({ label, value, children, className }) {
	return (
		<div className={`${styles.info_field} ${className || ""}`}>
			<div className={styles.info_label}>{label}</div>
			<div className={styles.info_value}>
				{children || value}
			</div>
		</div>
	);
}
