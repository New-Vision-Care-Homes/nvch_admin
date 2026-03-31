import React from "react";
import styles from "./Table.module.css"

export function Table({ children, className }) {
  	return <div className={`${styles.table} ${className || ""}`}>{children}</div>;
}

export function TableHeader({ children, className }) {
	return <div className={`${styles.header} ${className || ""}`}>{children}</div>;
}

export function TableCell({ children, className }) {
	return <div className={`${styles.cell} ${className || ""}`}>{children}</div>;
}

export function TableContent({ children, className }) {
	return <div className={`${styles.content} ${className || ""}`}>{children}</div>;
}