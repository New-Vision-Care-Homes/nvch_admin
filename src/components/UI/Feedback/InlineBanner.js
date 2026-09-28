"use client";

/**
 * Inline success/error banner shown above a page's header.
 *
 * @param {Object|null} message - { type: 'success'|'error', text } or null to render nothing
 */
export default function InlineBanner({ message }) {
	if (!message) return null;

	return (
		<div style={{
			backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
			color: message.type === 'error' ? '#991b1b' : '#166534',
			padding: '1rem',
			borderRadius: '6px',
			marginBottom: '1rem',
			fontWeight: '500',
			textAlign: 'center',
			border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
		}}>
			{message.text}
		</div>
	);
}
