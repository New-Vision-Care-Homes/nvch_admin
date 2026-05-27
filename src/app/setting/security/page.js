"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Shield, Lock, CheckCircle2, XCircle } from "lucide-react";
import Button from "@components/UI/Button";
import { InputField } from "@components/UI/Card";
import ActionMessage from "@components/UI/ActionMessage";
import { passwordRule } from "@/utils/validation";
import { useProfile } from "@/hooks/useProfile";
import styles from "./stub.module.css";

const schema = yup.object({
	currentPassword: yup.string().trim().required("Current password is required."),
	newPassword: passwordRule,
	confirmPassword: yup
		.string()
		.required("Please confirm your new password.")
		.oneOf([yup.ref("newPassword")], "Passwords do not match."),
});

const PASSWORD_REQUIREMENTS = [
	{ key: "minLength",   label: "At least 8 characters",                         test: (v) => v.length >= 8 },
	{ key: "hasUpper",    label: "At least one uppercase letter (A–Z)",            test: (v) => /[A-Z]/.test(v) },
	{ key: "hasLower",    label: "At least one lowercase letter (a–z)",            test: (v) => /[a-z]/.test(v) },
	{ key: "hasNumber",   label: "At least one number (0–9)",                      test: (v) => /[0-9]/.test(v) },
	{ key: "hasSpecial",  label: "At least one special character (@ $ ! % * ? &)", test: (v) => /[@$!%*?&]/.test(v) },
	{ key: "onlyAllowed", label: "Only letters, numbers, and @ $ ! % * ? &",      test: (v) => /^[A-Za-z0-9@$!%*?&]+$/.test(v) },
];

export default function SecurityPage() {
	const { changePassword, isChangePasswordPending, changePasswordError } = useProfile();
	const [successMsg, setSuccessMsg] = useState("");

	const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
		resolver: yupResolver(schema),
		mode: "onChange",
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
	});

	const newPasswordValue = watch("newPassword") || "";

	const onSubmit = (data) => {
		setSuccessMsg("");
		changePassword(
			{ password: data.currentPassword, newPassword: data.newPassword },
			{
				onSuccess: () => {
					setSuccessMsg("Password changed successfully.");
					reset();
				},
			}
		);
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Shield size={28} className={styles.icon} />
				<h1 className={styles.title}>Security</h1>
			</div>
			<p className={styles.description}>
				Update your password to keep your account secure.
			</p>

			<div className={styles.card}>
				<div className={styles.cardHeader}>
					<Lock size={17} className={styles.cardHeaderIcon} />
					<span className={styles.cardHeaderTitle}>Change Password</span>
				</div>

				<ActionMessage variant="success" message={successMsg} onClose={() => setSuccessMsg("")} />
				<ActionMessage variant="error" message={changePasswordError} />

				<form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
					<InputField
						label="Current Password"
						name="currentPassword"
						type="password"
						register={register}
						error={errors.currentPassword}
						placeholder="Enter your current password"
						autoComplete="current-password"
						required
					/>

					<div>
						<InputField
							label="New Password"
							name="newPassword"
							type="password"
							register={register}
							error={errors.newPassword}
							placeholder="Enter new password"
							autoComplete="new-password"
							required
						/>
						{newPasswordValue.length > 0 && (
							<div className={styles.reqList}>
								{PASSWORD_REQUIREMENTS.map(({ key, label, test }) => {
									const passed = test(newPasswordValue);
									return (
										<div key={key} className={`${styles.reqItem} ${passed ? styles.reqPassed : styles.reqFailed}`}>
											{passed
												? <CheckCircle2 size={13} className={styles.reqIcon} />
												: <XCircle size={13} className={styles.reqIcon} />
											}
											<span>{label}</span>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<InputField
						label="Confirm New Password"
						name="confirmPassword"
						type="password"
						register={register}
						error={errors.confirmPassword}
						placeholder="Re-enter new password"
						autoComplete="new-password"
						required
					/>

					<div className={styles.formFooter}>
						<Button type="submit" variant="primary" disabled={isChangePasswordPending}>
							{isChangePasswordPending ? "Updating…" : "Update Password"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
