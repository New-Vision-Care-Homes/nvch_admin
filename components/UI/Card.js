"use client";
// components/ui/Card.js
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Card.module.css";

export function Card({ children, className }) {
	return <div className={`${styles.card} ${className || ""}`}>{children}</div>;
}

export function CardHeader({ children, className }) {
	return (
		<div style={{
			width: "100%",
			marginBottom: "1.75rem",
			paddingBottom: "0.75rem",
			borderBottom: "2px solid rgba(28, 74, 110, 0.15)",
		}}>
			<h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "var(--color-primary)" }} className={className}>
				{children}
			</h2>
		</div>
	);
}

export function CardContent({ children, className }) {
	return <div className={`${styles.content} ${className || ""}`}>{children}</div>;
}

export function InputField({ label, name, register, type = "text", rows = 1, error, options = [], placeholder, ...rest }) {
	const [showPassword, setShowPassword] = useState(false);
	const isPasswordType = type === "password";
	const currentType = isPasswordType && showPassword ? "text" : type;

	return (
		<div className={styles.field}>
			<label className={styles.label}>{label}</label>

			{type === "textarea" ? (
				<textarea {...register(name)} {...rest} className={`${styles.input} ${error ? styles.input_error : ""}`} rows={rows} />
			) : type === "select" ? (
				<select {...register(name)} {...rest} className={`${styles.input} ${error ? styles.input_error : ""}`}>
					<option value="">Select...</option>
					{options.map(opt => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			) : isPasswordType ? (
				<div className={styles.passwordWrapper}>
					<input
						type={currentType}
						{...register(name)}
						{...rest}
						className={`${styles.input} ${error ? styles.input_error : ""}`}
						placeholder={placeholder}
						style={{ paddingRight: "35px" }}
					/>
					<button
						type="button"
						className={styles.passwordToggle}
						onClick={() => setShowPassword(!showPassword)}
						tabIndex={-1}
					>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			) : (
				<input
					type={type}
					{...register(name)}
					{...rest}
					className={`${styles.input} ${error ? styles.input_error : ""}`}
					placeholder={placeholder}
				/>
			)}

			{error && <p className={styles.error_text}>{error.message || error}</p>}
		</div>
	);
}


// left label, right input
export function InputFieldLR({ label, value, onChange, type = "input", rows = 1 }) {
	return (
		<div className={styles.field} style={{ flexDirection: "row" }}>
			<label className={styles.label}>{label}</label>

			{type === "textarea" ? (
				<textarea {...register(name)} className={`${styles.input} ${error ? styles.input_error : ""}`} rows={rows} />
			) : type === "select" ? (
				<select {...register(name)} className={`${styles.input} ${error ? styles.input_error : ""}`}>
					<option value="">Select...</option>
					{options.map(opt => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			) : (
				<input {...register(name)} className={`${styles.input} ${error ? styles.input_error : ""}`} />
			)}

			{error && <p className={styles.error_text}>{error.message}</p>}
		</div>
	);
}


export function InfoField({ label, value, children, className }) {
	return (
		<div className={`${styles.info_field} ${className || ""}`}>
			<div className={styles.info_label}>{label}</div>
			<div className={styles.info_value}>
				{children || value}
			</div>
		</div>
	);
}
