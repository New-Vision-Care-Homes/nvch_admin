"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, Shield, SlidersHorizontal } from "lucide-react";
import styles from "./SettingsSidebar.module.css";

const settingsOptions = [
	{ id: 1, label: "Profile", icon: User, href: "/setting/profile" },
	//{ id: 2, label: "Notifications", icon: Bell, href: "/setting/notifications" },
	//{ id: 3, label: "Security", icon: Shield, href: "/setting/security" },
	//{ id: 4, label: "Preferences", icon: SlidersHorizontal, href: "/setting/preferences" },
];

export default function SettingsSidebar() {
	const pathname = usePathname();

	return (
		<div className={styles.sidebar}>
			<div className={styles.sectionLabel}>Settings</div>
			{settingsOptions.map((option) => {
				const Icon = option.icon;
				const isActive = pathname === option.href || pathname.startsWith(option.href + "/");

				return (
					<Link
						key={option.id}
						href={option.href}
						className={`${styles.item} ${isActive ? styles.activeItem : ""}`}
					>
						<Icon size={18} className={styles.icon} />
						<span>{option.label}</span>
					</Link>
				);
			})}
		</div>
	);
}
