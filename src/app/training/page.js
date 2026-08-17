"use client";

// ============================================================
// IMPORTS
// ============================================================

import { useState } from "react";
import Link from "next/link";
import PageLayout from "@components/layout/PageLayout";
import ErrorState  from "@/components/UI/ErrorState";
import EmptyState  from "@/components/UI/EmptyState";
import StatusBadge, { ColorPill } from "@/components/UI/Badge";
import IconButton  from "@/components/UI/IconButton";
import { PageTable, PageTableRow } from "@components/UI/Table";
import { useTrainings } from "@/hooks/useTrainings";
import { useProfile }    from "@/hooks/useProfile";
import { formatDateTime } from "@/utils/dates";
import { TRAINING_STATUS_META } from "./_components/statusMeta";
import { useTrainingTypeDropdown } from "@/utils/dropdownList/trainingType";
import { Eye } from "lucide-react";
import styles from "./training.module.css";

// ============================================================
// SECTION: TrainingPage
// ============================================================
//
// Training session list with from/to (startTime) and type filters, matching
// the /api/trainings?from=&to=&type= query exactly.
// Accessible to admins with view_trainings OR view_payroll (enforced in sidebar).

export default function TrainingPage() {

    // ── Profile / permissions ──────────────────────────────────────────────────
    const { profile } = useProfile();
    const slugs     = profile?.permissionSlugs ?? [];
    const canManage = slugs.includes("manage_trainings");

    // ── Filter state ───────────────────────────────────────────────────────────
    const [from, setFrom] = useState("");
    const [to, setTo]     = useState("");
    const [type, setType] = useState("");

    const { trainingTypes, getTrainingTypeColor } = useTrainingTypeDropdown();

    // ── API params ─────────────────────────────────────────────────────────────
    const queryParams = {
        ...(from && { from }),
        ...(to && { to }),
        ...(type && { type }),
    };

    const { trainings, isLoading, fetchError, refetch } = useTrainings(queryParams);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <PageLayout>
            <div className={styles.pageContainer}>

                {/* ── Page header ─────────────────────────────────────────── */}
                <div className={styles.pageHeader}>
                    <h1>Training</h1>
                    <div className={styles.headerActions}>
                        {canManage && (
                            <Link href="/training/new" className={styles.addButton}>
                                + Add Training
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Filter bar ──────────────────────────────────────────── */}
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>From</span>
                        <input
                            type="date"
                            className={styles.filterSelect}
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>To</span>
                        <input
                            type="date"
                            className={styles.filterSelect}
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Type</span>
                        <select
                            className={styles.filterSelect}
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="">All types</option>
                            {trainingTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Type color legend ───────────────────────────────────── */}
                {trainingTypes.length > 0 && (
                    <div className={styles.legend}>
                        <span className={styles.legendLabel}>Type:</span>
                        {trainingTypes.map((t) => (
                            <ColorPill key={t.value} label={t.label} color={getTrainingTypeColor(t.value)} />
                        ))}
                    </div>
                )}

                {/* ── Loading / error ──────────────────────────────────────── */}
                <ErrorState isLoading={isLoading} errorMessage={fetchError} onRetry={refetch} />

                {/* ── Training table ───────────────────────────────────────── */}
                {!isLoading && !fetchError && (
                    trainings.length === 0 ? (
                        <EmptyState
                            title="No trainings found"
                            message="No training sessions match the current filters."
                        />
                    ) : (
                        <PageTable minWidth="900px">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Site</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Status</th>
                                    <th>Attendees</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {trainings.map((training, idx) => {
                                    const trainingId = training.id || training._id;
                                    const typeColor = getTrainingTypeColor(training.trainingType);
                                    return (
                                        <PageTableRow
                                            key={trainingId}
                                            isEven={idx % 2 !== 0}
                                        >
                                            <td className={styles.tdName}>{training.title}</td>
                                            <td>
                                                <ColorPill label={training.trainingTypeLabel || training.trainingType} color={typeColor} />
                                            </td>
                                            <td>{training.site?.name || "—"}</td>
                                            <td className={styles.tdDate}>{formatDateTime(training.startTime)}</td>
                                            <td className={styles.tdDate}>{formatDateTime(training.endTime)}</td>
                                            <td>
                                                <StatusBadge
                                                    label={TRAINING_STATUS_META[training.status]?.label || training.status}
                                                    tone={TRAINING_STATUS_META[training.status]?.tone}
                                                />
                                            </td>
                                            <td>{training.attendees?.length ?? 0}</td>
                                            <td className={styles.actionsCell}>
                                                <IconButton href={`/training/${trainingId}`} title="View details">
                                                    <Eye size={15} />
                                                </IconButton>
                                            </td>
                                        </PageTableRow>
                                    );
                                })}
                            </tbody>
                        </PageTable>
                    )
                )}

            </div>
        </PageLayout>
    );
}
