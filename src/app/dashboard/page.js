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
	CircleCheckBig,
	FileWarning,
	Activity,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";

const stats = [
	{
		id: "active-clients",
		label: "Active Clients",
		icon: Users,
		iconColor: "#16a34a",
		bgColor: "#f0fdf4",
		value: null, // filled dynamically
		dynamic: true,
	},
	{
		id: "caregivers-on-shift",
		label: "Caregivers on Shift",
		icon: Calendar,
		iconColor: "#1C4A6E",
		bgColor: "#eff6ff",
		value: 48,
	},
	{
		id: "pending-approvals",
		label: "Pending Approvals",
		icon: Clock,
		iconColor: "#b45309",
		bgColor: "#fffbeb",
		value: 12,
	},
	{
		id: "urgent-alerts",
		label: "Urgent Alerts",
		icon: TriangleAlert,
		iconColor: "#dc2626",
		bgColor: "#fef2f2",
		value: 3,
	},
];

const quickActions = [
	{
		id: "assign-caregiver",
		href: "/",
		icon: UserPlus,
		iconColor: "#1C4A6E",
		label: "Assign Caregiver",
		description: "Link a caregiver to an open shift",
	},
	{
		id: "approve-shifts",
		href: "/",
		icon: CircleCheckBig,
		iconColor: "#16a34a",
		label: "Approve Shifts",
		description: "Review and confirm pending shift requests",
	},
	{
		id: "view-incidents",
		href: "/",
		icon: FileWarning,
		iconColor: "#dc2626",
		label: "View Incidents",
		description: "Check submitted incident reports",
	},
];

export default function Dashboard() {
	const { clients } = useClients({ params: { isActive: true } });

	return (
		<PageLayout>
			{/* Page Header */}
			<div className={styles.header}>
				<div>
					<h1>Dashboard</h1>
					<h6>Welcome back! Here's what's happening today.</h6>
				</div>
			</div>

			{/* Stats Overview */}
			<section className={styles.section}>
				<h2>Overview</h2>
				<div className={styles.statsGrid}>
					{stats.map((stat) => {
						const Icon = stat.icon;
						const displayValue = stat.dynamic ? clients?.length ?? "—" : stat.value;
						return (
							<div key={stat.id} className={styles.statCard}>
								<div className={styles.statTop}>
									<span className={styles.statLabel}>{stat.label}</span>
									<span className={styles.statIconWrap} style={{ background: stat.bgColor }}>
										<Icon size={18} color={stat.iconColor} />
									</span>
								</div>
								<span className={styles.statValue}>{displayValue}</span>
							</div>
						);
					})}
				</div>
			</section>

			{/* Quick Actions */}
			<section className={styles.section}>
				<h2>Quick Actions</h2>
				<div className={styles.actionsGrid}>
					{quickActions.map((action) => {
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
		</PageLayout>
	);
}
