import styles from "./PageHeader.module.css";

/**
 * Shared macro page header: title on the left, back/action buttons on the
 * right — no breadcrumb above the title. Replaces the `.pageHeader`/`.header`
 * + `.headerActions` markup each page used to hand-roll with slightly
 * different spacing.
 *
 * Only fits the simple "h1 + actions" shape. Pages whose header also carries
 * status pills, subtitles, or a meta row (e.g. approval/shift detail pages)
 * keep their own richer header markup.
 *
 * @param {string} title
 * @param {ReactNode} [actions] - buttons/links rendered on the right
 * @param {string} [titleClassName] - escape hatch for the handful of pages
 *   with a non-default h1 size; only spacing is otherwise shared.
 */
export default function PageHeader({ title, actions, titleClassName }) {
	return (
		<div className={styles.pageHeader}>
			<h1 className={titleClassName}>{title}</h1>
			{actions && <div className={styles.headerActions}>{actions}</div>}
		</div>
	);
}
