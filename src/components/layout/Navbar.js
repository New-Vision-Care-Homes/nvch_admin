"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, LogOut, Menu, AlertTriangle, Clock, CircleOff, Megaphone, X, ClipboardCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Navbar.module.css";
import logoImg from "@/assets/logo/nv.png";
import avatarImg from "@/assets/img/navbar/avatar.jpg";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
	shift_missed:           { Icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
	shift_late_start:       { Icon: Clock,         color: "#d97706", bg: "#fffbeb" },
	shift_missed_reporting: { Icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
	shift_late_reporting:   { Icon: Clock,         color: "#d97706", bg: "#fffbeb" },
	shift_auto_ended:       { Icon: CircleOff,     color: "#6b7280", bg: "#f3f4f6" },
	broadcast:              { Icon: Megaphone,     color: "#dc2626", bg: "#fef2f2" },
	approval_requested:     { Icon: ClipboardCheck, color: "#7c3aed", bg: "#f5f3ff" },
};

function timeAgo(dateStr) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const m = Math.floor(diff / 60_000);
	const h = Math.floor(diff / 3_600_000);
	const d = Math.floor(diff / 86_400_000);
	if (m < 1)  return "Just now";
	if (m < 60) return `${m}m ago`;
	if (h < 24) return `${h}h ago`;
	if (d === 1) return "Yesterday";
	return `${d}d ago`;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar({ onMenuToggle = () => {} }) {
	const router   = useRouter();
	const pathname = usePathname();
	const { profile } = useProfile();

	// ── Toast state ───────────────────────────────────────────────────────────
	const [toasts,  setToasts]      = useState([]);
	const timerRefs                 = useRef([]);    // setTimeout IDs for auto-dismiss
	// Tracks notification IDs already shown this session so a duplicate SSE event
	// (e.g. reconnect resend) never produces a second toast for the same item.
	const shownNotificationIds      = useRef(new Set());

	// ── Dropdown state ────────────────────────────────────────────────────────
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownLeaveTimer             = useRef(null);

	// Called by SSE when a new notification arrives
	function handleNewNotification(payload) {

		// Deduplicate: if the server resends the same event (e.g. after reconnect),
		// suppress the duplicate toast. Fall back to title-based key when no ID.
		const notifKey = payload._id || payload.id || payload.title;
		if (shownNotificationIds.current.has(notifKey)) return;
		shownNotificationIds.current.add(notifKey);

		const id = Date.now();
		// Keep at most 3 toasts visible at once
		setToasts(prev => [...prev.slice(-2), { id, title: payload.title, body: payload.body }]);
		timerRefs.current.push(
			setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 10_000)
		);
	}

	function dismissToast(id) {
		setToasts(prev => prev.filter(t => t.id !== id));
	}

	// Clear all pending timers on unmount (e.g. logout)
	useEffect(() => {
		return () => {
			timerRefs.current.forEach(clearTimeout);
			clearTimeout(dropdownLeaveTimer.current);
			clearTimeout(badgeTimerRef.current);
		};
	}, []);

	// SSE lives here — Navbar mounts for every authenticated page and unmounts on logout.
	// fetchList: false keeps this call cheap (badge + stream only).
	const { unreadCount, sseUnavailable } = useNotifications({
		enableSSE: true,
		fetchList: false,
		onNotification: handleNewNotification,
	});

	// Debounce the displayed badge count so rapid intermediate values (e.g. a count
	// endpoint returning a stale snapshot right after an SSE event, then correcting
	// itself 50–150 ms later) never produce a visible flash.
	const [badgeCount, setBadgeCount] = useState(0);
	const badgeTimerRef               = useRef(null);
	useEffect(() => {
		clearTimeout(badgeTimerRef.current);
		badgeTimerRef.current = setTimeout(() => setBadgeCount(unreadCount), 120);
	}, [unreadCount]);

	// Latest 3 notifications for the dropdown (fetched eagerly, cached by React Query)
	const { notifications: recentNotifications, isNotificationsLoading } = useNotifications({
		fetchList: true,
		params: { limit: 3 },
	});

	const handleLogout = () => {
		sessionStorage.removeItem("token");
		router.push("/");
	};

	function openDropdown() {
		clearTimeout(dropdownLeaveTimer.current);
		setDropdownOpen(true);
	}

	function scheduleCloseDropdown() {
		dropdownLeaveTimer.current = setTimeout(() => setDropdownOpen(false), 200);
	}

	return (
		<>
			<nav className={styles.navbar}>
				<div className={styles.container}>

					{/* Hamburger — only visible on mobile (≤ 900px via CSS) */}
					<button
						type="button"
						className={styles.menuButton}
						onClick={onMenuToggle}
						aria-label="Toggle navigation menu"
					>
						<Menu size={24} />
					</button>

					{/* Logo */}
					<Image src={logoImg} alt="App Icon" width={80} height={39} />

					<div className={styles.element}>

						{/* ── Bell with hover dropdown ────────────────────────────── */}
						<div
							className={styles.bellWrapper}
							onMouseEnter={openDropdown}
							onMouseLeave={scheduleCloseDropdown}
						>
							<button
								type="button"
								className={styles.bellButton}
								onClick={() => router.push("/notification")}
								aria-label={
									sseUnavailable
										? "Notifications (live updates unavailable)"
										: badgeCount > 0
										? `Notifications, ${badgeCount} unread`
										: "Notifications"
								}
							>
								<Bell size={20} strokeWidth={1.75} />
								{badgeCount > 0 && !sseUnavailable && (
									<span className={styles.badge} key={badgeCount}>
										{badgeCount > 99 ? "99+" : badgeCount}
									</span>
								)}
								{sseUnavailable && (
									<span className={styles.sseErrorDot} title="Live updates unavailable" />
								)}
							</button>

							{/* Hover dropdown */}
							{dropdownOpen && (
								<div
									className={styles.bellDropdown}
									onMouseEnter={openDropdown}
									onMouseLeave={scheduleCloseDropdown}
								>
									<div className={styles.dropdownHeader}>
										<span className={styles.dropdownTitle}>Notifications</span>
										<Link
											href="/notification"
											className={styles.dropdownViewAll}
											onClick={() => setDropdownOpen(false)}
										>
											View all notifications
										</Link>
									</div>

									<div className={styles.dropdownList}>
										{isNotificationsLoading ? (
											<p className={styles.dropdownEmpty}>Loading…</p>
										) : recentNotifications.length === 0 ? (
											<p className={styles.dropdownEmpty}>No notifications yet</p>
										) : (
											recentNotifications.map(n => {
												const { Icon, color, bg } = TYPE_CONFIG[n.type] ?? { Icon: Bell, color: "#6b7280", bg: "#f3f4f6" };
												return (
													<div
														key={n._id}
														className={`${styles.dropdownItem} ${!n.isRead ? styles.dropdownItemUnread : ""}`}
													>
														<span className={styles.dropdownItemIcon} style={{ background: bg, color }}>
															<Icon size={14} />
														</span>
														<div className={styles.dropdownItemBody}>
															<p className={styles.dropdownItemTitle}>{n.title}</p>
															{n.body && (
																<p className={styles.dropdownItemText}>{n.body}</p>
															)}
														</div>
														<span className={styles.dropdownItemTime}>
															{timeAgo(n.createdAt)}
														</span>
													</div>
												);
											})
										)}
									</div>
								</div>
							)}
						</div>

						{/* Logout */}
						<button onClick={handleLogout} className={styles.logout}>
							<LogOut size={16} />
							<span>Logout</span>
						</button>

						{/* Profile Image */}
						<img
							src={profile?.profilePictureUrl || avatarImg.src}
							alt="profile img"
							width={36}
							height={36}
							className={styles.avatar}
						/>
					</div>
				</div>
			</nav>

			{/* ── Pop-out toasts — fixed bottom-right, shown on any page ────── */}
			{toasts.length > 0 && (
				<div className={styles.toastContainer}>
					{toasts.map(toast => (
						<div key={toast.id} className={styles.toast}>
							<div className={styles.toastIconBox}>
								<Bell size={16} color="#1c4a6e" />
							</div>
							<div className={styles.toastBody}>
								<p className={styles.toastTitle}>{toast.title}</p>
								{toast.body && <p className={styles.toastText}>{toast.body}</p>}
								<Link
									href="/notification"
									className={styles.toastLink}
									onClick={() => dismissToast(toast.id)}
								>
									View notifications →
								</Link>
							</div>
							<button
								type="button"
								className={styles.toastClose}
								onClick={() => dismissToast(toast.id)}
								aria-label="Dismiss"
							>
								<X size={14} />
							</button>
						</div>
					))}
				</div>
			)}
		</>
	);
}
