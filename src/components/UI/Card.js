"use client";
// components/ui/Card.js
import React, { useState, useRef } from "react";
import { Eye, EyeOff, Calendar } from "lucide-react";
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./Card.module.css";

const parseDateString = (str, isDateTime) => {
	if (!str) return null;
	if (isDateTime) {
		const parsed = new Date(str);
		return isNaN(parsed) ? null : parsed;
	}
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

// ── DatePickerField ───────────────────────────────────────────────────────────
// A standalone sub-component for the date picker so it can hold its own ref.
// The ref lets the Calendar icon button programmatically open/close the picker.
// We also pass showIcon={false} to prevent react-datepicker from rendering its
// own default calendar icon inside the popup (which caused the "mystery icon").
// ─────────────────────────────────────────────────────────────────────────────
function DatePickerField({ control, name, error, placeholder, showTime }) {
	// This ref gives us direct access to the DatePicker instance so we can
	// call .setOpen(true) when the user clicks the calendar icon button.
	const datePickerRef = useRef(null);

	return (
		<div className={styles.dateWrapper}>
			<Controller
				control={control}
				name={name}
				render={({ field }) => (
					<DatePicker
						ref={datePickerRef}
						selected={parseDateString(field.value, showTime)}
						onChange={(date) => {
							if (date) {
								const y = date.getFullYear();
								const m = String(date.getMonth() + 1).padStart(2, "0");
								const d = String(date.getDate()).padStart(2, "0");
								if (showTime) {
									const H = String(date.getHours()).padStart(2, "0");
									const M = String(date.getMinutes()).padStart(2, "0");
									field.onChange(`${y}-${m}-${d}T${H}:${M}`);
								} else {
									field.onChange(`${y}-${m}-${d}`);
								}
							} else {
								field.onChange("");
							}
						}}
						dateFormat={showTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd"}
						showTimeSelect={showTime}
						timeFormat="HH:mm"
						timeIntervals={15}
						showYearDropdown
						scrollableYearDropdown
						yearDropdownItemNumber={100}
						portalId="root-portal"
						showIcon={false}  // hide react-datepicker's own built-in icon
						className={`${styles.input} ${error ? styles.input_error : ""}`}
						placeholderText={placeholder || (showTime ? "YYYY-MM-DD HH:MM" : "YYYY-MM-DD")}
					/>
				)}
			/>

			{/* Calendar icon button — clicking it opens the date picker */}
			<button
				type="button"
				className={styles.dateIconBtn}
				tabIndex={-1}
				onClick={() => datePickerRef.current?.setOpen(true)}
			>
				<Calendar size={18} />
			</button>
		</div>
	);
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
	) : (type === "date" || type === "datetime-local") && control ? (
				<DatePickerField
					control={control}
					name={name}
					error={error}
					placeholder={placeholder}
					showTime={type === "datetime-local"}
				/>
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
			) : type === "phone" ? (
				<input
					type="text"
					{...register(name)}
					{...rest}
					className={`${styles.input} ${error ? styles.input_error : ""}`}
					placeholder={placeholder || "(XXX) XXX-XXXX"}
					maxLength={14}
					autoComplete="off"
					onInput={(e) => {
						let val = e.target.value.replace(/\D/g, '');
						if (val.length > 10) val = val.substring(0, 10);
						
						let formatted = val;
						if (val.length > 6) {
							formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
						} else if (val.length > 3) {
							formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
						} else if (val.length > 0) {
							formatted = `(${val}`;
						}
						e.target.value = formatted;
					}}
				/>
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
			) : type === "phone" ? (
				<input 
					type="text" 
					{...inputProps} 
					{...rest} 
					className={`${styles.input} ${error ? styles.input_error : ""}`} 
					placeholder={placeholder || "(XXX) XXX-XXXX"} 
					maxLength={14}
					autoComplete="off"
					onInput={(e) => {
						let val = e.target.value.replace(/\D/g, '');
						if (val.length > 10) val = val.substring(0, 10);
						
						let formatted = val;
						if (val.length > 6) {
							formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
						} else if (val.length > 3) {
							formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
						} else if (val.length > 0) {
							formatted = `(${val}`;
						}
						e.target.value = formatted;
					}}
				/>
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
