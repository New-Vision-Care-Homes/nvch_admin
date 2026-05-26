"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./forget_password_page.module.css";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, EyeOff, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import logoImg from "@/assets/logo/nv.png";
import { passwordRule } from "@/utils/validation";
import { useForgotPassword } from "@/hooks/useLogin";

const emailSchema = yup.object({
	email: yup
		.string()
		.trim()
		.email("Please enter a valid email address")
		.matches(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address")
		.required("Email is required"),
});

const resetSchema = yup.object({
	password: passwordRule,
	confirmPassword: yup
		.string()
		.oneOf([yup.ref("password")], "Passwords do not match")
		.required("Please confirm your password"),
});

function OtpInput({ value, onChange, hasError }) {
	const inputsRef = useRef([]);
	const digits = (value || "").split("").concat(Array(6).fill("")).slice(0, 6);

	const handleKeyDown = (e, idx) => {
		if (e.key === "Backspace") {
			if (digits[idx]) {
				const next = [...digits];
				next[idx] = "";
				onChange(next.join(""));
			} else if (idx > 0) {
				inputsRef.current[idx - 1]?.focus();
			}
		}
	};

	const handleChange = (e, idx) => {
		const val = e.target.value.replace(/\D/g, "").slice(-1);
		const next = [...digits];
		next[idx] = val;
		onChange(next.join(""));
		if (val && idx < 5) {
			inputsRef.current[idx + 1]?.focus();
		}
	};

	const handlePaste = (e) => {
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
		onChange(pasted);
		const focusIdx = Math.min(pasted.length, 5);
		inputsRef.current[focusIdx]?.focus();
		e.preventDefault();
	};

	return (
		<div className={styles.otpRow}>
			{digits.map((d, i) => (
				<input
					key={i}
					ref={(el) => (inputsRef.current[i] = el)}
					className={`${styles.otpBox} ${hasError ? styles.otpBoxError : ""}`}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={d}
					onChange={(e) => handleChange(e, i)}
					onKeyDown={(e) => handleKeyDown(e, i)}
					onPaste={i === 0 ? handlePaste : undefined}
					autoComplete="one-time-code"
					aria-label={`Digit ${i + 1}`}
				/>
			))}
		</div>
	);
}

export default function ForgetPasswordPage() {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [email, setEmail] = useState("");
	const [otpValue, setOtpValue] = useState("");
	const [otpTouched, setOtpTouched] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [resendSent, setResendSent] = useState(false);

	const {
		sendCode,
		isSendPending,
		sendError,
		isSendError,
		submitReset,
		isResetPending,
		resetError,
		isResetError,
	} = useForgotPassword();

	const emailForm = useForm({ resolver: yupResolver(emailSchema) });
	const resetForm = useForm({ resolver: yupResolver(resetSchema) });

	const onEmailSubmit = (data) => {
		sendCode(data.email, {
			onSuccess: () => {
				setEmail(data.email);
				setStep(2);
			},
		});
	};

	const onResetSubmit = (data) => {
		setOtpTouched(true);
		if (otpValue.length !== 6) return;
		submitReset(
			{ email, otp: otpValue, password: data.password },
			{ onSuccess: () => setStep(3) }
		);
	};

	const handleResend = () => {
		setResendSent(false);
		sendCode(email, {
			onSuccess: () => setResendSent(true),
		});
	};

	const otpInvalid = otpTouched && otpValue.length !== 6;

	/* ── Step 3: Success ─────────────────────────────────────── */
	if (step === 3) {
		return (
			<div className={styles.page}>
				<div className={styles.card}>
					<div className={styles.logoArea}>
						<Image src={logoImg} alt="CareConnect Logo" width={140} height={48} priority />
					</div>
					<div className={styles.successIcon}>
						<CheckCircle size={56} strokeWidth={1.4} />
					</div>
					<div className={styles.titleArea}>
						<h1>Password Reset!</h1>
						<p>Your password has been updated successfully. You can now sign in with your new credentials.</p>
					</div>
					<button className={styles.submitBtn} onClick={() => router.push("/")}>
						Back to Login
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.card}>
				{/* Logo */}
				<div className={styles.logoArea}>
					<Image src={logoImg} alt="CareConnect Logo" width={140} height={48} priority />
				</div>

				{/* ── Step 1: Email ─────────────────────────────────── */}
				{step === 1 && (
					<>
						<div className={styles.titleArea}>
							<h1>Forgot Password</h1>
							<p>Enter your email and we'll send a 6-digit verification code</p>
						</div>

						{isSendError && (
							<div className={styles.errorBanner} role="alert">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<span>{sendError}</span>
							</div>
						)}

						<form className={styles.form} onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate>
							<div className={styles.field}>
								<label className={styles.label} htmlFor="fp_email">Email address</label>
								<input
									className={`${styles.input} ${emailForm.formState.errors.email ? styles.inputError : ""}`}
									type="email"
									id="fp_email"
									placeholder="you@example.com"
									autoComplete="email"
									{...emailForm.register("email")}
								/>
								{emailForm.formState.errors.email && (
									<span className={styles.fieldError}>{emailForm.formState.errors.email.message}</span>
								)}
							</div>

							<button type="submit" className={styles.submitBtn} disabled={isSendPending}>
								{isSendPending ? (
									<><span className={styles.spinner} />Sending Code…</>
								) : (
									<><Mail size={16} strokeWidth={2} />Send Verification Code</>
								)}
							</button>
						</form>

						<div className={styles.backRow}>
							<Link href="/" className={styles.backLink}>
								<ArrowLeft size={14} strokeWidth={2} />
								Back to Login
							</Link>
						</div>
					</>
				)}

				{/* ── Step 2: OTP + New Password ────────────────────── */}
				{step === 2 && (
					<>
						<div className={styles.titleArea}>
							<h1>Reset Password</h1>
							<p>Enter the 6-digit code sent to</p>
							<span className={styles.emailChip}>{email}</span>
						</div>

						{isResetError && (
							<div className={styles.errorBanner} role="alert">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<span>{resetError}</span>
							</div>
						)}

						{resendSent && (
							<div className={styles.successBanner} role="status">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
								</svg>
								<span>New code sent — check your inbox.</span>
							</div>
						)}

						<form className={styles.form} onSubmit={resetForm.handleSubmit(onResetSubmit)} noValidate>
							{/* OTP */}
							<div className={styles.field}>
								<label className={styles.label}>Verification Code</label>
								<OtpInput value={otpValue} onChange={setOtpValue} hasError={otpInvalid} />
								{otpInvalid && (
									<span className={styles.fieldError}>Please enter all 6 digits</span>
								)}
							</div>

							{/* New Password */}
							<div className={styles.field}>
								<label className={styles.label} htmlFor="fp_password">New Password</label>
								<div className={styles.passwordWrapper}>
									<input
										className={`${styles.input} ${resetForm.formState.errors.password ? styles.inputError : ""}`}
										type={showPassword ? "text" : "password"}
										id="fp_password"
										placeholder="Create a new password"
										autoComplete="new-password"
										{...resetForm.register("password")}
									/>
									<button
										type="button"
										className={styles.eyeToggle}
										onClick={() => setShowPassword((v) => !v)}
										aria-label={showPassword ? "Hide password" : "Show password"}
									>
										{showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
									</button>
								</div>
								{resetForm.formState.errors.password && (
									<span className={styles.fieldError}>{resetForm.formState.errors.password.message}</span>
								)}
							</div>

							{/* Confirm Password */}
							<div className={styles.field}>
								<label className={styles.label} htmlFor="fp_confirm">Confirm Password</label>
								<div className={styles.passwordWrapper}>
									<input
										className={`${styles.input} ${resetForm.formState.errors.confirmPassword ? styles.inputError : ""}`}
										type={showConfirm ? "text" : "password"}
										id="fp_confirm"
										placeholder="Confirm your new password"
										autoComplete="new-password"
										{...resetForm.register("confirmPassword")}
									/>
									<button
										type="button"
										className={styles.eyeToggle}
										onClick={() => setShowConfirm((v) => !v)}
										aria-label={showConfirm ? "Hide password" : "Show password"}
									>
										{showConfirm ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
									</button>
								</div>
								{resetForm.formState.errors.confirmPassword && (
									<span className={styles.fieldError}>{resetForm.formState.errors.confirmPassword.message}</span>
								)}
							</div>

							<button type="submit" className={styles.submitBtn} disabled={isResetPending}>
								{isResetPending ? (
									<><span className={styles.spinner} />Resetting Password…</>
								) : (
									"Reset Password"
								)}
							</button>
						</form>

						<div className={styles.footerRow}>
							<button
								type="button"
								className={styles.resendBtn}
								onClick={handleResend}
								disabled={isSendPending}
							>
								{isSendPending ? "Sending…" : "Didn't receive a code? Resend"}
							</button>
							<Link href="/" className={styles.backLink}>
								<ArrowLeft size={14} strokeWidth={2} />
								Back to Login
							</Link>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
