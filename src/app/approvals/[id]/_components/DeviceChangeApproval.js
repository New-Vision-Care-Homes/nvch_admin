"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import { User, Smartphone, MessageSquare } from "lucide-react";
import styles from "../approval_detail.module.css";

// ─── DeviceChangeApproval ───────────────────────────────────────────────────
//
// Renders the left-column subject card for caregiver_device_change approvals.
//
// The admin cannot choose or replace the device here — the backend binds the
// exact deviceId captured when the caregiver filed the request. This view is
// read-only; it only exists so the admin can verify the request before
// deciding. The full deviceId is never shown, only its last 4 characters,
// matching the masking used on the caregiver's Device tab.
//
// Props:
//   subjectContext {object} — approval.subjectContext:
//     { caregiverName, deviceId, deviceLabel, platform, previousDeviceLabel, reason }
//   caregiverName  {string}

export default function DeviceChangeApproval({ subjectContext, caregiverName }) {
    const ctx = subjectContext ?? {};
    const deviceIdSuffix = ctx.deviceId ? String(ctx.deviceId).slice(-4) : null;

    return (
        <Card>
            <CardHeader>
                <span className={styles.cardTitleInner}>
                    <Smartphone size={15} />
                    Device Change Request
                </span>
            </CardHeader>
            <CardContent>
                <InfoField label="Caregiver">
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <User size={14} style={{ color: "#9ca3af" }} />
                        {caregiverName}
                    </span>
                </InfoField>
                <InfoField label="Current Device">
                    {ctx.previousDeviceLabel || "—"}
                </InfoField>
                <InfoField label="Requested Device">
                    {ctx.deviceLabel || "—"}
                </InfoField>
                <InfoField label="Platform">
                    {ctx.platform || "—"}
                </InfoField>
                <InfoField label="Requested Device ID">
                    {deviceIdSuffix ? `•••• ${deviceIdSuffix}` : "—"}
                </InfoField>
                {ctx.reason && (
                    <InfoField label="Caregiver's Reason">
                        <div className={styles.decisionReasonBox}>
                            <MessageSquare size={13} style={{ marginRight: 6, verticalAlign: "middle", color: "#9ca3af" }} />
                            {ctx.reason}
                        </div>
                    </InfoField>
                )}
            </CardContent>
        </Card>
    );
}
