"use client";

import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import {
    User, FileText, Award, Lock,
    ExternalLink, CalendarDays, Pencil, XCircle,
} from "lucide-react";
import { formatDateOnly } from "@/utils/dates";
import styles from "../approval_detail.module.css";

// ─── CertificateApproval ──────────────────────────────────────────────────────
//
// Renders the left-column subject cards for caregiver_certificate approvals.
//
// Two states:
//   approved + has subjectParentId → profile link button (cert is live on profile)
//   pending / rejected              → Documents card (file preview) + Certificate
//                                     Dates card (editable when canDecide)
//
// Date editing state (isEditingDates / draftDates) is owned by the parent so the
// approve modal can read the draft values before confirming.
//
// Props:
//   approval            {object}   — full approval object
//   caregiverName       {string}
//   certificateName     {string}
//   fileUrl             {string|null}
//   canViewFile         {boolean}
//   canDecide           {boolean}
//   isPending           {boolean}
//   isEditingDates      {boolean}
//   draftDates          {{ startDate, expiryDate, renewalDate }}
//   filePreviewError    {boolean}
//   onSetFilePreviewError {fn}
//   onSetDraftDates     {fn}        — React state setter for draftDates
//   onStartEditDates    {fn}
//   onCancelEditDates   {fn}
//   onNavigateCaregiver {fn}        — navigate to the caregiver profile
//   subjectContext      {object}    — approval.subjectContext

export default function CertificateApproval({
    approval,
    caregiverName,
    certificateName,
    fileUrl,
    canViewFile,
    canDecide,
    isPending,
    isEditingDates,
    draftDates,
    filePreviewError,
    onSetFilePreviewError,
    onSetDraftDates,
    onStartEditDates,
    onCancelEditDates,
    onNavigateCaregiver,
    subjectContext,
}) {
    // After approval, point the admin directly to the caregiver profile where
    // the certificate is now live — no need to show the pending card view.
    if (approval.status === "approved" && approval.subjectParentId) {
        return (
            <button className={styles.caregiverProfileLink} onClick={onNavigateCaregiver}>
                <div className={styles.caregiverProfileLinkIcon}>
                    <User size={20} color="#7c3aed" />
                </div>
                <div className={styles.caregiverProfileLinkBody}>
                    <span className={styles.caregiverProfileLinkName}>{caregiverName}</span>
                    <span className={styles.caregiverProfileLinkHint}>
                        View caregiver profile for up-to-date certificate info
                    </span>
                </div>
                <ExternalLink size={15} className={styles.caregiverProfileLinkArrow} />
            </button>
        );
    }

    return (
        <>
            {/* ── Documents card ───────────────────────────────────────────── */}
            <Card>
                <CardHeader
                    actions={canViewFile && (
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.fileViewFullLink}
                        >
                            Open <ExternalLink size={12} />
                        </a>
                    )}
                >
                    <span className={styles.cardTitleInner}>
                        <FileText size={15} />
                        Documents
                    </span>
                </CardHeader>
                <CardContent>
                    <div className={styles.subjectBlock}>

                        {/* Caregiver */}
                        <div className={styles.subjectRow}>
                            <div className={styles.subjectIconBox}>
                                <User size={16} color="#7c3aed" />
                            </div>
                            <div className={styles.subjectRowBody}>
                                <span className={styles.subjectRowLabel}>Caregiver</span>
                                <span className={styles.subjectRowValue}>{caregiverName}</span>
                            </div>
                        </div>

                        {/* Certificate — locked when not viewable */}
                        {fileUrl ? (
                            <div className={`${styles.subjectRow} ${canViewFile ? "" : styles.subjectRowLocked}`}>
                                <div className={styles.subjectIconBox}>
                                    <Award size={16} color={canViewFile ? "#7c3aed" : "#9ca3af"} />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>Certificate</span>
                                    <span className={`${styles.subjectRowValue} ${canViewFile ? "" : styles.subjectRowValueLocked}`}>
                                        {certificateName}
                                    </span>
                                </div>
                                {!canViewFile && <Lock size={13} className={styles.subjectRowLockIcon} />}
                            </div>
                        ) : (
                            <div className={styles.subjectRow}>
                                <div className={styles.subjectIconBox}>
                                    <Award size={16} color="#7c3aed" />
                                </div>
                                <div className={styles.subjectRowBody}>
                                    <span className={styles.subjectRowLabel}>Certificate</span>
                                    <span className={styles.subjectRowValue}>{certificateName}</span>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Inline file preview */}
                    {canViewFile && (
                        filePreviewError ? (
                            <div className={styles.fileFallback}>
                                <FileText size={32} color="#d1d5db" />
                                <p className={styles.fileFallbackText}>Preview not available for this file type</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.fileFallbackLink}
                                >
                                    <ExternalLink size={14} />
                                    Open Document
                                </a>
                            </div>
                        ) : (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.fileImageWrap}
                            >
                                <img
                                    src={fileUrl}
                                    alt={certificateName}
                                    className={styles.fileImage}
                                    onError={() => onSetFilePreviewError(true)}
                                />
                                <div className={styles.fileImageOverlay}>
                                    <ExternalLink size={18} />
                                    Open full view
                                </div>
                            </a>
                        )
                    )}
                </CardContent>
            </Card>

            {/* ── Certificate Dates card — hidden when rejected ─────────────── */}
            {approval.status !== "rejected" && (
                <Card>
                    <CardHeader
                        actions={isPending && canDecide && (
                            isEditingDates ? (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<XCircle size={13} />}
                                    onClick={onCancelEditDates}
                                >
                                    Cancel
                                </Button>
                            ) : (
                                <Button
                                    variant="ghostPill"
                                    size="sm"
                                    icon={<Pencil size={13} />}
                                    onClick={onStartEditDates}
                                >
                                    Edit
                                </Button>
                            )
                        )}
                    >
                        <span className={styles.cardTitleInner}>
                            <CalendarDays size={15} />
                            Certificate Dates
                        </span>
                    </CardHeader>
                    <CardContent>
                        {isEditingDates ? (
                            <div className={styles.datesEditGrid}>
                                <div className={styles.dateField}>
                                    <label className={styles.dateFieldLabel}>Issue Date</label>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={draftDates.startDate}
                                        onChange={(e) => onSetDraftDates(previous => ({ ...previous, startDate: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.dateField}>
                                    <label className={styles.dateFieldLabel}>Expiry Date</label>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={draftDates.expiryDate}
                                        onChange={(e) => onSetDraftDates(previous => ({ ...previous, expiryDate: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.dateField}>
                                    <label className={styles.dateFieldLabel}>
                                        Renewal Date
                                        <span className={styles.dateFieldOptional}> (optional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={draftDates.renewalDate}
                                        onChange={(e) => onSetDraftDates(previous => ({ ...previous, renewalDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <InfoField label="Issue Date">{formatDateOnly(subjectContext.startDate)}</InfoField>
                                <InfoField label="Expiry Date">{formatDateOnly(subjectContext.expiryDate)}</InfoField>
                                <InfoField label="Renewal Date">{formatDateOnly(subjectContext.renewalDate)}</InfoField>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
