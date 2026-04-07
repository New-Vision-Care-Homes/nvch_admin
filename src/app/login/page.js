"use client";
import React, { useState } from "react";
import Image from "next/image";
import styles from "./login_page.module.css";
import { useLogin } from "@/hooks/useLogin";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, EyeOff } from "lucide-react";
import logoImg from "@/assets/logo/nv.png";

const loginSchema = yup.object({
	email: yup
		.string()
		.email("Please enter a valid email address")
		.required("Email is required"),
	password: yup
		.string()
		.min(6, "Password must be at least 6 characters")
		.required("Password is required"),
});

export default function LoginPage() {
	const [showPassword, setShowPassword] = useState(false);

	const { loginCheck, isLoginPending, loginErrorMessage, isLoginError } = useLogin();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(loginSchema),
	});

	const onSubmit = (data) => {
		loginCheck({ email: data.email, password: data.password });
	};

	return (
		<div className={styles.page}>
			<div className={styles.card}>
				{/* Logo */}
				<div className={styles.logoArea}>
					<Image
						src={logoImg}
						alt="CareConnect Logo"
						width={140}
						height={48}
						priority
					/>
				</div>

				{/* Title */}
				<div className={styles.titleArea}>
					<h1>Welcome back</h1>
					<p>Sign in to your CareConnect portal</p>
				</div>

				{/* Error Banner */}
				{isLoginError && (
					<div className={styles.errorBanner} role="alert">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<span>{loginErrorMessage}</span>
					</div>
				)}

				{/* Form */}
				<form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
					{/* Email Field */}
					<div className={styles.field}>
						<label className={styles.label} htmlFor="login_email">
							Email address
						</label>
						<input
							className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
							type="email"
							id="login_email"
							placeholder="you@example.com"
							autoComplete="email"
							{...register("email")}
						/>
						{errors.email && (
							<span className={styles.fieldError}>{errors.email.message}</span>
						)}
					</div>

					{/* Password Field */}
					<div className={styles.field}>
						<label className={styles.label} htmlFor="login_password">
							Password
						</label>
						<div className={styles.passwordWrapper}>
							<input
								className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
								type={showPassword ? "text" : "password"}
								id="login_password"
								placeholder="Enter your password"
								autoComplete="current-password"
								{...register("password")}
							/>
							<button
								type="button"
								className={styles.eyeToggle}
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword
									? <EyeOff size={18} strokeWidth={1.75} />
									: <Eye size={18} strokeWidth={1.75} />}
							</button>
						</div>
						{errors.password && (
							<span className={styles.fieldError}>{errors.password.message}</span>
						)}
					</div>

					{/* Forgot Password */}
					<div className={styles.forgotRow}>
						<Link href="/forget_password" className={styles.forgotLink}>
							Forgot password?
						</Link>
					</div>

					{/* Submit */}
					<button
						type="submit"
						className={styles.submitBtn}
						disabled={isLoginPending}
					>
						{isLoginPending ? (
							<>
								<span className={styles.spinner} />
								Logging in…
							</>
						) : (
							"Sign in"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
