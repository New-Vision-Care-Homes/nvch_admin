// components/ui/Card.js
import React from "react";
import styles from "./Card.module.css"

export function Card({ children, className }) {
  	return <div className={`${styles.card} ${className || ""}`}>{children}</div>;
}

export function CardHeader({ children, className }) {
	return (
		<h2 style={{ marginTop: "0rem", marginBottom: "2.5rem" }} className={className}>
			{children}
		</h2>
	);
}
  
export function CardContent({ children, className }) {
	return <div className={`${styles.content} ${className || ""}`}>{children}</div>;
}

//up label, down input
export function InputField({ label, name, register, type = "text", rows = 1, error, options = [], placeholder }) {
    return (
        <div className={styles.field}>
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
                <input 
                    type={type}
                    {...register(name)} 
                    className={`${styles.input} ${error ? styles.input_error : ""}`} 
                    placeholder={placeholder} 
                />
            )}
    
            {error && <p className={styles.error_text}>{error.message}</p>}
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
