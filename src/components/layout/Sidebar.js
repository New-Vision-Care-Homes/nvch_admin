"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { Home, Users, IdCardLanyard, Calendar, CreditCard, AlertCircle, MessageCircle, BarChart2, Settings, Building, UserLock, Key } from "lucide-react";

const tabs = [
	{ id: 1, label: "Dashboard", icon: Home, href: "/dashboard" },
	{ id: 2, label: "Clients", icon: Users, href: "/clients" },
	{ id: 3, label: "Caregivers", icon: IdCardLanyard, href: "/caregivers" },
	{ id: 4, label: "Admins", icon: UserLock, href: "/admins" },
	{ id: 4.5, label: "Permissions", icon: Key, href: "/permissions" },
	{ id: 5, label: "Homes", icon: Building, href: "/homes" },
	{ id: 6, label: "Scheduling", icon: Calendar, href: "/scheduling" },
	{ id: 7, label: "Settings", icon: Settings, href: "/setting" },
	/*
	{ id: 7, label: "Billing & Payroll", icon: CreditCard, href: "/billing" },
	{ id: 8, label: "Incidents & Compliance", icon: AlertCircle, href: "/incidents" },
	{ id: 9, label: "Messaging", icon: MessageCircle, href: "/messaging" },
	{ id: 10, label: "Reports & Analytics", icon: BarChart2, href: "/reports" },
	 
	{ id: 11, label: "Settings", icon: Settings, href: "/setting" }*/
];

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

export default function Sidebar() {
	const pathname = usePathname();

	// Determine initial active tab
	const [activeTab, setActiveTab] = useState(() => {
		// First, try to find exact match with tab href
		const tabMatch = tabs.find(tab => tab.href === pathname);
		if (tabMatch) return tabMatch.id;

		// Then, check keyword mapping
		for (const key in keywordToTabMap) {
			if (pathname.includes(key)) return keywordToTabMap[key];
		}

		// Default to Dashboard
		return 1;
	});

	// Update active tab when pathname changes
	useEffect(() => {
		const tabMatch = tabs.find(tab => tab.href === pathname);
		if (tabMatch) {
			setActiveTab(tabMatch.id);
			return;
		}

		for (const key in keywordToTabMap) {
			if (pathname.includes(key)) {
				setActiveTab(keywordToTabMap[key]);
				return;
			}
		}

		setActiveTab(1); // fallback
	}, [pathname]);

	return (
		<div className={styles.sidebar}>
			{tabs.map(tab => {
				const Icon = tab.icon;
				const isActive = tab.id === activeTab;

				return (
					<Link
						key={tab.id}
						href={tab.href}
						className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
						onClick={() => setActiveTab(tab.id)}
					>
						<div className={styles.iconWrapper}>
							<Icon size={24} />
						</div>
						<div>{tab.label}</div>
					</Link>
				);
			})}
		</div>
	);
}





