"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import StatusBadge from "@components/UI/Feedback/Badge";
import ServiceLocationPanel from "@components/UI/Panel/ServiceLocationPanel";
import AppActivityPanel from "@components/UI/Panel/AppActivityPanel";
import {
    User, Home, CalendarDays, ExternalLink, ClockAlert,
    MapPin, MessageSquare, BadgeCheck, Activity, CheckCircle2,
} from "lucide-react";
import { formatDateTime, DISPLAY_TZ } from "@/utils/dates";
import { utcToDisplayTime } from "@/utils/timeHandling";
import { CLOCK_OUT_TRIGGER_LABELS } from "../../_utils/approvalMeta";
import styles from "../approval_detail.module.css";

// ─── ClockOutReviewApproval ───────────────────────────────────────────────────
//
// The subject cards for clock_out_review approvals: a shift ended without a
// verified clock-out at the home (signed out by the system or the app, or
// clocked out off-site), and the reviewer decides how much of it to pay.
// subjectContext is a snapshot taken when the review opened; explanation and
// decision are filled in later.
//
// Split into three parts so the detail page can lay this type out as
// "evidence | decide" without changing any other approval type:
//
//   ClockOutEvidence    — left column: What Happened (caregiver, house, shift
//                         link, trigger, clock-in/out, credited end and hours,
//                         reminders, prior reviews) and App Activity
//                         (AppActivityPanel, shared with the shift detail page)
//   ClockOutOutcome     — right column, under Decision once decided:
//                         subjectContext.decision (paid until, hours before/after)
//   ClockOutExplanation — right column, after Decision/Outcome and before the
//                         actions: the caregiver's explanation, or when it's due
//   ClockOutLocation    — full width under the grid: ServiceLocationPanel
//                         (shared with the shift detail page). Polygon
//                         geofences send site: null, so only the blocks show.
//
// Props (each part takes what it needs):
//   subjectContext  {object}  — approval.subjectContext
//   caregiverName   {string}  — ClockOutEvidence
//   onNavigateShift {fn}      — ClockOutEvidence: open the shift detail page
//   isPending       {boolean} — ClockOutExplanation: approval is still pending,
//                               so a closed window reads "deadline passed"
//   approvalId      {string}  — ClockOutLocation: keys the map per approval

const TRIGGER_DESCRIPTIONS = {
    server_auto:     "The caregiver never clocked out, so the server closed the shift 10 minutes after its scheduled end. No location was captured.",
    app_auto:        "The app clocked the caregiver out automatically 5 minutes after the scheduled end.",
    off_site_manual: "The caregiver clocked out themselves from outside the shift's location.",
};

const REMINDER_LABELS = {
    "t-15m": "15 min before end — shift checklist",
    "t-5m":  "5 min before end — \"Clock out in 5 minutes\"",
    "t0":    "At the end — \"Your shift has ended\"",
};

function formatHours(hours) {
    return Number.isFinite(hours) ? `${Math.round(hours * 100) / 100} h` : "—";
}

// ─── Left column: the evidence ────────────────────────────────────────────────

export function ClockOutEvidence({ subjectContext, caregiverName, onNavigateShift }) {
    const ctx       = subjectContext ?? {};
    const clockIn   = ctx.clockIn ?? {};
    const clockOut  = ctx.clockOut ?? {};
    const presence  = ctx.presence ?? null;
    const device    = clockIn.device ?? null;
    const reminders = ctx.remindersSent ?? [];
    const prior     = ctx.priorReviews30d ?? null;

    return (
        <>
            {/* ── What happened ────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <ClockAlert size={15} />
                        What Happened
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{caregiverName}</span>
                            </div>
                        </div>

                        {/* House */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <Home size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>House</span>
                                <span className={styles.subjectRowValue}>{ctx.homeName || "Client visit"}</span>
                            </div>
                        </div>

                        {/* Shift link */}
                        <div
                            className={`${styles.subjectRow} ${styles.subjectRowLink}`}
                            role="button"
                            tabIndex={0}
                            onClick={onNavigateShift}
                            onKeyDown={(event) => event.key === "Enter" && onNavigateShift()}
                        >
                            <div className={styles.subjectIconBox}>
                                <CalendarDays size={16} color="#d97706" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Shift Window</span>
                                <span className={styles.subjectRowValue}>
                                    {ctx.shiftStartTime && ctx.shiftEndTime
                                        ? `${formatDateTime(ctx.shiftStartTime)} – ${formatDateTime(ctx.shiftEndTime)}`
                                        : "View Shift"}
                                </span>
                            </div>
                            <ExternalLink size={13} className={styles.subjectRowLinkIcon} />
                        </div>

                    </div>

                    <div style={{ marginTop: "12px" }}>
                        <InfoField label="What Happened">
                            <strong>{CLOCK_OUT_TRIGGER_LABELS[ctx.trigger] ?? "Clock-out review"}</strong>
                            {TRIGGER_DESCRIPTIONS[ctx.trigger] && (
                                <div className={styles.mutedText}>{TRIGGER_DESCRIPTIONS[ctx.trigger]}</div>
                            )}
                        </InfoField>
                    </div>

                    {/* The times, in order — paid from, paid until, actually closed */}
                    <ol className={styles.whTimeline}>
                        <li className={styles.whTimelineItem}>
                            <span className={`${styles.whDot} ${styles.whDot_in}`} />
                            <span className={styles.whTimelineLabel}>Clocked in <span className={styles.whTimelineHint}>(paid from)</span></span>
                            <span className={styles.whTimelineValue}>{formatDateTime(clockIn.at)}</span>
                        </li>
                        <li className={styles.whTimelineItem}>
                            <span className={`${styles.whDot} ${styles.whDot_credited}`} />
                            <span className={styles.whTimelineLabel}>Credited end <span className={styles.whTimelineHint}>(before the review)</span></span>
                            <span className={styles.whTimelineValue}>{formatDateTime(clockOut.creditedEndTime)}</span>
                        </li>
                        <li className={styles.whTimelineItem}>
                            <span className={`${styles.whDot} ${styles.whDot_out}`} />
                            <span className={styles.whTimelineLabel}>Signed out</span>
                            <span className={styles.whTimelineValue}>{formatDateTime(clockOut.recordedAt)}</span>
                        </li>
                    </ol>

                    <InfoField label="Hours Credited">
                        {formatHours(ctx.hoursCredited)}
                    </InfoField>

                    {clockOut.endEarlyReason && (
                        <InfoField label="Reason for Ending Early">
                            {clockOut.endEarlyReason}
                        </InfoField>
                    )}

                    <InfoField label="Reminders Sent">
                        {reminders.length === 0 ? (
                            // Not reminded at all — worth noticing
                            <span className={`${styles.whChip} ${styles.whChip_warning}`}>None sent</span>
                        ) : (
                            <ul className={styles.whReminders}>
                                {reminders.map((reminder) => (
                                    <li key={reminder.stage}>
                                        <CheckCircle2 size={13} className={styles.whReminderIcon} />
                                        <span className={styles.whReminderTime}>{utcToDisplayTime(reminder.at, DISPLAY_TZ)}</span>
                                        {REMINDER_LABELS[reminder.stage] ?? reminder.stage}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </InfoField>

                    <InfoField label="Clock-Out Reviews in the Last 30 Days">
                        {/* Green: none · amber: some · red: any rejected */}
                        <span className={`${styles.whChip} ${
                            !prior?.total ? styles.whChip_good
                                : prior.rejected ? styles.whChip_bad
                                : styles.whChip_warning}`}
                        >
                            {prior?.total
                                ? `${prior.total} earlier review${prior.total === 1 ? "" : "s"}${prior.rejected ? ` · ${prior.rejected} rejected` : ""}`
                                : "None"}
                        </span>
                    </InfoField>
                </CardContent>
            </Card>

            {/* ── App activity (panel shared with the shift detail page) ───── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <Activity size={15} />
                        App Activity
                    </span>
                </CardHeader>
                <CardContent>
                    <AppActivityPanel presence={presence} device={device} />
                </CardContent>
            </Card>
        </>
    );
}

// ─── Right column: the caregiver's side ───────────────────────────────────────

export function ClockOutExplanation({ subjectContext, isPending }) {
    const ctx         = subjectContext ?? {};
    const explanation = ctx.explanation ?? null;

    return (
        <>
            {/* ── Caregiver's explanation ──────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <MessageSquare size={15} />
                        Caregiver&apos;s Explanation
                    </span>
                </CardHeader>
                <CardContent>
                    {explanation ? (
                        <>
                            <div className={styles.decisionReasonBox}>{explanation.note}</div>
                            <div className={styles.photoDetailsGrid}>
                                <InfoField label="Time They Left">
                                    {explanation.leftAt ? formatDateTime(explanation.leftAt) : "Not given"}
                                </InfoField>
                                <InfoField label="Submitted">
                                    {formatDateTime(explanation.submittedAt)}
                                </InfoField>
                            </div>
                        </>
                    ) : ctx.explanationOpen ? (
                        <p className={styles.mutedText} style={{ margin: 0 }}>
                            Not submitted yet — they have until <strong>{formatDateTime(ctx.explanationDueAt)}</strong>.
                            {ctx.awaitingExplanation && " Pay can't be reduced until they explain or the deadline passes."}
                        </p>
                    ) : isPending ? (
                        <p className={styles.mutedText} style={{ margin: 0 }}>Deadline passed, no explanation was sent.</p>
                    ) : (
                        <p className={styles.mutedText} style={{ margin: 0 }}>No explanation was sent.</p>
                    )}
                </CardContent>
            </Card>

        </>
    );
}

// ─── Right column: the outcome, once decided ──────────────────────────────────

export function ClockOutOutcome({ subjectContext }) {
    const decision = subjectContext?.decision ?? null;
    if (!decision) return null;

    return (
        <Card>
            <CardHeader>
                <span className={styles.cardTitleInner}>
                    <BadgeCheck size={15} />
                    Outcome
                </span>
            </CardHeader>
            <CardContent>
                <div className={styles.photoDetailsGrid}>
                    <InfoField label="Decision">
                        <StatusBadge
                            label={decision.outcome === "rejected" ? "Rejected" : "Approved"}
                            tone={decision.outcome === "rejected" ? "danger" : "success"}
                            size="pill"
                        />
                    </InfoField>
                    <InfoField label="Paid Until">
                        {formatDateTime(decision.paidUntil)}
                    </InfoField>
                    <InfoField label="Hours Before">
                        {formatHours(decision.hoursBefore)}
                    </InfoField>
                    <InfoField label="Hours Paid">
                        {formatHours(decision.hoursAfter)}
                        {decision.hoursAfter === decision.hoursBefore && (
                            <span className={styles.mutedText}> (unchanged)</span>
                        )}
                    </InfoField>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Full width: where it happened ────────────────────────────────────────────

export function ClockOutLocation({ approvalId, subjectContext }) {
    const ctx           = subjectContext ?? {};
    const site          = ctx.site ?? null;
    const clockIn       = ctx.clockIn ?? {};
    const clockOut      = ctx.clockOut ?? {};
    const locationCheck = ctx.locationCheck ?? null;
    const isServerClose = ctx.trigger === "server_auto";

    return (
        <>
            {/* ── Map ──────────────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span className={styles.cardTitleInner}>
                        <MapPin size={15} />
                        Service Location
                    </span>
                </CardHeader>
                <CardContent>
                    <ServiceLocationPanel
                        mapKey={approvalId}
                        site={site}
                        noMapText="No map — this shift's location isn't a circle geofence."
                        serviceAddress={site?.address}
                        clockIn={{ location: clockIn.location, distanceMeters: clockIn.distanceMeters }}
                        clockOut={isServerClose
                            ? { note: "No location — closed by the system" }
                            : {
                                location:       clockOut.location,
                                distanceMeters: clockOut.distanceMeters,
                                insideGeofence: clockOut.insideGeofence,
                            }}
                        locationCheck={locationCheck}
                    />
                </CardContent>
            </Card>
        </>
    );
}
