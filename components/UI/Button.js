import React from "react";
import styles from "./Button.module.css";

/**
 * 
 * 
 * @param {string} variant
 * @param {string} size
 * @param {boolean} disabled
 * @param {function} onClick
 * @param {ReactNode} children
 */
export default function Button({
		variant = "primary",
		size = "md",
		disabled = false,
		onClick,
		children,
		type = "button",
		className = "",
	}) {
	return (
		<button
			type={type}
			className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}
