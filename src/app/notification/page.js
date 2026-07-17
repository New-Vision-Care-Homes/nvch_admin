"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@components/layout/PageLayout";
import Pagination from "@/components/UI/Pagination";
import EmptyState from "@/components/UI/EmptyState";
import Button from "@components/UI/Button";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import styles from "./notification.module.css";
import {
	Bell,
	AlertTriangle,
	Clock,
	Megaphone,
	CircleOff,
	CheckCheck,
	ExternalLink,
	ClipboardCheck,
	BadgeCheck,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a human-friendly relative time string from an ISO date. */
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

/** Groups a flat notifications array into { "Today": [...], "Yesterday": [...], ... } */
function groupByDate(items) {
	const today     = new Date().toDateString();
	const yesterday = new Date(Date.now() - 86_400_000).toDateString();
	return items.reduce((acc, n) => {
		const d = new Date(n.createdAt).toDateString();
		const label =
			d === today     ? "Today"
		:   d === yesterday ? "Yesterday"
		:   new Date(n.createdAt).toLocaleDateString("en-CA", {
				month: "long", day: "numeric", year: "numeric",
			});
		(acc[label] ??= []).push(n);
		return acc;
	}, {});
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Maps each notification type to an icon component + colour palette. */
const TYPE_CONFIG = {
	shift_missed:           { Icon: AlertTriangle,   color: "#dc2626", bg: "#fef2f2" },
	shift_late_start:       { Icon: Clock,           color: "#d97706", bg: "#fffbeb" },
	shift_missed_reporting: { Icon: AlertTriangle,   color: "#ea580c", bg: "#fff7ed" },
	shift_late_reporting:   { Icon: Clock,           color: "#d97706", bg: "#fffbeb" },
	shift_auto_ended:       { Icon: CircleOff,       color: "#6b7280", bg: "#f3f4f6" },
	broadcast:              { Icon: Megaphone,       color: "#dc2626", bg: "#fef2f2" },
	approval_requested:     { Icon: ClipboardCheck,  color: "#7c3aed", bg: "#f5f3ff" },
	// Teal-green: signals a completed/resolved action rather than a pending one
	approval_decided:       { Icon: BadgeCheck,      color: "#0891b2", bg: "#ecfeff" },
};

/**
 * Portal shift notification types that deep-link to the shift detail page.
 * All of these carry data.shiftId and are tappable per the API spec.
 * `broadcast` is intentionally excluded — it has no destination.
 */
const SHIFT_TYPES = new Set([
	"shift_missed",
	"shift_late_start",
	"shift_missed_reporting",
	"shift_late_reporting",
	"shift_auto_ended",
]);

/** Approval notification types — both route to /approvals/[id]. */
const APPROVAL_TYPES = new Set(["approval_requested", "approval_decided"]);

// ─── NotificationCard ─────────────────────────────────────────────────────────

function NotificationCard({ notification: n, onClick }) {
	const { Icon, color, bg } = TYPE_CONFIG[n.type] ?? {
		Icon: Bell, color: "#6b7280", bg: "#f9fafb",
	};
	const isShiftLink    = SHIFT_TYPES.has(n.type);
	const isApprovalLink = APPROVAL_TYPES.has(n.type);

	return (
		<div
			className={`${styles.card} ${!n.isRead ? styles.cardUnread : ""}`}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
			aria-label={n.title}
		>
			{/* Coloured icon box */}
			<div className={styles.iconBox} style={{ background: bg }}>
				<Icon size={18} color={color} strokeWidth={2} />
			</div>

			{/* Main content */}
			<div className={styles.body}>
				<div className={styles.titleRow}>
					<span className={styles.title}>{n.title}</span>
					{n.type === "broadcast" && (
						<span className={styles.broadcastBadge}>Broadcast</span>
					)}
					{n.type === "approval_requested" && (
						<span className={styles.approvalBadge}>Needs Review</span>
					)}
					{n.type === "approval_decided" && (
						<span className={styles.decidedBadge}>Reviewed</span>
					)}
				</div>
				{n.body && <p className={styles.bodyText}>{n.body}</p>}
			</div>

			{/* Time + deep-link hint */}
			<div className={styles.meta}>
				<span className={styles.time}>{timeAgo(n.createdAt)}</span>
				{(isShiftLink || isApprovalLink) && (
					<ExternalLink size={13} className={styles.linkIcon} />
				)}
			</div>
		</div>
	);
}

// ─── FilterTab ────────────────────────────────────────────────────────────────

function FilterTab({ label, active, badge, onClick }) {
	return (
		<button
			className={`${styles.tab} ${active ? styles.tabActive : ""}`}
			onClick={onClick}
		>
			{label}
			{badge > 0 && (
				<span className={`${styles.tabBadge} ${active ? styles.tabBadgeActive : ""}`}>
					{badge}
				</span>
			)}
		</button>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BROADCAST_SLUGS = [
	"broadcast_to_all_caregivers",
	"broadcast_to_all_admins",
	"broadcast_to_regions",
	"broadcast_to_homes",
	"broadcast_to_individuals",
];

export default function NotificationsPage() {
	const router = useRouter();
	const [filter, setFilter] = useState("all"); // "all" | "unread"
	const [page,   setPage]   = useState(1);

	const { profile } = useProfile();
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const canSendBroadcast = BROADCAST_SLUGS.some(s => permissionSlugs.includes(s));

	const params = {
		page,
		limit: 20,
		...(filter === "unread" && { unread: true }),
	};

	const {
		notifications,
		unreadCount,
		totalPages,
		isNotificationsLoading,
		markRead,
		markAllRead,
		isActionPending,
		fetchNotificationError,
	} = useNotifications({ params, fetchList: true });
	console.log(notifications);

	const handleNotificationClick = async (n) => {
		// Always mark as read first
		if (!n.isRead) await markRead(n._id).catch(() => {});

		// Shift-related notifications → go to the shift detail page.
		if (SHIFT_TYPES.has(n.type) && n.data?.shiftId) {
			router.push(`/scheduling/${n.data.shiftId}`);
			return;
		}

		// Approval notifications (requested + decided) → approval detail page.
		if (APPROVAL_TYPES.has(n.type) && n.data?.approvalId) {
			router.push(`/approvals/${n.data.approvalId}`);
			return;
		}
		// broadcast and other non-tappable types: no navigation, just mark read.
	};

	const handleFilterChange = (next) => {
		setFilter(next);
		setPage(1); // reset pagination when switching filters
	};

	const grouped = groupByDate(notifications);

	return (
		<PageLayout>

			{/* ── Page header ──────────────────────────────────────────── */}
			<div className={styles.header}>
				<div>
					<h1>Notifications</h1>
					<p className={styles.subheading}>Recent updates from your portal</p>
				</div>
				<div className={styles.headerActions}>
					{canSendBroadcast && (
						<Button
							variant="primary"
							icon={<Megaphone size={15} />}
							onClick={() => router.push("/notification/create")}
						>
							Send Notification
						</Button>
					)}
					{unreadCount > 0 && (
						<button
							className={styles.markAllBtn}
							onClick={() => markAllRead()}
							disabled={isActionPending}
						>
							<CheckCheck size={15} />
							Mark all read
						</button>
					)}
				</div>
			</div>

			{/* ── Filter tabs ───────────────────────────────────────────── */}
			<div className={styles.tabs}>
				<FilterTab
					label="All"
					active={filter === "all"}
					onClick={() => handleFilterChange("all")}
				/>
				<FilterTab
					label="Unread"
					active={filter === "unread"}
					badge={unreadCount}
					onClick={() => handleFilterChange("unread")}
				/>
			</div>

			{/* ── Loading skeleton ──────────────────────────────────────── */}
			{isNotificationsLoading && (
				<div className={styles.skeletonList}>
					{[...Array(5)].map((_, i) => (
						<div key={i} className={styles.skeleton} />
					))}
				</div>
			)}

			{/* ── Error state ───────────────────────────────────────────── */}
			{!isNotificationsLoading && fetchNotificationError && (
				<EmptyState
					title="Could not load notifications"
					message={fetchNotificationError}
				/>
			)}

			{/* ── Empty state ───────────────────────────────────────────── */}
			{!isNotificationsLoading && !fetchNotificationError && notifications.length === 0 && (
				<EmptyState
					title={filter === "unread" ? "All caught up!" : "No notifications yet"}
					message={
						filter === "unread"
							? "You have no unread notifications."
							: "Operational alerts and broadcasts will appear here."
					}
				/>
			)}

			{/* ── Notification list ─────────────────────────────────────── */}
			{!isNotificationsLoading && !fetchNotificationError && notifications.length > 0 && (
				<>
					{Object.entries(grouped).map(([dateLabel, items]) => (
						<div key={dateLabel} className={styles.group}>
							<p className={styles.dateLabel}>{dateLabel}</p>
							<div className={styles.list}>
								{items.map((n) => (
									<NotificationCard
										key={n._id}
										notification={n}
										onClick={() => handleNotificationClick(n)}
									/>
								))}
							</div>
						</div>
					))}

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
