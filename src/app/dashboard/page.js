"use client";

import PageLayout from "@components/layout/PageLayout";
import styles from "./dashboard.module.css";
import Link from "next/link";
import {
	Users,
	Activity,
	UserPlus,
	IdCardLanyard,
	HousePlus,
	CalendarPlus,
	ShieldCheck,
	ArrowRight,
	ClipboardCheck,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useAdmins } from "@/hooks/useAdmins";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useShifts } from "@/hooks/useShifts";
import { useProfile } from "@/hooks/useProfile";
import { useApprovals } from "@/hooks/useApprovals";

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
		id: "active-admins",
		label: "Active Admins",
		icon: ShieldCheck,
		iconColor: "#1C4A6E",
		bgColor: "#eff6ff",
	},
	{
		id: "active-caregivers",
		label: "Active Caregivers",
		icon: IdCardLanyard,
		iconColor: "#7c3aed",
		bgColor: "#f5f3ff",
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
	const { totalCount: activeClientCount, isLoading: isClientsLoading } = useClients({ params: { isActive: true } });
	const { totalCount: activeAdminCount, isLoading: isAdminsLoading } = useAdmins({ params: { isActive: true } });
	const { totalCount: activeCaregiverCount, isCaregiverLoading: isCaregiversLoading } = useCaregivers({ params: { isActive: true } });
	const { shifts: inProgressShifts, isShiftLoading } = useShifts({ status: "in_progress" });
	const { totalCount: pendingApprovalCount, isLoading: isApprovalsLoading } = useApprovals({ params: { page: 1, limit: 1 }, fetchQueue: true });
	const { profile } = useProfile();
	const permissionSlugs = profile?.permissionSlugs ?? [];
	const visibleQuickActions = quickActions.filter(a => permissionSlugs.includes(a.requiredSlug));

	const getStatValue = (stat) => {
		if (stat.id === "active-clients") return activeClientCount || "—";
		if (stat.id === "in-progress-shifts") return inProgressShifts?.length ?? "—";
		if (stat.id === "active-admins") return activeAdminCount || "—";
		if (stat.id === "active-caregivers") return activeCaregiverCount || "—";
		return "—";
	};

	const isStatLoading = (stat) => {
		if (stat.id === "active-clients") return isClientsLoading;
		if (stat.id === "in-progress-shifts") return isShiftLoading;
		if (stat.id === "active-admins") return isAdminsLoading;
		if (stat.id === "active-caregivers") return isCaregiversLoading;
		return false;
	};

	return (
		<PageLayout>
			{/* Page Header */}
			<div className={styles.header}>
				<p className={styles.brand}>New Vision Cares Admin Portal</p>
				<h1>Dashboard</h1>
				<p className={styles.subtitle}>{`Welcome back! Here's what's happening today.`}</p>
			</div>

			{/* Stats Overview */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Overview</h2>
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

			{/* Pending Approvals */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Approvals</h2>
				<Link href="/approvals" className={styles.approvalBanner}>
					<div className={styles.approvalBannerLeft}>
						<span className={styles.approvalIconWrap}>
							<ClipboardCheck size={20} color="#7c3aed" />
						</span>
						<div className={styles.approvalBannerText}>
							<span className={styles.approvalBannerTitle}>
								{isApprovalsLoading ? (
									<span className={styles.loadingDots}>
										<span className={styles.dot} />
										<span className={styles.dot} />
										<span className={styles.dot} />
									</span>
								) : pendingApprovalCount > 0 ? (
									<>
										<strong>{pendingApprovalCount}</strong> approval{pendingApprovalCount !== 1 ? "s" : ""} waiting for review
									</>
								) : (
									"No pending approvals"
								)}
							</span>
							<span className={styles.approvalBannerDesc}>
								{pendingApprovalCount > 0
									? "Click to review and take action on pending requests."
									: "All requests have been handled."}
							</span>
						</div>
					</div>
					<ArrowRight size={16} className={styles.approvalBannerArrow} />
				</Link>
			</section>

			{/* Quick Actions */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Quick Actions</h2>
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
