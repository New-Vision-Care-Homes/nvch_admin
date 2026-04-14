"use client";
// components/ui/Card.js
import React, { useState } from "react";
import { Eye, EyeOff, Calendar } from "lucide-react";
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./Card.module.css";

const parseDateString = (str) => {
	if (!str) return null;
	const parts = str.split('T')[0].split('-');
	if (parts.length === 3) {
		return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
	}
	return null;
};

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

export function InputField({ label, name, register, control, type = "text", rows = 1, error, options = [], placeholder, ...rest }) {
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
			) : type === "date" && control ? (
				<div className={styles.dateWrapper}>
					<Controller
						control={control}
						name={name}
						render={({ field }) => (
							<DatePicker
								selected={parseDateString(field.value)}
								onChange={(date) => {
									if (date) {
										const y = date.getFullYear();
										const m = String(date.getMonth() + 1).padStart(2, '0');
										const d = String(date.getDate()).padStart(2, '0');
										field.onChange(`${y}-${m}-${d}`);
									} else {
										field.onChange("");
									}
								}}
								dateFormat="yyyy-MM-dd"
								showYearDropdown
								scrollableYearDropdown
								yearDropdownItemNumber={100}
								portalId="root-portal"
								className={`${styles.input} ${error ? styles.input_error : ""}`}
								placeholderText={placeholder || "YYYY-MM-DD"}
							/>
						)}
					/>
					<Calendar className={styles.dateIcon} size={18} />
				</div>
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
export function InputFieldLR({ label, name, register, type = "text", rows = 1, error, options = [], value, onChange, placeholder, ...rest }) {
	const inputProps = register ? register(name) : { value, onChange };

	return (
		<div className={styles.field} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
			<label className={styles.label} style={{ marginBottom: 0, minWidth: "120px" }}>{label}</label>

			{type === "textarea" ? (
				<textarea {...inputProps} {...rest} className={`${styles.input} ${error ? styles.input_error : ""}`} rows={rows} placeholder={placeholder} />
			) : type === "select" ? (
				<select {...inputProps} {...rest} className={`${styles.input} ${error ? styles.input_error : ""}`}>
					<option value="">Select...</option>
					{options.map(opt => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			) : (
				<input type={type} {...inputProps} {...rest} className={`${styles.input} ${error ? styles.input_error : ""}`} placeholder={placeholder} />
			)}

			{error && <p className={styles.error_text}>{error.message || error}</p>}
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
