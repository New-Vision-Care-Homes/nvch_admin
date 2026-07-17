"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import Pagination from "@/components/UI/Pagination";
import EmptyState from "@/components/UI/EmptyState";
import { useApprovals } from "@/hooks/useApprovals";
import { ClipboardCheck, User, ExternalLink, Timer, Scale, Banknote } from "lucide-react";
import styles from "./approvals.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const m = Math.floor(diff / 60_000);
	const h = Math.floor(diff / 3_600_000);
	const d = Math.floor(diff / 86_400_000);
	if (m < 1)  return "Just now";
	if (m < 60) return `${m}m ago`;
	if (h < 24) return `${h}h ago`;
	if (d === 1) return "Yesterday";
	if (d < 7)  return `${d}d ago`;
	return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatCertName(raw) {
	if (!raw) return "—";
	return raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Per-type display metadata ─────────────────────────────────────────────────

const ROW_TYPE_META = {
	caregiver_certificate: {
		Icon: ClipboardCheck,
		iconColor: "#7c3aed",
		iconBg: "#f5f3ff",
		SubtitleIcon: User,
		getSubtitle: (ctx) => formatCertName(ctx.certificateName),
	},
	overtime_acknowledgment: {
		Icon: Timer,
		iconColor: "#d97706",
		iconBg: "#fffbeb",
		SubtitleIcon: Timer,
		getSubtitle: (ctx) => ctx.plannedOverageHours != null
			? `${ctx.plannedOverageHours}h planned overage`
			: "Voluntary Overtime",
	},
	overtime_mandate: {
		Icon: Scale,
		iconColor: "#dc2626",
		iconBg: "#fef2f2",
		SubtitleIcon: Scale,
		getSubtitle: (ctx) => ctx.plannedOverageHours != null
			? `${ctx.plannedOverageHours}h mandate required`
			: "Overtime Mandate",
	},
	banked_hours_payout: {
		Icon: Banknote,
		iconColor: "#059669",
		iconBg: "#f0fdf4",
		SubtitleIcon: Banknote,
		getSubtitle: (ctx) => ctx.requestedHours != null
			? `${ctx.requestedHours}h payout request`
			: "Hours Payout",
	},
};

// ─── ApprovalRow ──────────────────────────────────────────────────────────────

function ApprovalRow({ approval, onClick }) {
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
	const router = useRouter();
	const [page, setPage] = useState(1);

	const { approvals, totalPages, isLoading, fetchError } = useApprovals({
		params: { page, limit: 20 },
		fetchQueue: true,
	});

	return (
		<PageLayout>

			<div className={styles.header}>
				<div><h1>Approvals</h1></div>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className={styles.skeletonList}>
					{[...Array(5)].map((_, i) => <div key={i} className={styles.skeleton} />)}
				</div>
			)}

			{/* Error */}
			{!isLoading && fetchError && (
				<EmptyState title="Could not load approvals" message={fetchError} />
			)}

			{/* Empty */}
			{!isLoading && !fetchError && approvals.length === 0 && (
				<EmptyState
					title="No pending approvals"
					message="There are no pending approvals that require your review."
					icon={<ClipboardCheck size={32} color="#c4b5fd" />}
				/>
			)}

			{/* List */}
			{!isLoading && !fetchError && approvals.length > 0 && (
				<>
					<div className={styles.list}>
						{approvals.map((approval) => (
							<ApprovalRow
								key={approval._id}
								approval={approval}
								onClick={() => router.push(`/approvals/${approval._id}`)}
							/>
						))}
					</div>
					<Pagination
						pageCount={totalPages}
						forcePage={page - 1}
						onPageChange={({ selected }) => setPage(selected + 1)}
					/>
				</>
			)}

		</PageLayout>
	);
}
