"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { format } from "date-fns";
import Button from "@components/UI/Button";
import PageLayout from "@components/layout/PageLayout";
import { User, MapPin, ClipboardList, Clock, ChevronRight, Undo2 } from "lucide-react";
import styles from "./shift_list.module.css";
import Link from "next/link";

export default function ShiftListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: shifts = [] } = useShifts();

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    const filteredShifts = shifts.filter((shift) => {
        const sStart = new Date(shift.startTime).toISOString();
        const sEnd = new Date(shift.endTime).toISOString();
        return sStart === startParam && sEnd === endParam;
    });

	console.log("shifts: ", filteredShifts);

    const displayTitle = startParam && endParam 
        ? `Shifts on ${format(new Date(startParam), "MMMM do, yyyy")}`
        : "Shift Details";

    const displayTimeRange = startParam && endParam
        ? `${format(new Date(startParam), "HH:mm")} - ${format(new Date(endParam), "HH:mm")}`
        : "";

    return (
        <PageLayout>
			<header className={styles.header}>
				<div className={styles.title}>
					<h2>{displayTitle}</h2>
					<div className={styles.subtitle}>
						<Clock size={16} /> {displayTimeRange}
					</div>
				</div>
				<Link href="/scheduling">
					<Button icon={<Undo2 />} variant="secondary">Back</Button>
				</Link>
			</header>

			<div className={styles.shiftList}>
				{filteredShifts.length > 0 ? (
					filteredShifts.map((shift) => (
						<div key={shift._id || shift.id} className={styles.shiftCard}>
							<div className={styles.mainInfo}>
								{/* Caregiver Name */}
								<div className={styles.infoRow}>
									<User size={18} className={styles.icon} />
									<span className={styles.primaryText}>
										{shift.caregiver?.firstName} {shift.caregiver?.lastName}
									</span>
								</div>
								
								{/* Client & Address */}
								<div className={styles.infoRow}>
									<MapPin size={18} className={styles.icon} />
									<span className={styles.secondaryText}>
										{shift.clientAddress}
									</span>
								</div>

								{/* Service Type */}
								<div className={styles.infoRow}>
									<ClipboardList size={18} className={styles.icon} />
									<span className={styles.secondaryText}>
										{shift.client.firstName} {shift.client.lastName} 
									</span>
								</div>
							</div>

							<button 
								className={styles.viewBtn}
								onClick={() => router.push(`/scheduling/${shift._id}`)}
							>
								<span>View Detail</span>
								<ChevronRight size={18} />
							</button>
						</div>
					))
				) : (
					<div className={styles.emptyState}>No shifts found for this time slot.</div>
				)}
			</div>
        </PageLayout>
    );
}

/*
"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { format } from "date-fns";
import { ChevronLeft, Clock, MapPin, User } from "lucide-react";
import Button from "@components/UI/Button";
import styles from "./shift_list.module.css";

export default function ShiftListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { data: shifts = [], isLoading, isError, error } = useShifts({
        startDate,
        endDate,
    });

    const handleBack = () => router.back();

    if (isLoading) return <div className={styles.loading}>Loading shifts...</div>;

    if (isError) return <div className={styles.error}>Error: {error.message}</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={handleBack} className={styles.backBtn}>
                    <ChevronLeft size={20} /> Back to Calendar
                </button>
                <h1>Shift Details</h1>
                <div className={styles.timeRange}>
                    <Clock size={16} />
                    <span>
                        {startDate && format(new Date(startDate), "PPP")} |{" "}
                        {startDate && format(new Date(startDate), "p")} - {endDate && format(new Date(endDate), "p")}
                    </span>
                </div>
            </header>

            <main className={styles.list}>
                {shifts.length === 0 ? (
                    <div className={styles.empty}>No shifts found for this time slot.</div>
                ) : (
                    shifts.map((shift) => (
                        <div 
                            key={shift._id || shift.id} 
                            className={styles.card}
                            onClick={() => router.push(`/scheduling/shift/${shift._id || shift.id}`)}
                        >
                            <div className={styles.cardInfo}>
                                <div className={styles.row}>
                                    <User size={18} className={styles.icon} />
                                    <strong>{shift.caregiver?.firstName} {shift.caregiver?.lastName}</strong>
                                </div>
                                <div className={styles.row}>
                                    <MapPin size={18} className={styles.icon} />
                                    <span>{shift.clientAddress || "No address provided"}</span>
                                </div>
                            </div>
                            <div className={`${styles.status} ${styles[shift.status]}`}>
                                {shift.status}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
*/