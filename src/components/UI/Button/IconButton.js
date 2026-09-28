import Link from "next/link";
import styles from "./IconButton.module.css";

/**
 * 32×32 icon button — use variant="danger" for destructive actions.
 * Pass `href` to render as a Next.js Link; omit it for a plain button.
 */
export default function IconButton({
	variant = "default",
	href,
	onClick,
	title,
	children,
	className = "",
	disabled = false,
}) {
	const cls = [styles.btn, styles[variant], className].filter(Boolean).join(" ");

	if (href) {
		return (
			<Link href={href} className={cls} title={title}>
				{children}
			</Link>
		);
	}

	return (
		<button
			type="button"
			className={cls}
			onClick={onClick}
			title={title}
			disabled={disabled}
		>
			{children}
		</button>
	);
}
