"use client";

import {React, useState} from "react";
import { Card, CardHeader, CardContent } from "@components/UI/Card";
import InputField from "@components/UI/Card"; 
import Button from "@components/UI/Button";
import styles from "./info.module.css";

export default function CarePlan() {
	const [chronic_conditions, setChronicConditions] = useState("");
	const [allergies, setAllergies] = useState("");
	const [past_surgeries, setPastSurgeries] = useState("");
	const [prescription_medications, setPrescriptionMedications] = useState("");
	const [OTC_medications, setOTCMedications] = useState("");
	const [dosage_schedule, setDosageSchedule] = useState("");
	const [dietary_restrictions, setDietaryRestrictions] = useState("");
	const [mobility_assistance_needs, setMobilityAssistanceNeeds] = useState("");
	const [cognitive_status, setCognitiveStatus] = useState("");
	const [Daily_care_tasks, setDailyCareTasks] = useState("");
	const [emergency_procedures, setEmergencyProcedures] = useState("");
	const [communication_preferences, setCommunicationPreferences] = useState("");
	const [other_instructions, setOtherInstructions] = useState("");

	return(
		<div>
			<div className={styles.body}>
				<Card>
					<CardHeader>Medical Conditions</CardHeader>
					<CardContent>
						<div className={styles.card_row_1}>
							<InputField 
								label="Chronic Conditions" 
								value={chronic_conditions} 
								onChange={e => setChronicConditions(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Allergies" 
								value={allergies} 
								onChange={e => setAllergies(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Past Surgeries" 
								value={past_surgeries} 
								onChange={e => setPastSurgeries(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Current Medications</CardHeader>
					<CardContent>
						<div className={styles.card_row_1}>
							<InputField 
								label="Prescription Medications" 
								value={prescription_medications} 
								onChange={e => setPrescriptionMedications(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="OTC Medications" 
								value={OTC_medications} 
								onChange={e => setOTCMedications(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Dosage & Schedule" 
								value={dosage_schedule} 
								onChange={e => setDosageSchedule(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Special Notes</CardHeader>
					<CardContent>
						<div className={styles.card_row_1}>
							<InputField 
								label="Dietary Restrictions" 
								value={dietary_restrictions} 
								onChange={e => setDietaryRestrictions(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Mobility & Assistance Needs" 
								value={mobility_assistance_needs} 
								onChange={e => setMobilityAssistanceNeeds(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Cognitive Status" 
								value={cognitive_status} 
								onChange={e => setCognitiveStatus(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>Care Instructions</CardHeader>
					<CardContent>
						<div className={styles.card_row_1}>
							<InputField 
								label="Daily Care Tasks" 
								value={Daily_care_tasks} 
								onChange={e => setDailyCareTasks(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Emergency Procedures" 
								value={emergency_procedures} 
								onChange={e => setEmergencyProcedures(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Communication Preferences" 
								value={communication_preferences} 
								onChange={e => setCommunicationPreferences(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
						</div>
						<div className={styles.card_row_1}>
							<InputField 
								label="Other Instructions" 
								value={other_instructions} 
								onChange={e => setOtherInstructions(e.target.value)} 
								type="textarea" 
								rows={5}	
							/>
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