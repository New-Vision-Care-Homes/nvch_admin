"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { Timer, User, CalendarDays, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── OvertimeMandate ──────────────────────────────────────────────────────────
//
// Renders the left-column subject card for overtime_mandate approvals.
//
// Shows the caregiver, a clickable link to the related shift, planned overage
// hours, and a review-context note explaining the decision the admin must make.
//
// Props:
//   subjectContext  {object}  — approval.subjectContext
//   caregiverName   {string}
//   subjectId       {string}  — approval.subjectId (the shift ID for navigation)
//   onNavigateShift {fn}      — navigate to the shift detail page

export default function OvertimeMandate({
    subjectContext,
    caregiverName,
    subjectId,
    onNavigateShift,
}) {
    return (
        <Card>
            <CardHeader>
                <span className={styles.cardTitleInner}>
                    <Timer size={15} />
                    Shift &amp; Caregiver
                </span>
            </CardHeader>
            <CardContent>
                <div className={styles.subjectBlock}>

                    {/* Caregiver */}
                    <div className={styles.subjectRow}>
                        <div className={styles.subjectIconBox}>
                            <User size={16} color="#dc2626" />
                        </div>
                        <div className={styles.subjectRowBody}>
                            <span className={styles.subjectRowLabel}>Caregiver</span>
                            <span className={styles.subjectRowValue}>{caregiverName}</span>
                        </div>
                    </div>

                    {/* Shift link */}
                    {subjectId && (
                        <div
                            className={`${styles.subjectRow} ${styles.subjectRowLink}`}
                            role="button"
                            tabIndex={0}
                            onClick={onNavigateShift}
                            onKeyDown={(event) => event.key === "Enter" && onNavigateShift()}
                        >
                            <div className={styles.subjectIconBox}>
                                <CalendarDays size={16} color="#dc2626" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Shift Window</span>
                                <span className={styles.subjectRowValue}>
                                    {subjectContext.shiftStart && subjectContext.shiftEnd
                                        ? `${formatDateTime(subjectContext.shiftStart)} – ${formatDateTime(subjectContext.shiftEnd)}`
                                        : "View Shift"}
                                </span>
                            </div>
                            <ExternalLink size={13} className={styles.subjectRowLinkIcon} />
                        </div>
                    )}

                    {/* Planned overage */}
                    <div className={styles.subjectRow}>
                        <div className={styles.subjectIconBox}>
                            <Timer size={16} color="#dc2626" />
                        </div>
                        <div className={styles.subjectRowBody}>
                            <span className={styles.subjectRowLabel}>Planned Overage</span>
                            <span className={styles.subjectRowValue}>
                                {subjectContext.plannedOverageHours != null
                                    ? `${subjectContext.plannedOverageHours} h over capacity`
                                    : "—"}
                            </span>
                        </div>
                    </div>

                </div>

                {/* Review context — explains the two possible decisions */}
                <div style={{ marginTop: "12px" }}>
                    <InfoField label="Review Context">
                        The caregiver declined the overtime acknowledgment. Mandate the overage as overtime pay, or remove them from the shift.
                    </InfoField>
                </div>
            </CardContent>
        </Card>
    );
}
