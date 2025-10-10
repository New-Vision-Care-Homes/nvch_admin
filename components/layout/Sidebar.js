"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { Home, Users, UserCheck, Calendar, CreditCard, AlertCircle, MessageCircle, BarChart2, Settings } from "lucide-react";

// Define all the tabs in the sidebar
const tabs = [
  { id: 1, label: "Dashboard", icon: Home, href: "/dashboard" },
  { id: 2, label: "Clients", icon: Users, href: "/clients" },
  { id: 3, label: "Caregivers", icon: UserCheck, href: "/caregivers" },
  { id: 4, label: "Scheduling", icon: Calendar, href: "/scheduling" },
  { id: 5, label: "Billing & Payroll", icon: CreditCard, href: "/billing" },
  { id: 6, label: "Incidents & Compliance", icon: AlertCircle, href: "/incidents" },
  { id: 7, label: "Messaging", icon: MessageCircle, href: "/messaging" },
  { id: 8, label: "Reports & Analytics", icon: BarChart2, href: "/reports" },
  { id: 9, label: "Settings", icon: Settings, href: "/settings" }
];

export default function Sidebar() {
	// Get the current URL path
	const pathname = usePathname();

	// Initialize active tab
	// If the pathname matches a tab, use that tab's id
	// Otherwise, default to Dashboard (id: 1)
	const [activeTab, setActiveTab] = useState(() => {
		const current = tabs.find(tab => tab.href === pathname);
		return current ? current.id : 1; 
	});

	// Update active tab if user navigates directly by URL
	useEffect(() => {
		const current = tabs.find(tab => tab.href === pathname);
		if (current) setActiveTab(current.id);
	}, [pathname]);

	return (
		<div className={styles.sidebar}>
			{tabs.map(tab => {
				const Icon = tab.icon;
				const isActive = tab.id === activeTab; // Determine if this tab should be highlighted

				return (
				<Link
					key={tab.id}
					href={tab.href}
					className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
					onClick={() => setActiveTab(tab.id)} // Update active tab when clicked
				>
					<div className={styles.iconWrapper}>
						<Icon size={24} /> {/* Render the tab icon */}
					</div>
					<div>{tab.label}</div> {/* Render the tab label */}
				</Link>
				);
			})}
		</div>
	);
}




