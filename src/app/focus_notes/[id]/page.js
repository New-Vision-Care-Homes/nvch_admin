"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { focusNoteService } from "@/services/api/services/focusNoteService";
import { utcToFullDisplay } from "@/utils/timeHandling";
import { personName } from "@/utils/formatting";
import PageLayout from "@components/layout/PageLayout";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import ErrorState from "@components/UI/ErrorState";
import ActionMessage from "@components/UI/ActionMessage";
import {
	Undo2, Edit2, Save, X,
	User, Clock, FileText,
	CheckCircle2, AlertCircle, UserCheck,
} from "lucide-react";
import styles from "./focus_note_detail.module.css";


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const TZ = "America/Halifax";

const SHIFT_STATUS_CLASS = {
	scheduled: styles.statusScheduled,
	in_progress: styles.statusInProgress,
	completed: styles.statusCompleted,
	cancelled: styles.statusCancelled,
	missed: styles.statusMissed,
};

const ROLE_CLASS = {
	caregiver: styles.roleCaregiver,
	admin: styles.roleAdmin,
	supervisor: styles.roleSupervisor,
};

// ─────────────────────────────────────────────────────────────────────────────
// Page  —  /focus_notes/[id]
// `id` here is the focus note's own _id
// ─────────────────────────────────────────────────────────────────────────────
export default function FocusNoteDetailPage() {
	// `id` = the focus note _id passed in the URL
	const { id: focusNoteId } = useParams();
	const router = useRouter();
	const queryClient = useQueryClient();

	// ── Fetch single note by its own ID
	const { data: fetchedNote, isLoading, isFetching, error: fetchError } = useQuery({
		queryKey: ["focusNote", focusNoteId],
		queryFn: () => focusNoteService.getById(focusNoteId),
		enabled: !!focusNoteId,
	});

	const note = fetchedNote;

	// ── Edit state
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({
		opportunitiesConcerns: "",
		successes: "",
		generalNotes: "",
	});
	const [status, setStatus] = useState(null);

	const handleEdit = () => {
		setForm({
			opportunitiesConcerns: note.opportunitiesConcerns || "",
			successes: note.successes || "",
			generalNotes: note.generalNotes || "",
		});
		setStatus(null);
		setEditing(true);
	};

	const handleCancel = () => {
		setEditing(false);
		setStatus(null);
	};

	// ── Update mutation
	const updateMutation = useMutation({
		mutationFn: (data) => focusNoteService.update(focusNoteId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["focusNote", focusNoteId] });
			// Also invalidate the client's focus-notes list if it's cached
			queryClient.invalidateQueries({ queryKey: ["focusNotes"] });
			setEditing(false);
			setStatus({ variant: "success", text: "Focus note updated successfully." });
		},
		onError: (err) => {
			setStatus({
				variant: "error",
				text: err?.response?.data?.message || err?.response?.data?.error || "Failed to save changes.",
			});
		},
	});

	const handleSave = () => {
		updateMutation.mutate(form);
	};

	if (isLoading || (isFetching && !note) || fetchError || !note) {
		return (
			<PageLayout>
				<ErrorState
					isLoading={isLoading || isFetching}
					errorMessage={fetchError ? (fetchError?.response?.data?.message || "Failed to load focus note.") : (!note && !isLoading && !isFetching ? "Focus note not found." : null)}
				/>
			</PageLayout>
		);
	}

	const shiftStatus = note.shift?.status;
	const clientName = note.client ? `${note.client.firstName || ""} ${note.client.lastName || ""}`.trim() : null;
	const clientId = note.client?._id;

	return (
		<PageLayout>

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
							<span className={`${styles.statusBadge} ${SHIFT_STATUS_CLASS[shiftStatus] || ""}`}>
								{shiftStatus.replace(/_/g, " ")}
							</span>
						)}
					</div>
				</div>

				<div className={styles.headerActions}>
					<Button
						variant="secondary"
						icon={<Undo2 size={15} />}
						onClick={() => clientId ? router.push(`/clients/${clientId}`) : router.back()}
					>
						Back
					</Button>

					{!editing ? (
						<Button variant="primary" icon={<Edit2 size={15} />} onClick={handleEdit}>
							Update
						</Button>
					) : (
						<>
							<Button
								variant="secondary"
								icon={<X size={15} />}
								onClick={handleCancel}
								disabled={updateMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								variant="primary"
								icon={<Save size={15} />}
								onClick={handleSave}
								disabled={updateMutation.isPending}
							>
								{updateMutation.isPending ? "Saving…" : "Save Changes"}
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
										<span className={`${styles.statusBadge} ${SHIFT_STATUS_CLASS[shiftStatus] || ""}`}>
											{shiftStatus.replace(/_/g, " ")}
										</span>
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
									value={form.opportunitiesConcerns}
									onChange={(e) => setForm((f) => ({ ...f, opportunitiesConcerns: e.target.value }))}
									placeholder="Enter opportunities or concerns…"
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
									value={form.successes}
									onChange={(e) => setForm((f) => ({ ...f, successes: e.target.value }))}
									placeholder="Enter successes…"
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
									value={form.generalNotes}
									onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))}
									placeholder="Enter general notes…"
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

		</PageLayout>
	);
}
