"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useShifts } from "@/hooks/useShifts";
import { format } from "date-fns";
import PageLayout from "@components/layout/PageLayout";
import Button from "@components/UI/Button";
import {
	Clock, MapPin, User, ShieldCheck, Phone,
	FileText, AlertCircle, Undo2, Tag, CheckCircle2,
	Repeat, ChevronRight, Navigation, Mail, Hash
} from "lucide-react";
import styles from "./shift_detail.module.css";

export default function ShiftDetailPage() {
	const { id } = useParams();
	const router = useRouter();
	const {
		shiftDetail,
		isActionPending,
		isError,
		errorMessage,
	} = useShifts(id);
	console.log("shiftDetail: ", shiftDetail);

	if (isError) return <PageLayout><div className={styles.error}>{errorMessage}</div></PageLayout>;
	if (isActionPending || !shiftDetail) return <PageLayout><div className={styles.loading}>Loading...</div></PageLayout>;

	const shift = shiftDetail; // Alias for easier access in existing JSX
	const statusClass = styles[`status_${shift.status}`] || styles.status_default;

	return (
		<PageLayout>
			{/* --- Header Section --- */}
			<header className={styles.header}>
				<div className={styles.headerTitleArea}>
					<div className={styles.badgeRow}>
						<div className={`${styles.statusBadge} ${statusClass}`}>
							{shift.status?.replace('_', ' ')}
						</div>
						{shift.isRecurring && (
							<div className={styles.recurringBadge}>
								<Repeat size={14} /> Recurring Shift
							</div>
						)}
					</div>
					<h1>Shift Details</h1>
					<p className={styles.shiftId}>ID: {shift._id}</p>
				</div>
				<Button icon={<Undo2 />} onClick={() => router.back()} variant="secondary">
					Back
				</Button>
			</header>

			<div className={styles.mainFlexWrapper}>

				{/* --- Left Column: Main Info --- */}
				<div className={styles.mainColumn}>

					{/* Time & Schedule */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Clock size={18} /> Time & Schedule</h3>
						<div className={styles.flexInnerRow}>
							<div className={styles.flexHalf}>
								<label className={styles.label}>Start Time</label>
								<p className={styles.boldVal}>{format(new Date(shift.startTime), "PPP p")}</p>
							</div>
							<div className={styles.flexHalf}>
								<label className={styles.label}>End Time</label>
								<p className={styles.boldVal}>{format(new Date(shift.endTime), "PPP p")}</p>
							</div>
						</div>
					</section>

					{/* Task List Section */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><CheckCircle2 size={18} /> Shift Tasks</h3>
						<div className={styles.taskList}>
							{shift.tasks?.length > 0 ? (
								shift.tasks.map((task, index) => (
									<div key={index} className={styles.taskItem}>
										<div className={styles.taskIndex}>{index + 1}</div>
										<div className={styles.taskContent}>
											<p className={styles.taskName}>{task.title || task.name}</p>
											{task.description && <p className={styles.taskDescription}>{task.description}</p>}
										</div>
										<ChevronRight size={16} className={styles.taskArrow} />
									</div>
								))
							) : (
								<p className={styles.emptyText}>No specific tasks assigned.</p>
							)}
						</div>
					</section>

					{/* Personnel Info Row */}
					<div className={styles.flexInnerRow}>
						<section className={`${styles.card} ${styles.flexHalf}`}>
							<h3 className={styles.cardTitle}><User size={18} /> Client</h3>
							<div className={styles.personInfo}>
								<p className={styles.mediumVal}>{shift.client?.fullName}</p>
								<div className={styles.subDetail}><Mail size={12} /> {shift.client?.email}</div>
								<div className={styles.subDetail}><Hash size={12} /> {shift.client?.id}</div>
							</div>
						</section>

						<section className={`${styles.card} ${styles.flexHalf}`}>
							<h3 className={styles.cardTitle}><User size={18} /> Caregiver</h3>
							<div className={styles.personInfo}>
								<p className={styles.mediumVal}>{shift.caregiver?.fullName}</p>
								<div className={styles.subDetail}><Mail size={12} /> {shift.caregiver?.email}</div>
								<div className={styles.subDetail}><Hash size={12} /> ID: {shift.caregiver?.employeeId || "N/A"}</div>
							</div>
						</section>
					</div>
				</div>

				{/* --- Right Column: Side Info --- */}
				<aside className={styles.sideColumn}>

					{/* Vibrant Tags Block */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Tag size={18} /> Shift Labels</h3>
						<div className={styles.tagWrapper}>
							{shift.tags?.map((tag, index) => (
								<span key={index} className={styles.customTag}>{tag}</span>
							))}
							{!shift.tags?.length && <p className={styles.emptyText}>No tags assigned</p>}
						</div>
					</section>

					{/* Compliance & Geofencing */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><ShieldCheck size={18} /> Compliance</h3>
						<div className={styles.metaInfoList}>
							<div className={styles.metaItem}>
								<span>Check-in State:</span>
								<strong className={styles.dangerText}>{shift.locationEnforcement?.state.replace(/_/g, ' ')}</strong>
							</div>
							<div className={styles.metaItem}>
								<span>Geofence:</span>
								<span>{shift.geofence?.radius}m ({shift.geofence?.shape})</span>
							</div>
						</div>
					</section>

					{/* Services Required */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><Navigation size={18} /> Services</h3>
						<div className={styles.chipBox}>
							{shift.servicesRequired?.map((service, index) => (
								<span key={index} className={styles.serviceChip}>{service}</span>
							))}
						</div>
					</section>

					{/* Shift Notes */}
					<section className={styles.card}>
						<h3 className={styles.cardTitle}><FileText size={18} /> Internal Notes</h3>
						<p className={styles.notesContent}>{shift.notes || "No additional notes."}</p>
					</section>
				</aside>
			</div>

			{/* --- Bottom Section: Full Width Map & Address --- */}
			<section className={`${styles.card} ${styles.fullWidthCard}`}>
				<h3 className={styles.cardTitle}><MapPin size={18} /> Location & Navigation</h3>
				<div className={styles.mapGrid}>
					<div className={styles.mapContainerPlaceholder}>
						{/* Placeholder for future Google Maps API integration */}
						<div className={styles.mapInterfaceHint}>
							<Navigation size={48} strokeWidth={1} />
							<p>Google Maps Integration Layer</p>
						</div>
					</div>

					<div className={styles.locationSidebar}>
						<div className={styles.addressBlock}>
							<label className={styles.label}>Service Address</label>
							<p className={styles.addressText}>{shift.clientAddress}</p>
						</div>

						<div className={styles.contactGrid}>
							<div className={styles.contactBox}>
								<label className={styles.label}><Phone size={12} /> Client Phone</label>
								<p className={styles.mediumVal}>{shift.clientPhone}</p>
							</div>
							<div className={styles.contactBox}>
								<label className={styles.label}>Emergency Contact</label>
								<p className={styles.mediumVal}>{shift.contactPerson?.name}</p>
								<p className={styles.subText}>{shift.contactPerson?.phone}</p>
							</div>
						</div>

						<Button className={styles.navButton} variant="primary">
							Get Directions
						</Button>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}