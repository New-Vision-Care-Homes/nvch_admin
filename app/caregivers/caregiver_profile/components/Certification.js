"use client";

import React, { useState } from "react";
import styles from "./Certification.module.css";
import { Trash2, CirclePlus, Upload } from "lucide-react";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { InputFieldLR } from "@components/UI/Card";

export default function Certification() {
	const [certification, setCertification] = useState([
		{ id: 1, name: "CPR", issueDate: "2022-03-01", expiryDate: "2024-03-01", status: "Active" },
		{ id: 2, name: "First Aid Training", issueDate: "2023-01-15", expiryDate: "2025-01-15", status: "Active" },
		{ id: 3, name: "Advanced Caregiver Course", issueDate: "2023-06-01", expiryDate: "2024-09-01", status: "Active" },
		{ id: 4, name: "Medication Management", issueDate: "2023-02-10", expiryDate: "2025-02-10", status: "Active" },
		{ id: 5, name: "Dementia Care Specialist", issueDate: "2022-02-10", expiryDate: "2025-02-10", status: "Active" },
	]);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newCertification, setNewCertification] = useState({ name: "", role: "", startDate: "", endDate: "", status: "Active" });

	function handleNewCertification() {
		setIsModalOpen(true);
	}

	function handleCancel() {
		setIsModalOpen(false);
	}

	function handleUpload() {
		alert("upload");
		setIsModalOpen(false);
	}

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<h1>Certifications</h1>
				<Button onClick={handleNewCertification}>
					<Upload size={16} style={{ marginRight: 8 }} />
					Upload New Certificate
				</Button>
			</div>

			<div className={styles.table}>
				<div className={styles.header}>
					<div className={styles.cell}>Certificate Name</div>
					<div className={styles.cell}>Issue Date</div>
					<div className={styles.cell}>Expiry Date</div>
					<div className={styles.cell}>Status</div>
					<div className={styles.cell}>Actions</div>
				</div>

				{certification.map(c => (
					<div key={c.id} className={styles.row}>
						<div className={styles.cell}>{c.name}</div>
						<div className={styles.cell}>{c.issueDate}</div>
						<div className={styles.cell}>{c.expiryDate}</div>
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
				<h2>Add New Certificate</h2>
				<div style={{ marginTop: 12 }}>
					<InputFieldLR label="Name" value={newCertification.name} onChange={e => setNewCertification({...newCertification, name: e.target.value})} />
					<InputFieldLR label="Issue Date" value={newCertification.startDate} onChange={e => setNewCertification({...newCertification, startDate: e.target.value})} />
					<InputFieldLR label="Expiry Date" value={newCertification.endDate} onChange={e => setNewCertification({...newCertification, endDate: e.target.value})} />
					<InputFieldLR label="Status" value={newCertification.status} onChange={e => setNewCertification({...newCertification, status: e.target.value})} />
				</div>
				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
					<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
					<Button onClick={handleUpload}>Save</Button>
				</div>
			</Modal>
		</div>
	);
}

