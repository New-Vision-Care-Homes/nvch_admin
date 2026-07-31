import styles from "./StatusBadge.module.css";

/**
 * Small colored status pill shared across the app's various status enums
 * (shifts, approvals, payroll entries, holidays, trainings, profile active
 * state, etc). Callers compute the label/tone from their own status enum —
 * this component only owns the visual chrome.
 *
 * @param {string} label                                       - Display text
 * @param {"success"|"info"|"neutral"|"warning"|"danger"} [tone="neutral"]
 * @param {"pill"|"detail"|"tag"} [size="pill"]                 - "pill" = bordered list-row badge, "detail" = uppercase detail-page badge, "tag" = compact uppercase badge for dense table rows
 * @param {ReactNode} [icon]                                    - Optional icon rendered before the label
 */
export default function StatusBadge({ label, tone = "neutral", size = "pill", icon }) {
    return (
        <span className={`${styles.badge} ${styles[size] || ""} ${styles[tone] || ""}`}>
            {icon}
            {label}
        </span>
    );
}
