"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { Home, Users, IdCardLanyard, Calendar, CreditCard, AlertCircle, MessageCircle, BarChart2, Settings, Building, UserLock, Key, CalendarDays, LayoutGrid, ChevronRight, ClipboardCheck, Bell, MessageSquare } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useApprovals } from "@/hooks/useApprovals";
import { useNotifications } from "@/hooks/useNotifications";

const tabs = [
	{ id: 1, label: "Dashboard", icon: Home, href: "/dashboard" },
	{ id: 2, label: "Clients", icon: Users, href: "/clients", requiredSlugs: ["view_all_clients", "view_assigned_clients"] },
	{ id: 3, label: "Caregivers", icon: IdCardLanyard, href: "/caregivers", requiredSlugs: ["view_all_caregivers", "view_assigned_caregivers"] },
	{ id: 4, label: "Admins", icon: UserLock, href: "/admins", requiredSlugs: ["view_admin"] },
	{ id: 4.5, label: "Permissions", icon: Key, href: "/permissions", requiredSlugs: ["view_permissions_groups"] },
	{ id: 5, label: "Homes", icon: Building, href: "/homes", requiredSlugs: ["view_all_homes", "view_home"] },
	{ id: 6, label: "Scheduling", icon: Calendar, href: "/scheduling", hasFlyout: true, requiredSlugs: ["view_shifts"] },
	{ id: 6.5, label: "Notifications", icon: Bell, href: "/notification", hasFlyout: true },
	{ id: 7, label: "Settings", icon: Settings, href: "/setting" },
	/*
	{ id: 7, label: "Billing & Payroll", icon: CreditCard, href: "/billing" },
	{ id: 8, label: "Incidents & Compliance", icon: AlertCircle, href: "/incidents" },
	{ id: 9, label: "Messaging", icon: MessageCircle, href: "/messaging" },
	{ id: 10, label: "Reports & Analytics", icon: BarChart2, href: "/reports" },

	{ id: 11, label: "Settings", icon: Settings, href: "/setting" }*/
];

const flyoutMenus = {
	6: [
		{ label: "Calendar", href: "/scheduling", icon: CalendarDays, desc: "View & manage shifts" },
		{ label: "Shift Builder", href: "/scheduling/shift_builder", icon: LayoutGrid, desc: "Design shift templates" },
	],
	6.5: [
		{ label: "All Messages", href: "/notification", icon: MessageSquare, desc: "View all notifications" },
		{ label: "Approvals", href: "/approvals", icon: ClipboardCheck, desc: "Pending certificate approvals" },
	],
};

// Map keywords to specific tab ids
// If pathname includes the keyword, the corresponding tab will be active
const keywordToTabMap = {
	"/client": 2,       // any path containing "/client" -> Clients tab
	"/focus_notes": 2,  // focus note detail lives under the Clients tab
	"/caregiver": 3,    // any path containing "/caregiver" -> Caregivers tab
	"/admin": 4,        // any path containing "/admin" -> Admins tab
	"/permission": 4.5, // any path containing "/permission" -> Permissions tab
	"/homes": 5,        // any path containing "/homes" -> Homes tab
	"/scheduling": 6,     // any path containing "/scheduling" -> Scheduling tab
	"/notification": 6.5, // any path containing "/notification" -> Notifications tab
	"/approvals": 6.5,    // any path containing "/approvals" -> Notifications tab
	"/billing": 7,      // any path containing "/billing" -> Billing tab (updated ID)
	"/setting": 7,      // any path containing "/setting" -> Settings tab (updated ID)
};

export default function Sidebar({ open = false, onClose = () => {} }) {
	const pathname = usePathname();
	const { profile, isLoading, fetchError, refetch } = useProfile();

	const { totalCount: pendingApprovalCount } = useApprovals({
		params: { page: 1, limit: 1 },
		fetchQueue: true,
	});

	const { unreadCount } = useNotifications({ fetchList: false });

	const flyoutBadges = {
		"/notification": unreadCount,
		"/approvals": pendingApprovalCount,
	};

	// While the profile is loading (or failed to load) only the ungated tabs
	// render; the ErrorState below makes that state visible instead of
	// silently hiding every permission-gated module.
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const visibleTabs = tabs.filter(tab =>
		!tab.requiredSlugs || tab.requiredSlugs.some(slug => permissionSlugs.includes(slug))
	);

	const [activeTab, setActiveTab] = useState(() => {
		const tabMatch = tabs.find(tab => tab.href === pathname);
		if (tabMatch) return tabMatch.id;
		for (const key in keywordToTabMap) {
			if (pathname.includes(key)) return keywordToTabMap[key];
		}
		return 1;
	});

	const [hoveredTabId, setHoveredTabId] = useState(null);
	const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
	const [mobileExpandedId, setMobileExpandedId] = useState(null);
	const leaveTimer = useRef(null);

	const openFlyout = useCallback((tabId, rect) => {
		clearTimeout(leaveTimer.current);
		setFlyoutPos({ top: rect.top, left: rect.right });
		setHoveredTabId(tabId);
	}, []);

	const closeFlyout = useCallback(() => {
		leaveTimer.current = setTimeout(() => setHoveredTabId(null), 130);
	}, []);

	const keepFlyout = useCallback(() => {
		clearTimeout(leaveTimer.current);
	}, []);

	useEffect(() => {
		const tabMatch = tabs.find(tab => tab.href === pathname);
		if (tabMatch) { setActiveTab(tabMatch.id); return; }
		for (const key in keywordToTabMap) {
			if (pathname.includes(key)) { setActiveTab(keywordToTabMap[key]); return; }
		}
		setActiveTab(1);
	}, [pathname]);

	useEffect(() => {
		if (!open) { setMobileExpandedId(null); return; }
		const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	const handleTabClick = (id) => {
		setActiveTab(id);
		onClose();
	};

	return (
		<>
			<div
				className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
				onClick={onClose}
				aria-hidden="true"
			/>

			<aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
				{visibleTabs.map(tab => {
					const Icon = tab.icon;
					const isActive = tab.id === activeTab;

					if (tab.hasFlyout) {
						const isExpanded = mobileExpandedId === tab.id;
						return (
							<div
								key={tab.id}
								className={styles.flyoutWrapper}
								onMouseEnter={(e) => openFlyout(tab.id, e.currentTarget.getBoundingClientRect())}
								onMouseLeave={closeFlyout}
							>
								<Link
									href={tab.href}
									className={`${styles.tab} ${styles.tabFlyout} ${isActive ? styles.activeTab : ""}`}
									onClick={(e) => {
										if (open) {
											e.preventDefault();
											setMobileExpandedId(isExpanded ? null : tab.id);
										} else {
											handleTabClick(tab.id);
										}
									}}
								>
									<div className={styles.iconWrapper}><Icon size={24} /></div>
									<div className={styles.tabLabel}>{tab.label}</div>
									<ChevronRight
										size={14}
										className={`${styles.flyoutArrow} ${isExpanded ? styles.flyoutArrowDown : ""}`}
									/>
								</Link>

								{/* Mobile inline dropdown */}
								{isExpanded && flyoutMenus[tab.id] && (
									<div className={styles.mobileSubMenu}>
										{flyoutMenus[tab.id].map(item => {
											const ItemIcon = item.icon;
											return (
												<Link
													key={item.href}
													href={item.href}
													className={styles.mobileSubItem}
													onClick={() => { handleTabClick(tab.id); setMobileExpandedId(null); }}
												>
													<ItemIcon size={15} className={styles.flyoutItemIcon} />
													<div>
														<div className={styles.flyoutItemLabel}>
															{item.label}
															{flyoutBadges[item.href] > 0 && (
																<span className={styles.flyoutBadge}>{flyoutBadges[item.href]}</span>
															)}
														</div>
														<div className={styles.flyoutItemDesc}>{item.desc}</div>
													</div>
												</Link>
											);
										})}
									</div>
								)}
							</div>
						);
					}

					return (
						<Link
							key={tab.id}
							href={tab.href}
							className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
							onClick={() => handleTabClick(tab.id)}
						>
							<div className={styles.iconWrapper}><Icon size={24} /></div>
							<div>{tab.label}</div>
						</Link>
					);
				})}

				{/* Compact inline states: while the profile loads, gated tabs are
				    simply not yet shown; if the fetch failed with no cached profile,
				    say so instead of silently hiding every module. */}
				{isLoading && (
					<div style={{ padding: "0.75rem 1rem", color: "#6B7280", fontSize: "0.85rem" }}>
						Loading menu…
					</div>
				)}
				{!isLoading && fetchError && !profile && (
					<div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#DC2626" }}>
							<AlertCircle size={14} />
							<span>Couldn&apos;t load your permissions</span>
						</div>
						<button
							onClick={() => refetch()}
							style={{
								marginTop: "6px",
								fontSize: "0.8rem",
								color: "#1D4ED8",
								background: "none",
								border: "none",
								cursor: "pointer",
								textDecoration: "underline",
								padding: 0,
							}}
						>
							Try again
						</button>
					</div>
				)}
			</aside>

			{hoveredTabId !== null && flyoutMenus[hoveredTabId] && (
				<div
					className={styles.flyout}
					style={{ top: flyoutPos.top, left: flyoutPos.left }}
					onMouseEnter={keepFlyout}
					onMouseLeave={closeFlyout}
				>
					<div className={styles.flyoutTitle}>
						{tabs.find(t => t.id === hoveredTabId)?.label}
					</div>
					{flyoutMenus[hoveredTabId].map(item => {
						const ItemIcon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={styles.flyoutItem}
								onClick={() => { handleTabClick(hoveredTabId); setHoveredTabId(null); }}
							>
								<ItemIcon size={16} className={styles.flyoutItemIcon} />
								<div>
									<div className={styles.flyoutItemLabel}>
										{item.label}
										{flyoutBadges[item.href] > 0 && (
											<span className={styles.flyoutBadge}>{flyoutBadges[item.href]}</span>
										)}
									</div>
									<div className={styles.flyoutItemDesc}>{item.desc}</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</>
	);
}





