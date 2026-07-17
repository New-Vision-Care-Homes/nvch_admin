"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { Banknote, User } from "lucide-react";
import { formatDateOnly } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── BankedHoursPayout ────────────────────────────────────────────────────────
//
// Renders the left-column subject card for banked_hours_payout approvals.
//
// Shows the caregiver, the number of hours requested, the target pay period,
// and the caregiver's banked-hours balance at the time of the request.
//
// Props:
//   subjectContext  {object}  — approval.subjectContext
//   caregiverName   {string}

function formatPayPeriod(payPeriod) {
    if (!payPeriod) return "—";
    const start = payPeriod.start ? formatDateOnly(payPeriod.start) : "";
    const end   = payPeriod.end   ? formatDateOnly(payPeriod.end)   : "";
    return start && end ? `${start} – ${end}` : start || end || "—";
}

export default function BankedHoursPayout({ subjectContext, caregiverName }) {
    return (
        <Card>
            <CardHeader>
                <span className={styles.cardTitleInner}>
                    <Banknote size={15} />
                    Payout Details
                </span>
            </CardHeader>
            <CardContent>
                <div className={styles.subjectBlock}>

                    {/* Caregiver */}
                    <div className={styles.subjectRow}>
                        <div className={styles.subjectIconBox}>
                            <User size={16} color="#059669" />
                        </div>
                        <div className={styles.subjectRowBody}>
                            <span className={styles.subjectRowLabel}>Caregiver</span>
                            <span className={styles.subjectRowValue}>{caregiverName}</span>
                        </div>
                    </div>

                </div>

                <div style={{ marginTop: "12px" }}>
                    <InfoField label="Requested Hours">
                        {subjectContext.requestedHours != null ? `${subjectContext.requestedHours} h` : "—"}
                    </InfoField>
                    <InfoField label="Pay Period">
                        {formatPayPeriod(subjectContext.payPeriod)}
                    </InfoField>
                    <InfoField label="Balance at Request">
                        {subjectContext.currentBalance != null ? `${subjectContext.currentBalance} h` : "—"}
                    </InfoField>
                </div>
            </CardContent>
        </Card>
    );
}
