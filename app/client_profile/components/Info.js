"use client";

import {React, useState} from "react";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import InputField from "@components/UI/Card"; 
import Button from "@components/UI/Button";
import styles from "./info.module.css";

export default function Info() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [birth, setBirth] = useState("");
	const [gender, setGender] = useState("");
	const [address, setAddress] = useState("");
	const [notes, setNotes] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [emergencyFName, setEmergencyFName] = useState("");
	const [emergencyLName, setEmergencyLName] = useState("");
	const [relationship, setRelationship] = useState("");
	const [emergencyPhone, setEmergencyPhone] = useState("");
	const [sdmFName, setSdmFName] = useState("");
	const [sdmLName, setSdmLName] = useState("");
	const [sdmPhone, setSdmPhone] = useState("");
	const [sdmEmail, setSdmEmail] = useState("");

	return(
		<div>
			<div className={styles.body}>
				<Card>
					<CardHeader>Basic Information</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
							<InputField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Date of Birth" value={birth} onChange={e => setBirth(e.target.value)} />
							<InputField label="Gender" value={gender} onChange={e => setGender(e.target.value)} />
						</div>
						<div className={styles.card_row_1}>
							<InputField label="Address" value={address} onChange={e => setAddress(e.target.value)} />
						</div>
						<div className={styles.card_row_1}>
							<InputField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Contact Details</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
							<InputField label="Email" value={email} onChange={e => setEmail(e.target.value)} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Emergency Contact</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" value={emergencyFName} onChange={e => setEmergencyFName(e.target.value)} />
							<InputField label="Last Name" value={emergencyLName} onChange={e => setEmergencyLName(e.target.value)} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Relationship" value={relationship} onChange={e => setRelationship(e.target.value)} />
							<InputField label="Phone" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Statutory Decision Maker (SDM)</CardHeader>
					<CardContent>
						<div className={styles.card_row_2}>
							<InputField label="First Name" value={sdmFName} onChange={e => setSdmFName(e.target.value)} />
							<InputField label="Last Name" value={sdmLName} onChange={e => setSdmLName(e.target.value)} />
						</div>
						<div className={styles.card_row_2}>
							<InputField label="Phone" value={sdmPhone} onChange={e => setSdmPhone(e.target.value)} />
							<InputField label="Email" value={sdmEmail} onChange={e => setSdmEmail(e.target.value)} />
						</div>
					</CardContent>
				</Card>
			</div>
			<div className={styles.buttons}>
				<Button variant="secondary" onClick={() => alert("Saved")}>Cancel</Button>
				<Button variant="primary" onClick={() => alert("Saved")}>Save Changes</Button>
			</div>
		</div>
	)
}