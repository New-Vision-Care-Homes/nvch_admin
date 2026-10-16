"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import { Thermometer, User, MessageSquare, ShieldCheck } from "lucide-react";
import { DISPLAY_TZ, formatDateOnly, formatDateTime } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── PaidSickTimeRequest ──────────────────────────────────────────────────────
//
// Renders the left-column subject cards for paid_sick_time_request approvals.
//
// Modelled on VacationPayPayout.js, but in hours for one sick date. The server
// keeps no sick-time balance, so instead of "Balance at Request" this shows the
// disclaimer the caregiver accepted — the exact wording snapshotted on the
// approval — which stands in for a balance check.
//
// The pay period is only chosen at approval time, so it (and the approved
// hours, which may be fewer than requested) only appears once approved.
//
// Props:
//   subjectContext  {object}  — approval.subjectContext:
//     { caregiverName, sickDate, requestedHours, reason,
//       disclaimer: { version, text, acceptedAt },
//       approvedHours?, payPeriod? }
//   caregiverName   {string}

function formatPayPeriod(payPeriod) {
    if (!payPeriod) return "—";
    // Period bounds are Halifax start/end-of-day moments, so read them in
    // Halifax time — the UTC default would show the end a day late.
    const start = payPeriod.start ? formatDateOnly(payPeriod.start, "—", DISPLAY_TZ) : "";
    const end   = payPeriod.end   ? formatDateOnly(payPeriod.end,   "—", DISPLAY_TZ) : "";
    return start && end ? `${start} – ${end}` : start || end || "—";
}

export default function PaidSickTimeRequest({ subjectContext, caregiverName }) {
    const ctx        = subjectContext ?? {};
    const disclaimer = ctx.disclaimer ?? null;
    const wasCut     = ctx.approvedHours != null && ctx.requestedHours != null && ctx.approvedHours < ctx.requestedHours;

    return (
        <>
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <Thermometer size={15} />
                        Sick Time Details
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#bc29b7" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{caregiverName}</span>
                            </div>
                        </div>

                    </div>

                    <div style={{ marginTop: "12px" }}>
                        <InfoField label="Sick Date">
                            {formatDateOnly(ctx.sickDate)}
                        </InfoField>
                        <InfoField label="Requested Hours">
                            {ctx.requestedHours != null ? `${ctx.requestedHours} h` : "—"}
                        </InfoField>
                        {ctx.approvedHours != null && (
                            <InfoField label="Approved Hours">
                                {`${ctx.approvedHours} h`}
                                {wasCut && (
                                    <span style={{ marginLeft: 6, color: "#b45309", fontSize: "0.8rem" }}>
                                        (reduced from {ctx.requestedHours} h)
                                    </span>
                                )}
                            </InfoField>
                        )}
                        {ctx.payPeriod && (
                            <InfoField label="Paid In Period">
                                {formatPayPeriod(ctx.payPeriod)}
                            </InfoField>
                        )}
                        <InfoField label="Request Reason">
                            {ctx.reason ? `${ctx.reason}` : "—"}
                        </InfoField>
                    </div>
                </CardContent>
            </Card>

            {/* Disclaimer the caregiver confirmed — no balance is held server-side,
                so this is the record of what they attested to. */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <ShieldCheck size={15} />
                        Accepted Disclaimer
                    </span>
                </CardHeader>
                <CardContent>
                    {disclaimer ? (
                        <>
                            <div className={styles.decisionReasonBox} style={{ whiteSpace: "pre-wrap" }}>
                                {disclaimer.text || "—"}
                            </div>
                            <div style={{ marginTop: "12px" }}>
                                <InfoField label="Accepted At">
                                    {formatDateTime(disclaimer.acceptedAt)}
                                </InfoField>
                                <InfoField label="Version">
                                    {disclaimer.version ?? "—"}
                                </InfoField>
                            </div>
                        </>
                    ) : (
                        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>No disclaimer recorded.</span>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
