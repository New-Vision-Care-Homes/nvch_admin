"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { Home, Users, IdCardLanyard, Calendar, CreditCard, AlertCircle, MessageCircle, BarChart2, Settings, Building, UserLock, Key, CalendarDays, LayoutGrid, ChevronRight } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const tabs = [
	{ id: 1, label: "Dashboard", icon: Home, href: "/dashboard" },
	{ id: 2, label: "Clients", icon: Users, href: "/clients", requiredSlugs: ["view_all_clients", "view_assigned_clients"] },
	{ id: 3, label: "Caregivers", icon: IdCardLanyard, href: "/caregivers", requiredSlugs: ["view_all_caregivers", "view_assigned_caregivers"] },
	{ id: 4, label: "Admins", icon: UserLock, href: "/admins", requiredSlugs: ["view_admin"] },
	{ id: 4.5, label: "Permissions", icon: Key, href: "/permissions", requiredSlugs: ["view_permissions_groups"] },
	{ id: 5, label: "Homes", icon: Building, href: "/homes", requiredSlugs: ["view_all_homes"] },
	{ id: 6, label: "Scheduling", icon: Calendar, href: "/scheduling", hasFlyout: true, requiredSlugs: ["view_shifts"] },
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
};

// Map keywords to specific tab ids
// If pathname includes the keyword, the corresponding tab will be active
const keywordToTabMap = {
	"/client": 2,       // any path containing "/client" -> Clients tab
	"/caregiver": 3,    // any path containing "/caregiver" -> Caregivers tab
	"/admin": 4,        // any path containing "/admin" -> Admins tab
	"/permission": 4.5, // any path containing "/permission" -> Permissions tab
	"/homes": 5,        // any path containing "/homes" -> Homes tab
	"/scheduling": 6,   // any path containing "/scheduling" -> Scheduling tab
	"/billing": 7,      // any path containing "/billing" -> Billing tab (updated ID)
	"/setting": 7,      // any path containing "/setting" -> Settings tab (updated ID)
};

export default function Sidebar({ open = false, onClose = () => {} }) {
	const pathname = usePathname();
	const { profile } = useProfile();

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
		if (!open) return;
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
									onClick={() => handleTabClick(tab.id)}
								>
									<div className={styles.iconWrapper}><Icon size={24} /></div>
									<div className={styles.tabLabel}>{tab.label}</div>
									<ChevronRight size={14} className={styles.flyoutArrow} />
								</Link>
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
									<div className={styles.flyoutItemLabel}>{item.label}</div>
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





