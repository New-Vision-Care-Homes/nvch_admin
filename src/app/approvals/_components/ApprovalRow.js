"use client";

import { ClipboardCheck, User, ExternalLink, Timer, Scale, Banknote } from "lucide-react";
import { timeAgo, formatCertName } from "../_utils/approvalMeta";
import styles from "../approvals.module.css";

const ROW_TYPE_META = {
	caregiver_certificate: {
		Icon: ClipboardCheck,
		iconColor: "#7c3aed",
		iconBg:    "#f5f3ff",
		SubtitleIcon: User,
		getSubtitle: (ctx) => formatCertName(ctx.certificateName),
	},
	overtime_acknowledgment: {
		Icon: Timer,
		iconColor: "#d97706",
		iconBg:    "#fffbeb",
		SubtitleIcon: Timer,
		getSubtitle: (ctx) => ctx.plannedOverageHours != null
			? `${ctx.plannedOverageHours}h planned overage`
			: "Voluntary Overtime",
	},
	overtime_mandate: {
		Icon: Scale,
		iconColor: "#dc2626",
		iconBg:    "#fef2f2",
		SubtitleIcon: Scale,
		getSubtitle: (ctx) => ctx.plannedOverageHours != null
			? `${ctx.plannedOverageHours}h mandate required`
			: "Overtime Mandate",
	},
	banked_hours_payout: {
		Icon: Banknote,
		iconColor: "#059669",
		iconBg:    "#f0fdf4",
		SubtitleIcon: Banknote,
		getSubtitle: (ctx) => ctx.requestedHours != null
			? `${ctx.requestedHours}h payout request`
			: "Hours Payout",
	},
};

export default function ApprovalRow({ approval, onClick }) {
	const ctx  = approval.subjectContext ?? {};
	const name = ctx.caregiverName ?? "Unknown caregiver";
	const { Icon, iconColor, iconBg, SubtitleIcon, getSubtitle } =
		ROW_TYPE_META[approval.subjectType] ?? ROW_TYPE_META.caregiver_certificate;
	const subtitle = getSubtitle(ctx);

	return (
		<div
			className={styles.row}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
			aria-label={`${name} — ${subtitle}`}
		>
			<div className={styles.iconBox} style={{ background: iconBg }}>
				<Icon size={18} color={iconColor} />
			</div>

			<div className={styles.rowBody}>
				<span className={styles.rowTitle}>{name}</span>
				<span className={styles.rowSubtitle}>
					<SubtitleIcon size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
					{subtitle}
				</span>
			</div>

			<div className={styles.rowMeta}>
				<span className={styles.rowTime}>{timeAgo(approval.createdAt)}</span>
			</div>

			<ExternalLink size={14} style={{ color: "#c4b5fd", flexShrink: 0 }} />
		</div>
	);
}
