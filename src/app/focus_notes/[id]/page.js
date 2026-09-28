"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useParams } from "next/navigation";
import { useFocusNotes } from "@/hooks/useFocusNotes";
import { useRouteDirty } from "@/context/RouteDirtyContext";
import { longTextRule } from "@/utils/validation";
import { utcToFullDisplay } from "@/utils/timeHandling";
import { personName } from "@/utils/formatting";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Form/Card";
import Button from "@components/UI/Button/Button";
import ErrorState from "@components/UI/Feedback/ErrorState";
import ActionMessage from "@components/UI/Feedback/ActionMessage";
import StatusBadge from "@components/UI/Feedback/Badge";
import { SHIFT_STATUS_TONE } from "@/utils/shiftStatus";
import {
	Edit2, Save, X,
	User, Clock, FileText,
	CheckCircle2, AlertCircle, UserCheck,
} from "lucide-react";
import styles from "./focus_note_detail.module.css";


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const TZ = "America/Halifax";

const ROLE_CLASS = {
	caregiver: styles.roleCaregiver,
	admin: styles.roleAdmin,
	supervisor: styles.roleSupervisor,
};

// ── Validation schema ──────────────────────────────────────────────────────────
const schema = yup.object({
	opportunitiesConcerns: longTextRule,
	successes:             longTextRule,
	generalNotes:          longTextRule,
});

const cleanFetchedData = (note) => ({
	opportunitiesConcerns: note?.opportunitiesConcerns || "",
	successes:             note?.successes || "",
	generalNotes:          note?.generalNotes || "",
});

// ─────────────────────────────────────────────────────────────────────────────
// Page  —  /focus_notes/[id]
// `id` here is the focus note's own _id
// ─────────────────────────────────────────────────────────────────────────────
export default function FocusNoteDetailPage() {
	// `id` = the focus note _id passed in the URL
	const { id: focusNoteId } = useParams();

	// ── Fetch single note by its own ID
	const {
		focusNote: note,
		isNoteLoading: isLoading,
		noteError: fetchError,
		updateFocusNote,
		isUpdatePending,
	} = useFocusNotes({ focusNoteId });

	// ── Edit state
	const [isInitialized, setIsInitialized] = useState(false);
	const [editing, setEditing] = useState(false);
	const [status, setStatus] = useState(null);

	const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: cleanFetchedData(null),
	});

	// Reported into RouteDirtyContext so the sidebar nav warns before
	// discarding an in-progress edit. There's no in-page "Back" link here —
	// the sidebar is the only way to leave, so this is the only guard needed.
	const { setIsDirty } = useRouteDirty();
	useEffect(() => {
		setIsDirty(isDirty);
	}, [isDirty, setIsDirty]);

	useEffect(() => {
		if (note && !isInitialized) {
			reset(cleanFetchedData(note));
			setIsInitialized(true);
		}
	}, [note, reset, isInitialized]);

	const handleEdit = () => {
		setStatus(null);
		setEditing(true);
	};

	const handleCancel = () => {
		reset(cleanFetchedData(note));
		setEditing(false);
		setStatus(null);
	};

	const onSubmit = (data) => {
		updateFocusNote(
			{ id: focusNoteId, data },
			{
				onSuccess: () => {
					setEditing(false);
					setIsInitialized(false);
					setStatus({ variant: "success", text: "Focus note updated successfully." });
				},
				onError: (err) => {
					setStatus({
						variant: "error",
						text: err?.response?.data?.message || err?.response?.data?.error || "Failed to save changes.",
					});
				},
			}
		);
	};

	if (isLoading || fetchError || !note) {
		return (
			<PageLayout>
				<ErrorState
					isLoading={isLoading}
					errorMessage={fetchError || (!note && !isLoading ? "Focus note not found." : null)}
				/>
			</PageLayout>
		);
	}

	const shiftStatus = note.shift?.status;
	const clientName = note.client ? `${note.client.firstName || ""} ${note.client.lastName || ""}`.trim() : null;

	return (
		<PageLayout>
			<form onSubmit={handleSubmit(onSubmit)}>

				{/* ═══════ PAGE HEADER */}
				<div className={styles.pageHeader}>
					<div className={styles.headerLeft}>
						<div className={styles.eyebrow}>
							<FileText size={13} className={styles.headerIcon} />
							<span className={styles.headerLabel}>Focus Note</span>
						</div>
						<h1 className={styles.clientTitle}>{clientName || "Unknown Client"}</h1>
						<div className={styles.metaRow}>
							{note.client?.clientId && (
								<span className={styles.clientIdPill}>{note.client.clientId}</span>
							)}
							{shiftStatus && (
								<StatusBadge
									label={shiftStatus.replace(/_/g, " ")}
									tone={SHIFT_STATUS_TONE[shiftStatus] || "neutral"}
									size="detail"
								/>
							)}
						</div>
					</div>

					<div className={styles.headerActions}>
						{!editing ? (
							<Button variant="primary" icon={<Edit2 size={15} />} type="button" onClick={handleEdit}>
								Update
							</Button>
						) : (
							<>
								<Button
									variant="secondary"
									icon={<X size={15} />}
									type="button"
									onClick={handleCancel}
									disabled={isUpdatePending}
								>
									Cancel
								</Button>
								<Button
									variant="primary"
									icon={<Save size={15} />}
									type="submit"
									disabled={isUpdatePending}
								>
									{isUpdatePending ? "Saving…" : "Save Changes"}
								</Button>
							</>
						)}
					</div>
				</div>

				{/* Status message */}
				{status && (
					<div className={styles.statusWrap}>
						<ActionMessage variant={status.variant} message={status.text} />
					</div>
				)}

				{/* Edit mode banner */}
				{editing && (
					<div className={styles.editBanner}>
						<Edit2 size={14} />
						You are editing this focus note. Only the three text fields below are editable.
					</div>
				)}

				{/* ═══════ MAIN CONTENT */}
				<div className={styles.mainGrid}>

					{/* ── LEFT: Immutable metadata */}
					<div className={styles.colLeft}>

						{/* Created By */}
						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><UserCheck size={15} /> Created By</span>
							</CardHeader>
							<CardContent>
								<div className={styles.metaGrid}>
									<InfoField label="Name" value={personName(note.createdBy)} />
									<InfoField label="Email" value={note.createdBy?.email || "—"} />
									<InfoField label="Role">
										<span className={`${styles.roleBadge} ${ROLE_CLASS[note.createdByRole] || styles.roleDefault}`}>
											{note.createdByRole || "—"}
										</span>
									</InfoField>
									<InfoField label="Created At">
										<p className={styles.boldVal}>
											{note.createdAt ? utcToFullDisplay(note.createdAt, TZ) : "—"}
										</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</InfoField>
								</div>
							</CardContent>
						</Card>

						{/* Last Edited By */}
						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><User size={15} /> Last Edited By</span>
							</CardHeader>
							<CardContent>
								{note.updatedBy ? (
									<div className={styles.metaGrid}>
										<InfoField label="Name" value={personName(note.updatedBy)} />
										<InfoField label="Role">
											<span className={`${styles.roleBadge} ${ROLE_CLASS[note.updatedByRole] || styles.roleDefault}`}>
												{note.updatedByRole || "admin"}
											</span>
										</InfoField>
										<InfoField label="Updated At">
											<p className={styles.boldVal}>
												{note.updatedAt ? utcToFullDisplay(note.updatedAt, TZ) : "—"}
											</p>
											<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
										</InfoField>
									</div>
								) : (
									<p className={styles.emptyText}>Not yet edited after creation.</p>
								)}
							</CardContent>
						</Card>

						{/* Shift Info */}
						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><Clock size={15} /> Shift</span>
							</CardHeader>
							<CardContent>
								<div className={styles.metaGrid}>
									<InfoField label="Start Time">
										<p className={styles.boldVal}>
											{note.shift?.startTime ? utcToFullDisplay(note.shift.startTime, TZ) : "—"}
										</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</InfoField>
									<InfoField label="End Time">
										<p className={styles.boldVal}>
											{note.shift?.endTime ? utcToFullDisplay(note.shift.endTime, TZ) : "—"}
										</p>
										<p className={styles.tzNote}>Atlantic Time (Halifax)</p>
									</InfoField>
									<InfoField label="Shift Status">
										{shiftStatus ? (
											<StatusBadge
												label={shiftStatus.replace(/_/g, " ")}
												tone={SHIFT_STATUS_TONE[shiftStatus] || "neutral"}
												size="detail"
											/>
										) : "—"}
									</InfoField>
									<InfoField label="Shift ID" value={note.shift?._id || "—"} />
								</div>
							</CardContent>
						</Card>

					</div>

					{/* ── RIGHT: Editable content sections */}
					<div className={styles.colRight}>

						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><AlertCircle size={15} /> Opportunities &amp; Concerns</span>
							</CardHeader>
							<CardContent>
								{editing ? (
									<textarea
										className={styles.textarea}
										rows={6}
										placeholder="Enter opportunities or concerns…"
										{...register("opportunitiesConcerns")}
									/>
								) : (
									<p className={`${styles.noteText} ${!note.opportunitiesConcerns ? styles.emptyText : ""}`}>
										{note.opportunitiesConcerns || "Nothing recorded."}
									</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><CheckCircle2 size={15} /> Successes</span>
							</CardHeader>
							<CardContent>
								{editing ? (
									<textarea
										className={styles.textarea}
										rows={6}
										placeholder="Enter successes…"
										{...register("successes")}
									/>
								) : (
									<p className={`${styles.noteText} ${!note.successes ? styles.emptyText : ""}`}>
										{note.successes || "Nothing recorded."}
									</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<span className={styles.cardTitle}><FileText size={15} /> General Notes</span>
							</CardHeader>
							<CardContent>
								{editing ? (
									<textarea
										className={styles.textarea}
										rows={6}
										placeholder="Enter general notes…"
										{...register("generalNotes")}
									/>
								) : (
									<p className={`${styles.noteText} ${!note.generalNotes ? styles.emptyText : ""}`}>
										{note.generalNotes || "Nothing recorded."}
									</p>
								)}
							</CardContent>
						</Card>

					</div>
				</div>

			</form>

		</PageLayout>
	);
}
