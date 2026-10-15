"use client";

import PageLayout from "@components/layout/PageLayout";
import PageHeader from "@components/layout/PageHeader";
import Button from "@components/UI/Button/Button";
import { Card, CardHeader, CardContent } from "@components/UI/Form/Card";
import ErrorState from "@components/UI/Feedback/ErrorState";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDateTime } from "@/utils/dates";
import {
	Undo2, ArrowRight, TrendingUp, TrendingDown, Minus,
	User, Home, Clock, FileText, ImageIcon, ExternalLink, ShieldAlert,
} from "lucide-react";
import styles from "./notification_detail.module.css";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

/** 0/null is "unset" for allowable hours, same convention as the client profile. */
function hoursLabel(hours) {
	return hours == null || hours === 0 ? "Unset" : hours;
}

function TrendIcon({ previousHours, newHours }) {
	const prev = previousHours ?? 0;
	const next = newHours ?? 0;
	if (next > prev) return <TrendingUp size={18} className={styles.trendUp} />;
	if (next < prev) return <TrendingDown size={18} className={styles.trendDown} />;
	return <Minus size={18} className={styles.trendFlat} />;
}

export default function Page() {
	const { id } = useParams();

	const {
		notificationDetail,
		isNotificationsLoading,
		fetchNotificationError,
		documentUrl,
		isDocumentUrlLoading,
		documentUrlError,
	} = useNotifications(id);

	if (isNotificationsLoading || fetchNotificationError || !notificationDetail) {
		return (
			<PageLayout>
				<ErrorState
					isLoading={isNotificationsLoading}
					errorMessage={fetchNotificationError ?? (!notificationDetail ? "Notification not found." : null)}
				/>
			</PageLayout>
		);
	}

	const d = notificationDetail.data || {};
	const isImageDoc = d.document?.mimeType && IMAGE_MIME_TYPES.has(d.document.mimeType);

	return (
		<PageLayout>
			<PageHeader
				title="Allowable Hours Changed"
				actions={
					<Link href="/notification">
						<Button variant="secondary" icon={<Undo2 size={16} />}>Back</Button>
					</Link>
				}
			/>

			<div className={styles.cardStack}>
				{/* Hero: the hours transition itself, front and center */}
				<Card>
					<CardContent>
						<div className={styles.reviewNotice}>
							<ShieldAlert size={16} />
							<span>
								Please review whether the supporting document supports this allowable hours
								change, and contact {d.changedByName || "the admin who made the change"} if
								anything looks wrong.
							</span>
						</div>

						<div className={styles.hoursRow}>
							<div className={styles.hoursBlock}>
								<span className={styles.hoursValue}>{hoursLabel(d.previousHours)}</span>
								<span className={styles.hoursCaption}>Previous</span>
							</div>
							<div className={styles.hoursArrow}>
								<TrendIcon previousHours={d.previousHours} newHours={d.newHours} />
								<ArrowRight size={20} />
							</div>
							<div className={styles.hoursBlock}>
								<span className={`${styles.hoursValue} ${styles.hoursValueNew}`}>{hoursLabel(d.newHours)}</span>
								<span className={styles.hoursCaption}>New · hrs / week</span>
							</div>
						</div>

						<div className={styles.heroMeta}>
							{d.clientId ? (
								<Link href={`/clients/${d.clientId}`} className={styles.clientChip}>
									<User size={14} />
									{d.clientName || "View client"}
									<ExternalLink size={12} />
								</Link>
							) : (
								<span className={styles.clientChip}>
									<User size={14} />
									{d.clientName || "—"}
								</span>
							)}
							{d.homeName && (
								<span className={styles.metaChip}>
									<Home size={14} />
									{d.homeName}
								</span>
							)}
							<span className={styles.metaText}>
								Changed by <strong>{d.changedByName || "—"}</strong>
							</span>
							<span className={styles.metaText}>
								<Clock size={13} />
								{formatDateTime(d.changedAt)}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Reason</CardHeader>
					<CardContent>
						<p className={styles.reasonBox}>{d.reason || "No reason provided."}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Supporting Document</CardHeader>
					<CardContent>
						{!d.document?.fileName ? (
							<p className={styles.docStatus}>No document attached.</p>
						) : isDocumentUrlLoading ? (
							<div className={styles.docSkeleton} />
						) : documentUrl ? (
							<a href={documentUrl} target="_blank" rel="noopener noreferrer" className={styles.docPreview}>
								{isImageDoc ? (
									// eslint-disable-next-line @next/next/no-img-element -- signed, short-lived S3 URL; next/image can't optimize it
									<img src={documentUrl} alt={d.document.fileName} className={styles.docThumb} />
								) : (
									<span className={styles.docIconBox}>
										<FileText size={22} />
									</span>
								)}
								<span className={styles.docInfo}>
									<span className={styles.docName}>{d.document.fileName}</span>
									<span className={styles.docOpenHint}>
										{isImageDoc ? <ImageIcon size={13} /> : <FileText size={13} />}
										Open in new tab
										<ExternalLink size={12} />
									</span>
								</span>
							</a>
						) : documentUrlError ? (
							<p className={styles.docStatus}>Unable to load the document link. Try reopening this notification.</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</PageLayout>
	);
}
