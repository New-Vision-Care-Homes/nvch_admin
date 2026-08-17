"use client";

import { Card, CardHeader, CardContent } from "@components/UI/Card";
import { User, Hash, CalendarRange, Timer, FileText } from "lucide-react";
import { formatDateTime } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── AcknowledgmentDecision ───────────────────────────────────────────────────
//
// Renders the subject-context details for an overtime_acknowledgment approval.
// Used by ApprovalDetailPage for both the pending (admin viewing) and decided
// (caregiver tapping the approval_decided notification) states.
//
// Displays two cards:
//   1. Shift & Caregiver — name, shift ID, start/end time, planned overage
//   2. Waiver Statement  — the text the caregiver acknowledged
//
// Props:
//   ctx {object} — approval.subjectContext

export default function AcknowledgmentDecision({ subjectContext = {} }) {
    const startTime = subjectContext.shiftStartTime ?? subjectContext.shiftStart;
    const endTime   = subjectContext.shiftEndTime   ?? subjectContext.shiftEnd;

    return (
        <>
            {/* ── Shift & Caregiver ───────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <Timer size={15} />
                        Shift &amp; Caregiver
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver name */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{subjectContext.caregiverName ?? "—"}</span>
                            </div>
                        </div>

                        {/* Shift ID */}
                        {subjectContext.shiftId && (
                            <div className={styles.subjectRow}>
                                <div className={styles.subjectIconBox}>
                                    <Hash size={16} color="#d97706" />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>Shift ID</span>
                                    <span className={styles.subjectRowValue} style={{ fontFamily: "monospace", fontSize: "0.82rem", wordBreak: "break-all" }}>
                                        {subjectContext.shiftId}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Start time */}
                        {startTime && (
                            <div className={styles.subjectRow}>
                                <div className={styles.subjectIconBox}>
                                    <CalendarRange size={16} color="#d97706" />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>Start Time</span>
                                    <span className={styles.subjectRowValue}>{formatDateTime(startTime)}</span>
                                </div>
                            </div>
                        )}

                        {/* End time */}
                        {endTime && (
                            <div className={styles.subjectRow}>
                                <div className={styles.subjectIconBox}>
                                    <CalendarRange size={16} color="#d97706" />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>End Time</span>
                                    <span className={styles.subjectRowValue}>{formatDateTime(endTime)}</span>
                                </div>
                            </div>
                        )}

                        {/* Planned overage */}
                        {subjectContext.plannedOverageHours != null && (
                            <div className={styles.subjectRow}>
                                <div className={styles.subjectIconBox}>
                                    <Timer size={16} color="#d97706" />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>Planned Overage</span>
                                    <span className={styles.subjectRowValue}>{subjectContext.plannedOverageHours} h over capacity</span>
                                </div>
                            </div>
                        )}

                    </div>
                </CardContent>
            </Card>

            {/* ── Waiver Statement ────────────────────────────────────────────── */}
            {subjectContext.statement && (
                <Card>
                    <CardHeader>
                        <span className={styles.cardTitleInner}>
                            <FileText size={15} />
                            Waiver Statement
                        </span>
                    </CardHeader>
                    <CardContent>
                        <p className={styles.waiverText}>{subjectContext.statement}</p>
                        {subjectContext.statementVersion != null && (
                            <span className={styles.waiverVersion}>Version: {subjectContext.statementVersion}</span>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
