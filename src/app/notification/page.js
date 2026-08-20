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
	PiggyBank,
	House,
	ChevronDown,
	Info,
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

/**
 * Maps each notification type to an icon component + colour palette.
 * Portal-only: per the notification spec, shift_assigned, shifts_bulk_created,
 * shift_starting_soon, training_assigned, and training_outcome surface on
 * mobile only and are intentionally omitted here. approval_decided is kept —
 * the portal does receive it in practice.
 */
const TYPE_CONFIG = {
	// Shift lifecycle
	shift_missed:                { Icon: AlertTriangle,  color: "#dc2626", bg: "#fef2f2" },
	shift_late_start:            { Icon: Clock,          color: "#d97706", bg: "#fffbeb" },
	shift_missed_reporting:      { Icon: AlertTriangle,  color: "#ea580c", bg: "#fff7ed" },
	shift_late_reporting:        { Icon: Clock,          color: "#d97706", bg: "#fffbeb" },
	shift_auto_ended:            { Icon: CircleOff,      color: "#6b7280", bg: "#f3f4f6" },
	// Payroll / house-hours review — house icon with a small corner badge
	// signalling *why* it's flagged (overdue vs. not started).
	house_hours_review_overdue:  { Icon: House, color: "#dc2626", bg: "#fef2f2", BadgeIcon: AlertTriangle, badgeColor: "#dc2626" },
	house_hours_review_not_done: { Icon: House, color: "#7c3aed", bg: "#f5f3ff", BadgeIcon: Clock,         badgeColor: "#7c3aed" },
	bank_cap_exceeded:           { Icon: PiggyBank,      color: "#d97706", bg: "#fffbeb" },
	// Broadcasts & approvals
	broadcast:                   { Icon: Megaphone,      color: "#dc2626", bg: "#fef2f2" },
	approval_requested:          { Icon: ClipboardCheck, color: "#7c3aed", bg: "#f5f3ff" },
};

/** Human-friendly display name for each notification type. */
const TYPE_LABEL = {
	shift_missed:                "Shift Missed",
	shift_late_start:            "Late Shift Start",
	shift_missed_reporting:      "Missing Shift Report",
	shift_late_reporting:        "Late Shift Report",
	shift_auto_ended:            "Shift Auto-Ended",
	house_hours_review_overdue:  "House Review Overdue",
	house_hours_review_not_done: "House Review Not Done",
	bank_cap_exceeded:           "Bank Cap Exceeded",
	broadcast:                   "Broadcast",
	approval_requested:          "Approval Requested",
};

/** One-line plain-language explanation of what each notification type means. */
const TYPE_DESCRIPTION = {
	shift_missed:                "A caregiver didn't show up for a scheduled shift. Names the caregiver.",
	shift_late_start:            "A caregiver started their shift later than scheduled. Names the caregiver.",
	shift_missed_reporting:      "SOH/TSA/TEA homes only. The caregiver's shift start time passed without them checking in during the required 15-minute early check-in window. The shift stays scheduled and can still be started late. Names the caregiver.",
	shift_late_reporting:        "SOH/TSA/TEA homes only. The caregiver checked in, but more than a minute after the 15-minute early check-in window closed — so their check-in wasn't early enough. This is separate from starting the shift late. Names the caregiver.",
	shift_auto_ended:            "The caregiver didn't clock out, so the system closed the shift by itself. Names the caregiver.",
	house_hours_review_overdue:  "A home's hours are still unreviewed more than 7 days after the pay period ended. Sent to all admins in that home (supervisors, team leads). Clears once it's marked reviewed.",
	house_hours_review_not_done: "Same event, sent to payroll and super admins — processing is blocked until the review is done.",
	bank_cap_exceeded:           "A completed shift pushed a caregiver's banked-hours balance past the cap.",
	broadcast:                   "A one-off announcement sent by an admin.",
	approval_requested:          "Something needs your approval — a certificate, overtime, or a banked-hours payout. Clears once any approver decides.",
};

/**
 * Groups every type into one of three plain-language buckets so people can
 * tell at a glance whether a notification needs a decision, needs follow-up,
 * or is just informational. Matches the "kind" column of the notification
 * spec (action vs. info) — only house_hours_review_overdue and
 * approval_requested are "action"; everything else portal-facing is "info".
 */
const TYPE_BUCKET = {
	approval_requested:          "approval",
	house_hours_review_overdue:  "action",
	shift_missed:                "info",
	shift_late_start:            "info",
	shift_missed_reporting:      "info",
	shift_late_reporting:        "info",
	shift_auto_ended:            "info",
	house_hours_review_not_done: "info",
	bank_cap_exceeded:           "info",
	broadcast:                   "info",
};

const BUCKET_META = {
	approval: { label: "Needs Approval", color: "#7c3aed" },
	action:   { label: "Needs Action",   color: "#d97706" },
	info:     { label: "FYI",            color: "#6b7280" },
};

const BUCKET_ORDER = ["approval", "action", "info"];

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

/**
 * Approval notification type that routes to /approvals/[id]. approval_decided
 * is hidden for now — showing it alongside everything else was too much noise.
 */
const APPROVAL_TYPES = new Set(["approval_requested"]);

/**
 * House-hours review types — both route to that house's cover sheet page,
 * where payroll is actually approved.
 */
const HOUSE_REVIEW_TYPES = new Set(["house_hours_review_overdue", "house_hours_review_not_done"]);

/**
 * Types hidden from the list entirely (not just unstyled) — showing them
 * with no icon/colour and a dead "tap to view details" CTA would be more
 * confusing than not showing them at all.
 */
const HIDDEN_TYPES = new Set(["approval_decided"]);

// ─── NotificationCard ─────────────────────────────────────────────────────────

function NotificationCard({ notification: n, onClick }) {
	const { Icon, color, bg, BadgeIcon, badgeColor } = TYPE_CONFIG[n.type] ?? {
		Icon: Bell, color: "#6b7280", bg: "#f9fafb",
	};
	const isShiftLink       = SHIFT_TYPES.has(n.type);
	const isApprovalLink    = APPROVAL_TYPES.has(n.type);
	const isHouseReviewLink = HOUSE_REVIEW_TYPES.has(n.type);

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
				{BadgeIcon && (
					<span className={styles.iconBadge} style={{ background: badgeColor }}>
						<BadgeIcon size={9} color="#fff" strokeWidth={3} />
					</span>
				)}
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
				</div>
				{n.body && <p className={styles.bodyText}>{n.body}</p>}
			</div>

			{/* Time + deep-link hint */}
			<div className={styles.meta}>
				<span className={styles.time}>{timeAgo(n.createdAt)}</span>
				{(isShiftLink || isApprovalLink || isHouseReviewLink) && (
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

// ─── TypeLegend ───────────────────────────────────────────────────────────────

/** Collapsible key explaining every notification type, grouped by what action (if any) it calls for. */
function TypeLegend() {
	const [open, setOpen] = useState(false);

	return (
		<div className={styles.legend}>
			<button
				type="button"
				className={styles.legendToggle}
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
			>
				<Info size={14} />
				What do these notifications mean?
				<ChevronDown size={14} className={open ? styles.legendChevronOpen : ""} />
			</button>

			{open && (
				<div className={styles.legendPanel}>
					{BUCKET_ORDER.map((bucketKey) => {
						const types = Object.keys(TYPE_BUCKET).filter(t => TYPE_BUCKET[t] === bucketKey);
						const { label, color } = BUCKET_META[bucketKey];
						return (
							<div key={bucketKey} className={styles.legendGroup}>
								<p className={styles.legendGroupLabel} style={{ color }}>{label}</p>
								{types.map((type) => {
									const { Icon, color: iconColor, bg } = TYPE_CONFIG[type];
									return (
										<div key={type} className={styles.legendRow}>
											<span className={styles.legendIconBox} style={{ background: bg }}>
												<Icon size={14} color={iconColor} strokeWidth={2} />
											</span>
											<div>
												<p className={styles.legendRowLabel}>{TYPE_LABEL[type]}</p>
												<p className={styles.legendRowDesc}>{TYPE_DESCRIPTION[type]}</p>
											</div>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			)}
		</div>
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


	const handleNotificationClick = async (n) => {
		// Always mark as read first
		if (!n.isRead) await markRead(n._id).catch(() => {});

		// Shift-related notifications → go to the shift detail page.
		if (SHIFT_TYPES.has(n.type) && n.data?.shiftId) {
			router.push(`/scheduling/${n.data.shiftId}`);
			return;
		}

		// Approval notifications → approval detail page.
		if (APPROVAL_TYPES.has(n.type) && n.data?.approvalId) {
			router.push(`/approvals/${n.data.approvalId}`);
			return;
		}

		// House-hours review notifications (overdue + not_done) → that house's
		// cover sheet page, where the payroll is actually approved.
		if (HOUSE_REVIEW_TYPES.has(n.type) && n.data?.houseId && n.data?.payYear && n.data?.periodNumber) {
			router.push(`/payroll/${n.data.houseId}?payYear=${n.data.payYear}&periodNumber=${n.data.periodNumber}`);
			return;
		}
		// broadcast, training_*, and other non-admin-tappable types: no navigation, just mark read.
	};

	const handleFilterChange = (next) => {
		setFilter(next);
		setPage(1); // reset pagination when switching filters
	};

	const visibleNotifications = notifications.filter((n) => !HIDDEN_TYPES.has(n.type));
	const grouped = groupByDate(visibleNotifications);

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

			{/* ── Notification type legend ─────────────────────────────── */}
			<TypeLegend />

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
			{!isNotificationsLoading && !fetchNotificationError && visibleNotifications.length === 0 && (
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
			{!isNotificationsLoading && !fetchNotificationError && visibleNotifications.length > 0 && (
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
