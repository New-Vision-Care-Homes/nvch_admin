import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Table.module.css";

// ─── Original flex-based Table ────────────────────────────────────────────────

export function Table({ children, className }) {
	return <div className={`${styles.table} ${className || ""}`}>{children}</div>;
}

export function TableHeader({ children, className }) {
	return <div className={`${styles.header} ${className || ""}`}>{children}</div>;
}

export function TableCell({ children, className }) {
	return <div className={`${styles.cell} ${className || ""}`}>{children}</div>;
}

export function TableContent({ children, className }) {
	return <div className={`${styles.content} ${className || ""}`}>{children}</div>;
}

// ─── Table2 (Data-driven, simple and reusable) ────────────────────────────────

/**
 * A simple, reusable, data-driven Table component.
 * You only need to provide the `columns` configuration and the `data` array to render a complete table.
 * 
 * @param {Array} columns - Configuration for table columns. 
 *        Example: [
 *          { label: "Name", key: "name" }, 
 *          { label: "Action", render: (row) => <button>Edit</button> }
 *        ]
 *        - `label`: The text to display in the table header.
 *        - `key`: The object key in your data to display. Used if `render` is not provided.
 *        - `render`: A function that takes the current row data and returns custom UI (e.g., badges, buttons).
 *        - `className`: Optional CSS class for the <td> element.
 *        - `headerClassName`: Optional CSS class for the <th> element.
 * @param {Array} data - The array of objects containing the actual data to display.
 * @param {string} emptyMessage - The text to display when the `data` array is empty.
 * @param {ReactNode} emptyIcon - Optional icon to display above the empty message.
 */
export function Table2({ columns, data, emptyMessage = "No data available.", emptyIcon }) {
	return (
		<div className={styles.t2Wrap}>
			<table className={styles.t2Table}>
				<thead>
					<tr>
						{columns.map((col, index) => (
							<th key={index} className={col.headerClassName || ""}>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{(!data || data.length === 0) ? (
						<tr>
							<td colSpan={columns.length} className={styles.t2EmptyRow}>
								{emptyIcon && <span className={styles.t2EmptyIcon}>{emptyIcon}</span>}
								<p>{emptyMessage}</p>
							</td>
						</tr>
					) : (
						data.map((row, rowIndex) => (
							<tr key={rowIndex}>
								{columns.map((col, colIndex) => (
									<td key={colIndex} className={col.className || ""}>
										{/* If a custom render function is provided, use it. Otherwise, fall back to the raw value matching the key. */}
										{col.render ? col.render(row, rowIndex) : row[col.key]}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Pagination component designed specifically for Table2.
 * It automatically hides itself if there is 1 page or less.
 *
 * @param {number} currentPage - The currently active page (1-indexed).
 * @param {number} totalPages - The total number of pages available.
 * @param {number} totalItems - The total number of records across all pages (displayed as text).
 * @param {string} itemLabel - The plural noun used in the info text (e.g., "notes", "users"). Defaults to "items".
 * @param {Function} onPageChange - Callback function triggered when a page button is clicked. Receives the new page number.
 */
export function Table2Pagination({ currentPage, totalPages, totalItems, itemLabel = "items", onPageChange }) {
	if (totalPages <= 1) return null;

	return (
		<div className={styles.t2Pagination}>
			{/* Left side: Information text */}
			<span className={styles.t2PageInfo}>
				Page {currentPage} of {totalPages} · {totalItems} {itemLabel}
			</span>
			
			{/* Right side: Interactive pagination buttons */}
			<div className={styles.t2PageButtons}>
				{/* Previous Page Button */}
				<button
					className={styles.t2PageBtn}
					disabled={currentPage === 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					<ChevronLeft size={15} />
				</button>

				{/* Page Number Buttons */}
				{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
					<button
						key={p}
						className={`${styles.t2PageBtn} ${p === currentPage ? styles.t2PageBtnActive : ""}`}
						onClick={() => onPageChange(p)}
					>
						{p}
					</button>
				))}

				{/* Next Page Button */}
				<button
					className={styles.t2PageBtn}
					disabled={currentPage === totalPages}
					onClick={() => onPageChange(currentPage + 1)}
				>
					<ChevronRight size={15} />
				</button>
			</div>
		</div>
	);
}