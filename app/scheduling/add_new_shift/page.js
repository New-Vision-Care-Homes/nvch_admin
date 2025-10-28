"use client";

import react, { useState } from "react";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./add_new_shift.module.css";
import Link from "next/link";
import { Search, MapPin, Plus, Edit2, Trash2, Calendar, Circle, PencilRuler } from "lucide-react";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";

export default function Page() {

	const [name, setName] = useState("");
	const [location, setLocation] = useState("");
	const [contact, setContact] = useState("");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");
	const [service, setService] = useState("");
	const [notes, setNotes] = useState("");

	const [tasks, setTasks] = useState([
		{ id: 1, text: 'Schedule client meeting', completed: false },
		{ id: 2, text: 'Prepare presentation for Q3 review', completed: true },
		{ id: 3, text: 'Follow up with new lead', completed: false },
		{ id: 4, text: 'Update project status report', completed: false },
	  ]);
	  const [newTask, setNewTask] = useState('');
	
	  const addTask = () => {
		if (newTask.trim()) {
		  setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
		  setNewTask('');
		}
	  };
	
	  const deleteTask = (id) => {
		setTasks(tasks.filter(task => task.id !== id));
	  };


	return (
		<div className={styles.page}>
			<Navbar />
			<div className={styles.container}>
				<Sidebar />
				<div className={styles.main}>
					<h1>
						Create New Shift
					</h1>
					<div className={styles.cards}>
						<Card>
							<CardHeader>Client Information</CardHeader>
							<CardContent>
								<div className={styles.card_row_1}>
									<InputField label="Name" value={name} onChange={e => setName(e.target.value)} />
								</div>
								<div className={styles.card_row_1}>
									<InputField label="Location" value={location} onChange={e => setLocation(e.target.value)} />
								</div>
								<div className={styles.card_row_1}>
									<InputField label="Contact" value={contact} onChange={e => setContact(e.target.value)} />
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>Shift Details</CardHeader>
							<CardContent>
								<InputField label="Name" value={name} onChange={e => setName(e.target.value)} />
								<div className={styles.card_row_2}>
									<InputField label="Start Date & Time" value={start} onChange={e => setStart(e.target.value)} />
									<InputField label="End Date & Time" value={end} onChange={e => setEnd(e.target.value)} />
								</div>
								<div className={styles.card_row_1}>
									<InputField label="Services Required" value={service} onChange={e => setService(e.target.value)} />
								</div>
								<div className={styles.card_row_1}>
									<InputField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
								</div>
							</CardContent>
						</Card>
					</div>

					<div className={styles.cards}>
						<Card>
							<CardHeader>Task List</CardHeader>
							<div className={styles.taskInputGroup}>
								<input 
									type="text" 
									placeholder="Add a new task..." 
									className={styles.input}
									value={newTask}
									onChange={(e) => setNewTask(e.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && addTask()}
								/>
								<Button onClick={addTask}>Add</Button>
							</div>
							<div className={styles.taskList}>
								{tasks.map((task) => (
									<div key={task.id} className={styles.taskItem}>
										<label className={styles.taskLabel}>
											<input 
												type="checkbox" 
												className={styles.checkbox}
												checked={task.completed}
												onChange={() => {
													setTasks(tasks.map(t => 
													t.id === task.id ? { ...t, completed: !t.completed } : t
													));
												}}
											/>
											<span className={task.completed ? styles.taskTextCompleted : ''}>
												{task.text}
											</span>
										</label>
										<div className={styles.taskActions}>
											<button className={styles.iconButton}>
												<Edit2 size={14} />
											</button>
											<button className={styles.iconButton} onClick={() => deleteTask(task.id)}>
												<Trash2 size={14} />
											</button>
										</div>
									</div>
								))}
							</div>
						</Card>

						<Card>
							<CardHeader>Caregiver Assignment</CardHeader>
							<InputField label="Assign Caregiver" value={"Sarah Miller"} />
							<div className={styles.statusBadge}>Caregiver available for this shift</div>
							<label className={styles.checkboxLabel}>
								<input type="checkbox" className={styles.checkbox} />
								<span>Open shift</span>
							</label>
						</Card>
						<Card>
							<CardHeader>Additional Options</CardHeader>
							<div className={styles.formGroup}>
								<label className={styles.label}>Tags</label>
								<div className={styles.tagContainer}>
									<span className={styles.tag}>Recurring Shift</span>
								</div>
							</div>
							<div className={styles.formGroup}>
								<label className={styles.label}>Urgent, New Client</label>
								<div className={styles.tagContainer}>
									<span className={styles.tag}>Urgent</span>
									<span className={styles.tag}>New Client</span>
								</div>
							</div>
						</Card>
					</div>

					{/* Geofence Customization */}
					<Card>
						<CardHeader>Geofence Customization</CardHeader>
						<div className={styles.gps}>
							<div className={styles.left}>
								<div className={styles.mapContainer}></div>
							</div>
							<div className={styles.right}>
								<InputField label="Geofence Radius (meters)" value="500"></InputField>
								<span>Shape Controls</span>
								<div className={styles.buttons}>
									<Button variant="secondary" icon={<Circle />}>Draw Circle</Button>
									<Button variant="secondary" icon={<PencilRuler />}>Adjust Fence</Button>
								</div>
								<div className={styles.checkboxGroup}>
									<label className={styles.checkboxLabel}>
										<input type="checkbox" className={styles.checkbox} />
										<span>Alert on Caregiver Entry</span>
									</label>
									<label className={styles.checkboxLabel}>
										<input type="checkbox" className={styles.checkbox} />
										<span>Alert on Caregiver Exit</span>
									</label>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}