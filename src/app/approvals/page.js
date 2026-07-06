"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import Pagination from "@/components/UI/Pagination";
import EmptyState from "@/components/UI/EmptyState";
import { useApprovals } from "@/hooks/useApprovals";
import { ClipboardCheck, User, ExternalLink } from "lucide-react";
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

// ─── ApprovalRow ──────────────────────────────────────────────────────────────

function ApprovalRow({ approval, onClick }) {
	const ctx  = approval.subjectContext ?? {};
	const name = ctx.caregiverName ?? "Unknown caregiver";
	const cert = formatCertName(ctx.certificateName);

	return (
		<div
			className={styles.row}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
			aria-label={`${name} — ${cert}`}
		>
			<div className={styles.iconBox}>
				<ClipboardCheck size={18} color="#7c3aed" />
			</div>

			<div className={styles.rowBody}>
				<span className={styles.rowTitle}>{name}</span>
				<span className={styles.rowSubtitle}>
					<User size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
					{cert}
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
					message="There are no pending certificate approvals that require your review."
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
