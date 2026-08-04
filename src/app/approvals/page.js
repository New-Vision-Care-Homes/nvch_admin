"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import Pagination from "@/components/UI/Pagination";
import EmptyState from "@/components/UI/EmptyState";
import { useApprovals } from "@/hooks/useApprovals";
import { useProfile } from "@/hooks/useProfile";
import { ClipboardCheck } from "lucide-react";
import ApprovalRow from "./_components/ApprovalRow";
import AcknowledgeTab from "./_components/AcknowledgeTab";
import styles from "./approvals.module.css";

export default function ApprovalsPage() {
	const router             = useRouter();
	const [mainTab, setMainTab] = useState("approvals");
	const [page,    setPage]    = useState(1);

	const { profile } = useProfile();
	const canSeeAcknowledge = profile?.permissionSlugs?.some(
		(s) => s === "view_payroll" || s === "manage_payroll"
	) ?? false;

	const { approvals, totalPages, isLoading, fetchError } = useApprovals({
		params:     { page, limit: 20 },
		fetchQueue: mainTab === "approvals",
	});

	const switchTab = (tab) => { setMainTab(tab); setPage(1); };

	return (
		<PageLayout>

			<div className={styles.header}>
				<h1>Approvals & Acknowledge</h1>
			</div>

			{/* ── Main tab bar ─────────────────────────────────────────── */}
			<div className={styles.mainTabs}>
				<button
					className={`${styles.mainTab} ${mainTab === "approvals" ? styles.mainTabActive : ""}`}
					onClick={() => switchTab("approvals")}
				>
					Approvals
				</button>
				{canSeeAcknowledge && (
					<button
						className={`${styles.mainTab} ${mainTab === "acknowledge" ? styles.mainTabActive : ""}`}
						onClick={() => switchTab("acknowledge")}
					>
						Acknowledge
					</button>
				)}
			</div>

			{/* ── Approvals tab ────────────────────────────────────────── */}
			{mainTab === "approvals" && (
				<>
					{isLoading && (
						<div className={styles.skeletonList}>
							{[...Array(5)].map((_, i) => <div key={i} className={styles.skeleton} />)}
						</div>
					)}

					{!isLoading && fetchError && (
						<EmptyState title="Could not load approvals" message={fetchError} />
					)}

					{!isLoading && !fetchError && approvals.length === 0 && (
						<EmptyState
							title="No pending approvals"
							message="There are no pending approvals that require your review."
							icon={<ClipboardCheck size={32} color="#c4b5fd" />}
						/>
					)}

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
				</>
			)}

			{/* ── Acknowledge tab ──────────────────────────────────────── */}
			{mainTab === "acknowledge" && canSeeAcknowledge && <AcknowledgeTab />}

		</PageLayout>
	);
}
