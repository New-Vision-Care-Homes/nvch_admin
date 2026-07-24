/**
 * Table.js — All reusable table components for this project.
 *
 * This file exports THREE distinct table styles. Pick the one that matches
 * your use case. Adding a fourth pattern? Add it here and document it below.
 *
 * ┌─────────────────┬──────────────────────────────────────────────────────────┐
 * │ Style           │ When to use                                              │
 * ├─────────────────┼──────────────────────────────────────────────────────────┤
 * │ Table           │ Simple flex-based layout. Quick row lists where you      │
 * │ (flex)          │ control each column's width manually. Does NOT use a     │
 * │                 │ real HTML <table> element. Already used in: Clients,     │
 * │                 │ Admins, Caregivers list, Permissions, Caregiver Shifts.  │
 * ├─────────────────┼──────────────────────────────────────────────────────────┤
 * │ Table2          │ Data-driven HTML <table>. Pass a columns config array    │
 * │ (data-driven)   │ and a data array — the component handles headers, rows,  │
 * │                 │ and the empty state automatically. Best for simple       │
 * │                 │ read-only data grids with no row interactions. Already   │
 * │                 │ used in: Client Focus Notes.                             │
 * ├─────────────────┼──────────────────────────────────────────────────────────┤
 * │ PageTable       │ Full-width page-level HTML <table> with a bordered       │
 * │ (page-level)    │ wrapper, sticky header, alternating stripe rows, and     │
 * │                 │ hover highlight. Use for the main data table on a page   │
 * │                 │ when rows may be clickable and columns need custom cell  │
 * │                 │ content (badges, icons, action buttons). Already used    │
 * │                 │ in: Homes list, Payroll Overview.                        │
 * └─────────────────┴──────────────────────────────────────────────────────────┘
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Table.module.css";


// ─────────────────────────────────────────────────────────────────────────────
// STYLE 1 — Table (flex-based)
// ─────────────────────────────────────────────────────────────────────────────
//
// A flex-column layout that mimics a table visually using divs. Every row is a
// flex container and every cell is a flex item. This means column widths are
// driven by CSS (flex: 1, fixed px, etc.) rather than the browser's table
// layout engine.
//
// When to use:
//   - You need a quick, simple list with 3–5 columns.
//   - You want fine-grained control over each column's width via className.
//   - You do NOT need accessibility features like <thead> / <th> semantics.
//   - The rows do not need to be individually clickable (use PageTable for that).
//
// When NOT to use:
//   - You have many columns with varying content widths — the browser's table
//     layout algorithm handles that better than manual flex sizing.
//   - Rows are clickable or need hover states — use PageTable instead.
//   - You want to drive content from a data array — use Table2 instead.
//
// Components:
//   <Table>          — outer scroll wrapper + flex column container
//   <TableHeader>    — the header row (bold, bordered bottom)
//   <TableContent>   — a body data row (hover highlight, bordered bottom)
//   <TableCell>      — a single cell inside a header or body row
//
// Example:
//   <Table>
//     <TableHeader>
//       <TableCell className={styles.nameCol}>Name</TableCell>
//       <TableCell className={styles.statusCol}>Status</TableCell>
//     </TableHeader>
//     {items.map(item => (
//       <TableContent key={item.id}>
//         <TableCell className={styles.nameCol}>{item.name}</TableCell>
//         <TableCell className={styles.statusCol}>{item.status}</TableCell>
//       </TableContent>
//     ))}
//   </Table>
// ─────────────────────────────────────────────────────────────────────────────

export function Table({ children, className }) {
	return (
		<div className={styles.scrollX}>
			<div className={`${styles.table} ${className || ""}`}>{children}</div>
		</div>
	);
}

export function TableHeader({ children, className }) {
	return <div className={`${styles.header} ${className || ""}`}>{children}</div>;
}

export function TableCell({ children, className }) {
	return <div className={`${styles.cell} ${className || ""}`}>{children}</div>;
}

export function TableContent({ children, className, onClick, style }) {
	return <div className={`${styles.content} ${className || ""}`} onClick={onClick} style={style}>{children}</div>;
}


// ─────────────────────────────────────────────────────────────────────────────
// STYLE 2 — Table2 (data-driven HTML table)
// ─────────────────────────────────────────────────────────────────────────────
//
// A real HTML <table> that renders itself entirely from a columns config array
// and a data array. You define what columns exist and how to render each cell;
// the component handles the markup, empty state, and pagination.
//
// When to use:
//   - You have a flat data array and want to render it with minimal boilerplate.
//   - The table is read-only (no clickable rows, no inline actions per row).
//   - Cells may need custom rendering (badges, formatted dates) via render().
//   - The dataset is small enough to fit on one page, or you pair it with
//     Table2Pagination for simple numbered pagination.
//
// When NOT to use:
//   - Rows need to be clickable (navigate on click) — use PageTable instead.
//   - You need alternating row colours or a prominent bordered wrapper — use
//     PageTable instead.
//   - Cell layout is too complex to express in a columns config — use PageTable
//     and write the JSX directly.
//
// Companion: Table2Pagination — renders numbered page buttons below the table.
//   Hide it when totalPages <= 1 (it does this automatically).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data-driven HTML table.
 *
 * @param {Array<{
 *   label: string,
 *   key?: string,
 *   render?: (row: object, rowIndex: number) => ReactNode,
 *   className?: string,
 *   headerClassName?: string
 * }>} columns
 *   Column definitions. Each entry needs either `key` (reads row[key] directly)
 *   or `render` (custom JSX). Both can coexist — `render` takes priority.
 *
 * @param {Array<object>} data
 *   The rows to render. Each object's keys must match the `key` fields above.
 *
 * @param {string}    [emptyMessage="No data available."]
 *   Text shown when data is empty or undefined.
 *
 * @param {ReactNode} [emptyIcon]
 *   Icon rendered above emptyMessage in the empty state row.
 *
 * @example
 *   const columns = [
 *     { label: "Note",    key: "note" },
 *     { label: "Author",  key: "author" },
 *     { label: "Actions", render: (row) => <button onClick={() => edit(row.id)}>Edit</button> },
 *   ];
 *   <Table2 columns={columns} data={notes} emptyMessage="No notes yet." />
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
 * Numbered pagination bar for Table2.
 * Renders nothing when totalPages is 1 or less.
 *
 * @param {number}   currentPage  Currently active page (1-indexed).
 * @param {number}   totalPages   Total number of pages.
 * @param {number}   totalItems   Total record count shown in the info label.
 * @param {string}   [itemLabel="items"]  Noun used in "X items" label.
 * @param {Function} onPageChange Called with the new page number when clicked.
 *
 * @example
 *   <Table2Pagination
 *     currentPage={page}
 *     totalPages={totalPages}
 *     totalItems={totalItems}
 *     itemLabel="notes"
 *     onPageChange={setPage}
 *   />
 */
export function Table2Pagination({ currentPage, totalPages, totalItems, itemLabel = "items", onPageChange }) {
	if (totalPages <= 1) return null;

	return (
		<div className={styles.t2Pagination}>
			<span className={styles.t2PageInfo}>
				Page {currentPage} of {totalPages} · {totalItems} {itemLabel}
			</span>
			<div className={styles.t2PageButtons}>
				<button
					className={styles.t2PageBtn}
					disabled={currentPage === 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					<ChevronLeft size={15} />
				</button>
				{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
					<button
						key={p}
						className={`${styles.t2PageBtn} ${p === currentPage ? styles.t2PageBtnActive : ""}`}
						onClick={() => onPageChange(p)}
					>
						{p}
					</button>
				))}
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


// ─────────────────────────────────────────────────────────────────────────────
// STYLE 3 — PageTable (page-level bordered HTML table)
// ─────────────────────────────────────────────────────────────────────────────
//
// A set of thin HTML <table> primitives that share a consistent visual style:
//   • Rounded border wrapper with horizontal scroll on narrow screens
//   • Sticky header row (stays visible when the table scrolls vertically)
//   • Alternating stripe rows (#fff / #f8fafc)
//   • Blue hover highlight (#eff6ff) on clickable rows
//
// When to use:
//   - This is the primary/main data table on a page (not nested inside a Card).
//   - Some or all rows are clickable (navigate to a detail page on click).
//   - Cell content is complex: multi-line text, icons, status badges, action
//     buttons — too complex to express cleanly in a Table2 columns config.
//   - You need a specific column to be right-aligned (numeric data).
//
// When NOT to use:
//   - The table lives inside a Card — the double border looks odd. Use a plain
//     <table> with your own light styling, or Table2, instead.
//   - All you need is a simple read-only list — Table2 is less boilerplate.
//   - You need only 2–3 columns in a narrow space — the flex-based Table is
//     easier to size manually.
//
// Components:
//   <PageTable>            Renders the bordered wrapper + <table>.
//   <PageTableRow>         A <tr> that handles stripe and hover automatically.
//   <PageTableHeadCell>    Optional <th> wrapper — only needed for align="right".
//   <PageTableCell>        Optional <td> wrapper — needed for isEmpty or colSpan.
//
// Raw <th> and <td> inside PageTable get shared header/cell styles automatically
// via descendant CSS selectors, so page-specific className overrides on
// individual cells still work exactly as you would expect.
//
// Full example:
//
//   import { PageTable, PageTableRow, PageTableHeadCell, PageTableCell }
//     from "@components/UI/Table";
//
//   <PageTable minWidth="820px">
//     <thead>
//       <tr>
//         <th>Name</th>
//         <th>Region</th>
//         <PageTableHeadCell align="right">Hours</PageTableHeadCell>
//         <th></th>
//       </tr>
//     </thead>
//     <tbody>
//       {rows.map((row, idx) => (
//         <PageTableRow
//           key={row.id}
//           isEven={idx % 2 !== 0}
//           onClick={() => router.push(`/detail/${row.id}`)}
//         >
//           <td className={styles.nameCell}>{row.name}</td>
//           <td>{row.region}</td>
//           <PageTableCell align="right">{row.hours}</PageTableCell>
//           <td className={styles.actionsCell}>
//             <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}>
//               Delete
//             </button>
//           </td>
//         </PageTableRow>
//       ))}
//       {rows.length === 0 && (
//         <tr>
//           <PageTableCell isEmpty colSpan={4}>No results found.</PageTableCell>
//         </tr>
//       )}
//     </tbody>
//   </PageTable>
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Outer wrapper for a page-level bordered HTML table.
 *
 * @param {ReactNode} children    Table content (<thead>, <tbody>).
 * @param {string}   [minWidth]   CSS min-width on the inner <table> (e.g. "820px").
 *                                Use when the table has many columns and you want
 *                                it to scroll horizontally rather than squash.
 * @param {string}   [className]  Extra class applied to the inner <table> element.
 */
export function PageTable({ children, minWidth, className }) {
	return (
		<div className={styles.ptWrap}>
			<table
				className={`${styles.ptTable} ${className || ""}`}
				style={minWidth ? { minWidth } : undefined}
			>
				{children}
			</table>
		</div>
	);
}

/**
 * A <tr> that automatically applies alternating stripe colour and hover state.
 *
 * @param {ReactNode}  children    The <td> / <PageTableCell> cells for this row.
 * @param {boolean}   [isEven]     Pass `idx % 2 !== 0` to enable stripe colouring.
 * @param {Function}  [onClick]    If provided, the row becomes clickable (cursor
 *                                 pointer + blue hover). For action buttons inside
 *                                 the row that should NOT trigger the row click,
 *                                 add e.stopPropagation() to their own onClick.
 * @param {string}    [className]  Extra class for one-off per-row overrides.
 */
export function PageTableRow({ children, isEven, onClick, className }) {
	return (
		<tr
			className={[
				styles.ptRow,
				isEven    ? styles.ptRowEven     : "",
				onClick   ? styles.ptRowClickable : "",
				className || "",
			].filter(Boolean).join(" ")}
			onClick={onClick}
		>
			{children}
		</tr>
	);
}

/**
 * Optional <th> wrapper — only needed when you require a prop not available on
 * a raw <th>. A plain <th> works fine for standard left-aligned headers.
 *
 * @param {ReactNode} children    Header label text or content.
 * @param {"left"|"right"|"center"} [align]
 *                                Overrides text alignment. Use "right" for
 *                                numeric columns so the header aligns with the
 *                                right-aligned cell values below it.
 * @param {string}   [className]  Extra class for per-column header overrides.
 *
 * @example
 *   <PageTableHeadCell align="right">Hours</PageTableHeadCell>
 */
export function PageTableHeadCell({ children, align, className }) {
	return (
		<th
			className={className || undefined}
			style={align && align !== "left" ? { textAlign: align } : undefined}
		>
			{children}
		</th>
	);
}

/**
 * Optional <td> wrapper. A plain <td> is fine for most cells — use this
 * component only when you need one of the props below.
 *
 * @param {ReactNode} children     Cell content.
 * @param {boolean}  [isEmpty]     Renders the cell in the empty-state style
 *                                 (centred, muted, generous vertical padding).
 *                                 Always combine with colSpan spanning all columns.
 * @param {number}   [colSpan]     HTML colSpan attribute. Required when isEmpty.
 * @param {"left"|"right"|"center"} [align]
 *                                 Overrides text alignment for this cell.
 * @param {object}   [style]       Inline style merged on top of any align override.
 * @param {string}   [className]   Extra class for page-specific cell styling.
 *
 * @example  Empty state
 *   <tr>
 *     <PageTableCell isEmpty colSpan={6}>No entries found.</PageTableCell>
 *   </tr>
 *
 * @example  Right-aligned numeric cell
 *   <PageTableCell align="right">{row.hours}</PageTableCell>
 */
export function PageTableCell({ children, colSpan, align, style, className, isEmpty }) {
	return (
		<td
			colSpan={colSpan}
			className={[isEmpty ? styles.ptCellEmpty : "", className || ""].filter(Boolean).join(" ") || undefined}
			style={align ? { textAlign: align, ...style } : style}
		>
			{children}
		</td>
	);
}
