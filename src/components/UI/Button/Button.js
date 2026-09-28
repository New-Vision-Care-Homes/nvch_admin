import React from "react";
import Link from "next/link";
import styles from "./Button.module.css";

/**
 * @param {string} variant
 * @param {string} size
 * @param {boolean} disabled
 * @param {function} onClick
 * @param {ReactNode} children
 * @param {ReactNode} icon
 * @param {string} [href] - Renders as a Link instead of a <button> when provided (e.g. "+ Add" actions that just navigate)
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
	form,
	href,
}) {
	const classes = `${styles.btn} ${styles[variant]} ${styles[size]} ${className}`;
	const content = (
		<>
			{icon && <span className={styles.icon}>{icon}</span>}
			<span className={styles.text}>{children}</span>
		</>
	);

	if (href) {
		return (
			<Link href={href} className={classes} aria-disabled={disabled}>
				{content}
			</Link>
		);
	}

	return (
		<button
			type={type}
			form={form}
			className={classes}
			disabled={disabled}
			onClick={onClick}
		>
			{content}
		</button>
	);
}

