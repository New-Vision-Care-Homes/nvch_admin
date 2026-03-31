import React from "react";
import styles from "./Button.module.css";

/**
 * @param {string} variant
 * @param {string} size
 * @param {boolean} disabled
 * @param {function} onClick
 * @param {ReactNode} children
 * @param {ReactNode} icon
 */
export default function Button({
	variant = "primary",
	size = "md",
	disabled = false,
	onClick,
	children,
	type = "button",
	className = "",
	icon = null,
}) {
	return (
		<button
			type={type}
			className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
			disabled={disabled}
			onClick={onClick}
		>
			{icon && <span className={styles.icon}>{icon}</span>}
			<span className={styles.text}>{children}</span>
		</button>
	);
}

