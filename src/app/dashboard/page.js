"use client";

import PageLayout from "@components/layout/PageLayout";
import styles from "./dashboard.module.css";
import Link from "next/link";
import {
	Users,
	Calendar,
	Clock,
	TriangleAlert,
	UserPlus,
	IdCardLanyard,
	HousePlus,
	CalendarPlus,
	CircleCheckBig,
	FileWarning,
	Activity,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useShifts } from "@/hooks/useShifts";
import { useProfile } from "@/hooks/useProfile";

const stats = [
	{
		id: "active-clients",
		label: "Active Clients",
		icon: Users,
		iconColor: "#16a34a",
		bgColor: "#f0fdf4",
	},
	{
		id: "in-progress-shifts",
		label: "Shifts In Progress",
		icon: Activity,
		iconColor: "#d97706",
		bgColor: "#fffbeb",
	},
	{
		id: "pending-approvals",
		label: "Pending Approvals",
		icon: Clock,
		iconColor: "#b45309",
		bgColor: "#fef3c7",
		value: "N/A",
	},
	{
		id: "urgent-alerts",
		label: "Urgent Alerts",
		icon: TriangleAlert,
		iconColor: "#dc2626",
		bgColor: "#fef2f2",
		value: "N/A",
	},
];

const quickActions = [
	{
		id: "add-new-client",
		href: "/clients/add_new_client",
		icon: UserPlus,
		iconColor: "#1C4A6E",
		label: "Add New Client",
		description: "Add a new client",
		requiredSlug: "create_clients",
	},
	{
		id: "add-new-caregiver",
		href: "/caregivers/add_new_caregiver",
		icon: IdCardLanyard,
		iconColor: "#16a34a",
		label: "Add New Caregiver",
		description: "Add a new caregiver",
		requiredSlug: "create_caregivers",
	},
	{
		id: "add-new-home",
		href: "/homes/add_new_home",
		icon: HousePlus,
		iconColor: "#f58b00ff",
		label: "Add New Home",
		description: "Add a new home",
		requiredSlug: "create_home",
	},
	{
		id: "add-new-shift",
		href: "/scheduling/add_new_shift",
		icon: CalendarPlus,
		iconColor: "#5bd3d3ff",
		label: "Add New Shift",
		description: "Add a new shift",
		requiredSlug: "create_shifts",
	},
];

export default function Dashboard() {
	const { clients, isLoading: isClientsLoading } = useClients({ params: { isActive: true } });
	const { shifts: inProgressShifts, isShiftLoading } = useShifts({ status: "in_progress" });
	const { profile } = useProfile();
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const visibleQuickActions = quickActions.filter(a => permissionSlugs.includes(a.requiredSlug));

	const getStatValue = (stat) => {
		if (stat.id === "active-clients") return clients?.length ?? "—";
		if (stat.id === "in-progress-shifts") return inProgressShifts?.length ?? "—";
		return stat.value ?? "N/A";
	};

	const isStatLoading = (stat) => {
		if (stat.id === "active-clients") return isClientsLoading;
		if (stat.id === "in-progress-shifts") return isShiftLoading;
		return false;
	};

	return (
		<PageLayout>
			{/* Page Header */}
			<div className={styles.header}>
				<div>
					<h1>Dashboard</h1>
					<h6>{`Welcome back! Here's what's happening today.`}</h6>
				</div>
			</div>

			{/* Stats Overview */}
			<section className={styles.section}>
				<h2>Overview</h2>
				<div className={styles.statsGrid}>
					{stats.map((stat) => {
						const Icon = stat.icon;
						return (
							<div key={stat.id} className={styles.statCard}>
								<div className={styles.statTop}>
									<span className={styles.statLabel}>{stat.label}</span>
									<span className={styles.statIconWrap} style={{ background: stat.bgColor }}>
										<Icon size={18} color={stat.iconColor} />
									</span>
								</div>
								<span className={styles.statValue}>
									{isStatLoading(stat) ? (
										<span className={styles.loadingDots}>
											<span className={styles.dot}></span>
											<span className={styles.dot}></span>
											<span className={styles.dot}></span>
										</span>
									) : (
										getStatValue(stat)
									)}
								</span>
							</div>
						);
					})}
				</div>
			</section>

			{/* Quick Actions */}
			<section className={styles.section}>
				<h2>Quick Actions</h2>
				<div className={styles.actionsGrid}>
					{visibleQuickActions.map((action) => {
						const Icon = action.icon;
						return (
							<Link key={action.id} href={action.href} className={styles.actionCard}>
								<span className={styles.actionIconWrap}>
									<Icon size={22} color={action.iconColor} />
								</span>
								<div className={styles.actionText}>
									<span className={styles.actionLabel}>{action.label}</span>
									<span className={styles.actionDesc}>{action.description}</span>
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			{/* Recent Activity */}
			{/*
			<section className={styles.section}>
				<div className={styles.activityHeader}>
					<h2 style={{ margin: 0 }}>Recent Activity</h2>
					<Link href="/notification" className={styles.viewAllLink}>View All</Link>
				</div>
				<div className={styles.activityCard}>
					<div className={styles.emptyState}>
						<Activity size={36} color="#CBD5E1" />
						<p className={styles.emptyTitle}>No Recent Activities</p>
						<p className={styles.emptyDesc}>This section is currently under development.</p>
					</div>
				</div>
			</section>
			*/}
		</PageLayout>
	);
}
