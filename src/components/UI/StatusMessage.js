// components/UI/StatusMessage.js
// A clean, reusable status banner for success, error, info, and warning states.
// Usage:
//   import StatusMessage from "@components/UI/StatusMessage";
//   <StatusMessage variant="success" message="Saved successfully!" />
//   <StatusMessage variant="error" message="Something went wrong." />

import React from "react";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

const ICONS = {
	success: <CheckCircle size={16} aria-hidden="true" />,
	error:   <XCircle size={16} aria-hidden="true" />,
	info:    <Info size={16} aria-hidden="true" />,
	warning: <AlertTriangle size={16} aria-hidden="true" />,
};

export default function StatusMessage({ message, variant = "info" }) {
	if (!message) return null;

	return (
		<div className={`statusMessage statusMessage--${variant}`} role="alert">
			<span className="statusMessage__icon">{ICONS[variant]}</span>
			<span className="statusMessage__text">{message}</span>
		</div>
	);
}
