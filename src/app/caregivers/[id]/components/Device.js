"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Smartphone, ShieldOff, LogOut, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import ActionMessage from "@components/UI/ActionMessage";
import ErrorState from "@components/UI/ErrorState";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useProfile } from "@/hooks/useProfile";
import { canManageTarget } from "@/utils/permissions";
import { formatDateTime } from "@/utils/dates";
import styles from "./Device.module.css";

export default function Device() {
	const { id: userId } = useParams();
	const router = useRouter();

	const {
		caregiverDetail,
		isCaregiverLoading,
		caregiverFetchError,
		updateAppDevice,
		isAppDeviceActionPending,
		refetchDetail,
	} = useCaregivers(userId);

	const { profile } = useProfile();
	const canManageDevice = canManageTarget(
		profile,
		caregiverDetail,
		"manage_all_caregiver_devices",
		"manage_assigned_caregiver_devices"
	);

	const [confirmAction, setConfirmAction] = useState(null); // "revoke_session" | "clear" | null
	const [actionMsg, setActionMsg] = useState(null);

	const appDevice = caregiverDetail?.appDevice ?? null;

	const closeConfirm = () => setConfirmAction(null);

	const runAction = (action) => {
		updateAppDevice(
			{ id: userId, data: { action } },
			{
				onSuccess: async (data) => {
					await refetchDetail();
					closeConfirm();
					setActionMsg({
						variant: "success",
						text: data?.message ||
							(action === "clear"
								? "Device binding cleared. The next sign-in will register a new device."
								: "Session revoked. The device remains bound."),
					});
				},
				onError: (err) => {
					setActionMsg({
						variant: "error",
						text: err?.response?.data?.error || err.message || "Failed to update device.",
					});
				},
			}
		);
	};

	if (isCaregiverLoading || caregiverFetchError || !caregiverDetail) {
		return <ErrorState isLoading={isCaregiverLoading} errorMessage={caregiverFetchError} />;
	}

	return (
		<div className={styles.container}>
			{actionMsg && (
				<div className={styles.actionMsg}>
					<ActionMessage variant={actionMsg.variant} message={actionMsg.text} onClose={() => setActionMsg(null)} />
				</div>
			)}

			<Card>
				<CardHeader
					actions={
						appDevice && canManageDevice ? (
							<div className={styles.headerActions}>
								{appDevice.hasActiveSession && (
									<Button
										variant="dangerLight"
										icon={<LogOut size={15} />}
										onClick={() => setConfirmAction("revoke_session")}
									>
										Revoke Session
									</Button>
								)}
								<Button
									variant="danger"
									icon={<ShieldOff size={15} />}
									onClick={() => setConfirmAction("clear")}
								>
									Unbind Device
								</Button>
							</div>
						) : null
					}
				>
					Mobile Device
				</CardHeader>
				<CardContent>
					{!appDevice ? (
						<div className={styles.emptyState}>
							<Smartphone size={28} className={styles.emptyIcon} />
							<div>
								<div className={styles.emptyTitle}>Not enrolled</div>
								<div className={styles.emptyDesc}>
									This caregiver has not signed in to the app yet. No mobile device is currently bound to
									their account — their next sign-in will enroll whatever device it comes from.
								</div>
							</div>
						</div>
					) : (
						<>
							<div className={styles.deviceGrid}>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Device</span>
									<span className={styles.fieldValue}>{appDevice.label || "—"}</span>
								</div>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Platform</span>
									<span className={styles.fieldValue}>{appDevice.platform || "—"}</span>
								</div>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Device ID</span>
									<span className={styles.fieldValue}>
										•••• {appDevice.deviceIdSuffix || "—"}
									</span>
								</div>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Session</span>
									<span className={`${styles.statusPill} ${appDevice.hasActiveSession ? styles.statusActive : styles.statusInactive}`}>
										{appDevice.hasActiveSession ? "Active" : "Signed out"}
									</span>
								</div>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Bound At</span>
									<span className={styles.fieldValue}>{formatDateTime(appDevice.boundAt)}</span>
								</div>
								<div className={styles.field}>
									<span className={styles.fieldLabel}>Last Seen</span>
									<span className={styles.fieldValue}>
										{appDevice.lastSeenAt ? formatDateTime(appDevice.lastSeenAt) : "Never signed in"}
									</span>
								</div>
							</div>

							{appDevice.pendingChange && (
								<button
									type="button"
									className={styles.pendingBanner}
									onClick={() => router.push(`/approvals/${appDevice.pendingChange.approvalId}`)}
								>
									<Clock size={15} />
									<span>
										There is an open device-change request pending review
										{appDevice.pendingChange.requestedAt
											? ` (requested ${formatDateTime(appDevice.pendingChange.requestedAt)})`
											: ""}.
									</span>
									<span className={styles.pendingBannerLink}>
										View Device Change Request <ExternalLink size={13} />
									</span>
								</button>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Revoke Session confirmation */}
			<Modal isOpen={confirmAction === "revoke_session"} onClose={closeConfirm}>
				<div className={styles.modalContent}>
					<div className={styles.modalIconWarning}>
						<LogOut size={26} strokeWidth={1.5} />
					</div>
					<h2>Revoke Session?</h2>
					<p className={styles.modalDesc}>
						This ends the caregiver&apos;s current mobile app session. The device stays bound — they can
						sign in again on the same phone with no approval needed.
					</p>
					<div className={styles.modalButtons}>
						<Button variant="dangerLight" disabled={isAppDeviceActionPending} onClick={() => runAction("revoke_session")}>
							{isAppDeviceActionPending ? "Revoking…" : "Revoke Session"}
						</Button>
						<Button variant="secondary" disabled={isAppDeviceActionPending} onClick={closeConfirm}>Cancel</Button>
					</div>
				</div>
			</Modal>

			{/* Unbind Device confirmation */}
			<Modal isOpen={confirmAction === "clear"} onClose={closeConfirm}>
				<div className={styles.modalContent}>
					<div className={styles.modalIconDanger}>
						<AlertTriangle size={26} strokeWidth={1.5} />
					</div>
					<h2>Unbind Device?</h2>
					<p className={styles.modalDesc}>
						This removes the device binding entirely, ends the active session, and cancels any open
						device-change request. The caregiver&apos;s next sign-in will enroll a new device — this is
						different from Revoke Session, which keeps the current device bound.
					</p>
					<div className={styles.modalButtons}>
						<Button variant="danger" disabled={isAppDeviceActionPending} onClick={() => runAction("clear")}>
							{isAppDeviceActionPending ? "Unbinding…" : "Unbind Device"}
						</Button>
						<Button variant="secondary" disabled={isAppDeviceActionPending} onClick={closeConfirm}>Cancel</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
