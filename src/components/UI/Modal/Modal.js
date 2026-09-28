import React from "react";
import styles from "./Modal.module.css";

export default function Modal({ isOpen, onClose, children, className = "" }) {
	if (!isOpen) return null;

	return (
		<>
			<div className={styles.overlay} onClick={onClose}></div>
			<div className={`${styles.modal} ${className}`}>
				{children}
				<button className={styles.closeBtn} onClick={onClose}>X</button>
			</div>
		</>
	);
}
