import React, { useEffect, useMemo } from "react";
import Modal from "@components/UI/Modal/Modal";
import Button from "@components/UI/Button/Button";
import { InputField } from "@components/UI/Form/Card";
import styles from "@components/UI/Modal/UploadModal.module.css";
import headerStyles from "./AllowableHoursModal.module.css";
import { Paperclip, X, AlarmClockCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useClients } from "@/hooks/useClients";

/**
 * Mirrors the backend's ALLOWABLE_HOURS_REQUIRED / ALLOWABLE_HOURS_NOT_ALLOWED
 * rule: a positive value requires an ILS/IF home; 0/unset requires any other
 * home. The compatibility check only applies once the client actually has a
 * home on file — with no home yet, the backend accepts any 0-168 value (this
 * is the normal path for setting hours before assigning an ILS/IF home, so
 * the two steps don't deadlock each other).
 */
function buildSchema({ hasHome, isIlsOrIfHome }) {
	const requiresPositiveHours = hasHome && isIlsOrIfHome;
	return yup.object({
		allowableHours: yup
			.number()
			.typeError("Please enter a valid number")
			.integer("Hours must be a whole number")
			.min(0, "Hours must be between 0 and 168")
			.max(168, "Hours must be between 0 and 168")
			.required("Allowable hours is required")
			.test(
				"home-type-compatibility",
				requiresPositiveHours
					? "This client's home requires a positive value — 0 isn't allowed here. To set hours to 0, first move the client off this home from the Info tab, then update hours here."
					: "This client's current home doesn't support a positive value — it must be 0.",
				(value) => {
					if (value == null || !hasHome) return true;
					return requiresPositiveHours ? value > 0 : value === 0;
				}
			),
		reason: yup
			.string()
			.trim()
			.max(2000, "Reason cannot exceed 2000 characters")
			.required("Reason is required"),
		file: yup.mixed()
			.test("required", "Please upload a supporting document", (value) => {
				return value && value.length > 0;
			})
			.test("fileSize", "File size is too large (max 5MB)", (value) => {
				if (!value || value.length === 0) return true;
				return value[0].size <= 5 * 1024 * 1024; // 5MB limit
			})
			.test("fileType", "Unsupported file type. Use PDF, JPG, or PNG.", (value) => {
				if (!value || value.length === 0) return true;
				const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
				return allowedTypes.includes(value[0].type);
			}),
	});
}

/**
 * Allowable Hours change modal.
 * Updating a client's weekly allowable hours requires a reason and a
 * supporting document (e.g. an updated care plan) — the backend records
 * both on the change and notifies admins holding the allowable-hours
 * notification permission. Neither the reason nor the document is stored
 * for later retrieval; they only populate that notification.
 * @param {boolean} isOpen - Determines if the modal should be visible.
 * @param {function} onClose - Function to call when the modal is closed.
 * @param {string} clientId - The ID of the client whose hours are changing.
 * @param {number|null} currentHours - The client's current allowable hours, used as the form default.
 * @param {boolean} hasHome - Whether the client currently has a home assigned at all.
 * @param {string|null} homeType - The client's current home type (e.g. "ILS", "IF"), if any.
 * @param {function} onSuccess - Optional callback executed after a successful update.
 */
export default function AllowableHoursModal({ isOpen, onClose, clientId, currentHours, hasHome, homeType, onSuccess }) {
	const { updateAllowableHours, isActionPending, actionError } = useClients(clientId);

	const isIlsOrIfHome = homeType === "ILS" || homeType === "IF";
	const schema = useMemo(() => buildSchema({ hasHome, isIlsOrIfHome }), [hasHome, isIlsOrIfHome]);

	const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
		resolver: yupResolver(schema),
		defaultValues: { allowableHours: currentHours ?? 0, reason: "" },
	});

	const selectedFile = watch("file");

	useEffect(() => {
		if (isOpen) {
			reset({ allowableHours: currentHours ?? 0, reason: "" });
		}
	}, [isOpen, currentHours, reset]);

	const handleSave = (formData) => {
		updateAllowableHours(
			{ id: clientId, allowableHours: formData.allowableHours, reason: formData.reason, file: formData.file[0] },
			{
				onSuccess: () => {
					if (onSuccess) onSuccess();
					onClose();
					reset();
				},
			}
		);
	};

	return (
		<Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }}>
			<div className={headerStyles.modalHeader}>
				<span className={headerStyles.modalIcon}>
					<AlarmClockCheck size={18} strokeWidth={1.75} />
				</span>
				<div>
					<h2 className={headerStyles.modalTitle}>Update Allowable Hours</h2>
					<p className={headerStyles.modalSubtitle}>Changes require a reason and a supporting document.</p>
				</div>
			</div>

			<form onSubmit={handleSubmit(handleSave)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
				<InputField
					label="Allowable Hours (per week)"
					type="number"
					name="allowableHours"
					min="0"
					max="168"
					step="1"
					register={register}
					error={errors.allowableHours}
					required
				/>

				<InputField
					label="Reason for Change"
					type="textarea"
					name="reason"
					rows={4}
					placeholder="e.g. Care coordinator increased approved hours per updated care plan."
					register={register}
					error={errors.reason}
					required
				/>

				<div className={styles.uploadField}>
					<label className={headerStyles.fieldLabel}>
						Supporting Document
						<span className={headerStyles.requiredStar}>*</span>
					</label>
					<p className={styles.fileNote} style={{ marginTop: '-0.1rem', marginBottom: '0.5rem' }}>
						e.g. an updated care plan from the Care Coordinator, IPSC, EFAC, etc.
					</p>
					<div className={`${styles.dropzone} ${errors.file ? styles.errorBorder : ""}`}>
						<input
							type="file"
							id="allowableHoursSupportFile"
							{...register("file")}
							className={styles.hiddenInput}
						/>
						<label htmlFor="allowableHoursSupportFile" className={styles.uploadTrigger}>
							<Paperclip size={18} />
							<span>{selectedFile?.[0] ? selectedFile[0].name : "Click to select a file (PDF, JPG...)"}</span>

							{selectedFile?.[0] && (
								<X size={16} className={styles.clearFile} onClick={(e) => {
									e.preventDefault();
									setValue("file", null);
								}} />
							)}
						</label>
					</div>
					{errors.file && <p className={styles.errorMessage}>{errors.file.message}</p>}

					<p className={styles.fileNote} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
						Max 5MB. Supported formats: PDF, JPG, PNG.
					</p>
				</div>

				{actionError && <p className={styles.errorMessage}>{actionError}</p>}

				<div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
					<Button variant="secondary" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
					<Button type="submit" disabled={isActionPending}>
						{isActionPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
