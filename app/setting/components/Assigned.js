"use client";

import React, { useState } from "react";
import styles from "./Assigned.module.css";
import { Trash2, CirclePlus } from "lucide-react";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { InputFieldLR } from "@components/UI/Card";

export default function Assigned() {
	const [caregivers, setCaregivers] = useState([
		{ id: 1, name: "John Doe", role: "", startDate: "2024-09-01", endDate: "2024-09-30", status: "Active" },
		{ id: 2, name: "Jane Smith", role: "", startDate: "2024-08-15", endDate: "2024-09-15", status: "Inactive" },
		{ id: 3, name: "Alice Johnson", role: "", startDate: "2024-07-20", endDate: "2024-08-20", status: "Active" },
	]);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newCaregiver, setNewCaregiver] = useState({ name: "", role: "", startDate: "", endDate: "", status: "Active" });

	function handleAddCaregiver() {
		setIsModalOpen(true);
	}

	function handleSaveCaregiver() {
		if (!newCaregiver.name || !newCaregiver.startDate || !newCaregiver.endDate) return;
		const nextId = Math.max(...caregivers.map(c => c.id)) + 1;
		setCaregivers([...caregivers, { id: nextId, ...newCaregiver }]);
		setNewCaregiver({ name: "", role: "", startDate: "", endDate: "", status: "Active" });
		setIsModalOpen(false);
	}

	function handleCancel() {
		setNewCaregiver({ name: "", role: "", startDate: "", endDate: "", status: "Active" });
		setIsModalOpen(false);
	}

	function handleDelete(id) {
		setCaregivers(caregivers.filter(c => c.id !== id));
	}

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<h1>Assigned Caregivers</h1>
				<Button onClick={handleAddCaregiver}>
					<CirclePlus size={16} style={{ marginRight: 8 }} />
					Add New Caregiver
				</Button>
			</div>

			<div className={styles.table}>
				<div className={styles.header}>
					<div className={styles.cell}>Caregiver Name</div>
					<div className={styles.cell}>Role</div>
					<div className={styles.cell}>Start Date</div>
					<div className={styles.cell}>End Date</div>
					<div className={styles.cell}>Status</div>
					<div className={styles.cell}>Actions</div>
				</div>

				{caregivers.map(c => (
					<div key={c.id} className={styles.row}>
						<div className={styles.cell}>{c.name}</div>
						<div className={styles.cell}>{c.role}</div>
						<div className={styles.cell}>{c.startDate}</div>
						<div className={styles.cell}>{c.endDate}</div>
						<div className={styles.cell}>{c.status}</div>
						<div className={styles.cell}>
							<button
								className={styles.deleteBtn}
								onClick={() => handleDelete(c.id)}
							>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				))}
			</div>


			{/* Modal */}
			<Modal isOpen={isModalOpen} onClose={handleCancel}>
				<h2>Add New Caregiver</h2>
				<div style={{ marginTop: 12 }}>
					<InputFieldLR label="Name" value={newCaregiver.name} onChange={e => setNewCaregiver({...newCaregiver, name: e.target.value})} />
					<InputFieldLR label="Start Date" value={newCaregiver.startDate} onChange={e => setNewCaregiver({...newCaregiver, startDate: e.target.value})} />
					<InputFieldLR label="End Date" value={newCaregiver.endDate} onChange={e => setNewCaregiver({...newCaregiver, endDate: e.target.value})} />
					<InputFieldLR label="Status" value={newCaregiver.status} onChange={e => setNewCaregiver({...newCaregiver, status: e.target.value})} />
				</div>
				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
					<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
					<Button onClick={handleSaveCaregiver}>Save</Button>
				</div>
			</Modal>
		</div>
	);
}

