"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { DateTime } from "luxon";
import {
	ChevronLeft,
	ChevronRight,
	Building2,
	Sun,
	Moon,
	LayoutGrid,
} from "lucide-react";

import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import { useHomes } from "@/hooks/useHomes";

import styles from "./shift_builder.module.css";

const PAYROLL_ANCHOR = new Date(2026, 0, 1);
const PERIOD_DAYS = 14;
const HALIFAX_TZ = "America/Halifax";

function calcPayPeriodNumber(periodStart) {
	const msPerPeriod = PERIOD_DAYS * 24 * 60 * 60 * 1000;
	const diff = Math.max(0, periodStart.getTime() - PAYROLL_ANCHOR.getTime());
	return Math.floor(diff / msPerPeriod) + 1;
}

export default function ShiftBuilderPage() {
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [periodOffset, setPeriodOffset] = useState(0);
	const [selectedHomeId, setSelectedHomeId] = useState(null);

	const { homes, isLoading: homesLoading } = useHomes();

	useEffect(() => {
		if (homes && homes.length > 0 && selectedHomeId === null) {
			setSelectedHomeId(homes[0]._id || homes[0].id);
		}
	}, [homes, selectedHomeId]);

	const payrollPeriod = useMemo(() => {
		const msPerPeriod = PERIOD_DAYS * 24 * 60 * 60 * 1000;
		const nowHfx = DateTime.now().setZone(HALIFAX_TZ);
		const today = new Date(nowHfx.year, nowHfx.month - 1, nowHfx.day);
		const diffMs = Math.max(0, today.getTime() - PAYROLL_ANCHOR.getTime());
		const currentIdx = Math.floor(diffMs / msPerPeriod);
		const start = addDays(PAYROLL_ANCHOR, (currentIdx + periodOffset) * PERIOD_DAYS);
		const end = addDays(start, PERIOD_DAYS - 1);
		const ppNumber = calcPayPeriodNumber(start);
		return { start, end, ppNumber };
	}, [periodOffset]);

	const days = useMemo(
		() => Array.from({ length: 14 }, (_, i) => addDays(payrollPeriod.start, i)),
		[payrollPeriod]
	);

	const handleSlotClick = (date, type) => {
		router.push("/scheduling/add_new_shift");
	};

	const selectedHome = homes?.find(
		(h) => (h._id || h.id) === selectedHomeId
	);

	return (
		<div className={styles.page}>
			<Navbar onMenuClick={() => setMobileOpen(true)} />
			<div className={styles.container}>
				<Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

				<main className={styles.body}>
					{/* ── Header ── */}
					<div className={styles.header}>
						<div className={styles.titleArea}>
							<div className={styles.titleRow}>
								<LayoutGrid size={28} className={styles.titleIcon} />
								<h1 className={styles.heading}>Shift Builder</h1>
							</div>
							<p className={styles.subtitle}>
								Design your schedule template — click any slot to create a shift
							</p>
						</div>

						<div className={styles.houseSelectorCard}>
							<Building2 size={18} className={styles.houseIcon} />
							<select
								className={styles.houseSelect}
								value={selectedHomeId || ""}
								onChange={(e) => setSelectedHomeId(e.target.value)}
								disabled={homesLoading || !homes?.length}
							>
								{homesLoading && <option>Loading homes…</option>}
								{homes?.map((home) => {
									const id = home._id || home.id;
									return (
										<option key={id} value={id}>
											{home.name || home.homeName || `Home ${id}`}
										</option>
									);
								})}
							</select>
						</div>
					</div>

					{/* ── Pay Period Bar ── */}
					<div className={styles.periodBar}>
						<button
							className={styles.periodNav}
							onClick={() => setPeriodOffset((p) => p - 1)}
							title="Previous pay period"
						>
							<ChevronLeft size={18} />
						</button>

						<div className={styles.periodInfo}>
							<span className={styles.periodBadge}>
								PP {payrollPeriod.ppNumber}
							</span>
							<span className={styles.periodDates}>
								{format(payrollPeriod.start, "MMM d")} –{" "}
								{format(payrollPeriod.end, "MMM d, yyyy")}
							</span>
						</div>

						<button
							className={styles.periodNav}
							onClick={() => setPeriodOffset((p) => p + 1)}
							title="Next pay period"
						>
							<ChevronRight size={18} />
						</button>
					</div>

					{/* ── Schedule Grid ── */}
					<div className={styles.tableCard}>
						<div className={styles.tableWrapper}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th className={styles.labelHeaderCell} />
										{days.map((day, i) => (
											<th key={i} className={styles.dayHeader}>
												<div className={styles.dayHeaderContent}>
													<span className={styles.dayName}>
														{format(day, "EEE")}
													</span>
													<span className={styles.dayNum}>
														{format(day, "d")}
													</span>
													<span className={styles.dayMonth}>
														{format(day, "MMM")}
													</span>
												</div>
											</th>
										))}
									</tr>
								</thead>

								<tbody>
									{/* ── Day shift row 1 ── */}
									<tr>
										<td
											rowSpan={2}
											className={`${styles.rowLabel} ${styles.dayRowLabel}`}
										>
											<div className={styles.rowLabelContent}>
												<Sun size={16} className={styles.rowLabelIcon} />
												<span className={styles.rowLabelText}>Day</span>
												<span className={styles.rowLabelTime}>
													7AM – 7PM
												</span>
											</div>
										</td>
										{days.map((day, i) => (
											<td
												key={i}
												className={`${styles.cell} ${styles.dayRowTop}`}
											>
												<button
													className={`${styles.slotBtn} ${styles.daySlotBtn}`}
													onClick={() => handleSlotClick(day, "D")}
													title={`Day shift · ${format(day, "MMM d")}`}
												>
													D
												</button>
											</td>
										))}
									</tr>

									{/* ── Day shift row 2 ── */}
									<tr>
										{days.map((day, i) => (
											<td
												key={i}
												className={`${styles.cell} ${styles.dayRowBottom}`}
											>
												<button
													className={`${styles.slotBtn} ${styles.daySlotBtn}`}
													onClick={() => handleSlotClick(day, "D")}
													title={`Day shift · ${format(day, "MMM d")}`}
												>
													D
												</button>
											</td>
										))}
									</tr>

									{/* ── Night shift row 1 ── */}
									<tr>
										<td
											rowSpan={2}
											className={`${styles.rowLabel} ${styles.nightRowLabel}`}
										>
											<div className={styles.rowLabelContent}>
												<Moon size={16} className={styles.rowLabelIcon} />
												<span className={styles.rowLabelText}>Night</span>
												<span className={styles.rowLabelTime}>
													7PM – 7AM
												</span>
											</div>
										</td>
										{days.map((day, i) => (
											<td
												key={i}
												className={`${styles.cell} ${styles.nightRowTop}`}
											>
												<button
													className={`${styles.slotBtn} ${styles.nightSlotBtn}`}
													onClick={() => handleSlotClick(day, "N")}
													title={`Night shift · ${format(day, "MMM d")}`}
												>
													N
												</button>
											</td>
										))}
									</tr>

									{/* ── Night shift row 2 ── */}
									<tr>
										{days.map((day, i) => (
											<td
												key={i}
												className={`${styles.cell} ${styles.nightRowBottom}`}
											>
												<button
													className={`${styles.slotBtn} ${styles.nightSlotBtn}`}
													onClick={() => handleSlotClick(day, "N")}
													title={`Night shift · ${format(day, "MMM d")}`}
												>
													N
												</button>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					{/* ── Legend ── */}
					<div className={styles.legend}>
						<div className={styles.legendItem}>
							<span className={`${styles.legendBadge} ${styles.legendBadgeD}`}>
								D
							</span>
							<span>Day Shift &nbsp;·&nbsp; 7:00 AM – 7:00 PM</span>
						</div>
						<div className={styles.legendDivider} />
						<div className={styles.legendItem}>
							<span className={`${styles.legendBadge} ${styles.legendBadgeN}`}>
								N
							</span>
							<span>Night Shift &nbsp;·&nbsp; 7:00 PM – 7:00 AM</span>
						</div>
						<div className={styles.legendNote}>
							Click any slot to create a new shift
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
