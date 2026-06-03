"use client";

import { REGION_OPTIONS } from "@/utils/dropdown_list";

/**
 * Multi-select region picker rendered as a checkbox group. Controlled:
 * `value` is an array of selected region values; `onChange` receives the next
 * array. Used on admin/caregiver create & edit forms (admins and caregivers may
 * belong to multiple regions).
 */
export default function RegionCheckboxGroup({
	value = [],
	onChange,
	error,
	required = false,
	label = "Regions",
}) {
	const selected = Array.isArray(value) ? value : value ? [value] : [];

	const toggle = (region) => {
		const next = selected.includes(region)
			? selected.filter((r) => r !== region)
			: [...selected, region];
		onChange(next);
	};

	return (
		<div>
			<p
				style={{
					fontSize: "0.9rem",
					fontWeight: 600,
					color: "var(--color-secondary)",
					letterSpacing: "0.02em",
					textTransform: "uppercase",
					marginBottom: "0.75rem",
				}}
			>
				{label}{" "}
				{required && (
					<span style={{ color: "#E53E3E", fontWeight: 700, fontSize: "0.85rem" }}>*</span>
				)}
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
				{REGION_OPTIONS.map((opt) => {
					const isChecked = selected.includes(opt.value);
					return (
						<label
							key={opt.value}
							className="checkboxLabel"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								border: `1px solid ${isChecked ? "#3b82f6" : "var(--border-primary)"}`,
								borderRadius: "8px",
								padding: "0.6rem 0.9rem",
								background: isChecked ? "#eff6ff" : "#fafafa",
								fontWeight: 500,
								fontSize: "0.9rem",
								cursor: "pointer",
								transition: "background 0.15s, border-color 0.15s",
							}}
						>
							<input
								type="checkbox"
								checked={isChecked}
								onChange={() => toggle(opt.value)}
							/>
							{opt.label}
						</label>
					);
				})}
			</div>

			{error && (
				<p
					style={{
						color: "#b91c1c",
						fontSize: "0.85rem",
						marginTop: "0.75rem",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
					{error.message}
				</p>
			)}
		</div>
	);
}
