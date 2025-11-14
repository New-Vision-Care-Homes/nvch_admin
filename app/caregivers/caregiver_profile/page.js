"use client";

import {React, useState} from "react";
import PageLayout from "@components/layout/PageLayout";
import Tabs from "./components/Tabs";
import Button from "@components/UI/Button";
import { Card, CardHeader, CardContent, InfoField } from "@components/UI/Card";
import styles from "./caregiver_profile.module.css";
import Image from "next/image";
import Link from "next/link";
import { Edit, Activity, Undo2 } from "lucide-react";
import Modal from "@components/UI/Modal";

export default function Page() {

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [active, setActive] = useState("Inactive");

	function handleActive(){
		setActive(active === "Inactive" ? "Active" : "Inactive" );
		setIsModalOpen(true);
		if(active == "Inactive"){
			setMessage("The user has been inactivated")
		}
		else{
			setMessage("The user has been activated")
		}
	}

	function handleCancel() {
		setIsModalOpen(false);
	}

	return (
		<>
			<PageLayout>
				{/* Header */}
				<div className={styles.header}>
					<h1>Caregiver Profile: Eleanor Vance</h1>
					<div className={styles.headerActions}>
						<Button 
							variant="primary" 
							icon={<Activity size={16} />}
							onClick={handleActive}
							className={`${
								active === "Active" ? styles.active : styles.inactive
							}`}
						>
							{active}
						</Button>
						<Link href="/caregiver">
							<Button variant="secondary" icon={<Undo2 size={16}/>}>Back</Button>
						</Link>
					</div>
				</div>

				{/* Caregiver Overview */}
				<Card>
					<CardHeader>Caregiver Overview</CardHeader>
					<div className={styles.content}>
						<div className={styles.text}>
							<div className={styles.column}>
								<InfoField label="Caregiver ID">CC-00123</InfoField>
								<InfoField label="Next Appointment">2024-08-05 (10:00 AM)</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="Status">Active</InfoField>
								<InfoField label="------">On Track</InfoField>
							</div>
							<div className={styles.column}>
								<InfoField label="------">2024-07-28</InfoField>
							</div>
						</div>
						<div className={styles.picture}>
							<Image
								src="/img/navbar/avatar.jpg"
								alt="Profile Photo"
								width={100}
								height={100}
								className={styles.image}
							/>
							<Button variant="secondary" size="sm" icon={<Edit size={16}/>}>Edit</Button>
						</div>
					</div>
				</Card>


				{/* Tabbed Content */}
				<div className={styles.tabs}>
					<Tabs />
				</div>
				{/* End Tabbed Content */}			
			</PageLayout>
			
			<Modal isOpen={isModalOpen} onClose={handleCancel}>
				<h2>{message}</h2>
			</Modal>
		</>
	);
}
