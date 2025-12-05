"use client";

import react, { useState } from "react";

// Hookform and Validation Imports
import { useForm } from "react-hook-form"; 
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
// Importing custom validation rules
import { IdRule, nameRule, emailRule, phoneRule, shortTextRule, birthRule, longTextRule, dateRuleOptional, pinRule } from "@app/validation"; 

// Component and Style Imports
import PageLayout from "@components/layout/PageLayout";
import Sidebar from "@components/layout/Sidebar";
import Navbar from "@components/layout/Navbar";
import styles from "./add_new_shift.module.css";
import Link from "next/link";
import { Search, MapPin, Plus, Edit2, Trash2, Calendar, Circle, PencilRuler } from "lucide-react";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";

// --- YUP SCHEMA DEFINITION ---
const schema = yup.object({
    // Client and Caregiver IDs
    caregiverId: IdRule.required("Caregiver ID is required"), 
    clientId: IdRule.required("Client ID is required"),

    // Client Info Fields
    clientName: nameRule.required("Client Name is required"), 
    clientLocation: shortTextRule.required("Location is required"), 
    clientContact: phoneRule.required("Contact Phone is required"), 

    // Shift Details Fields
    startTime: yup.string().required("Start Time is required"), 
    endTime: yup.string().required("End Time is required"), 
    service: shortTextRule.required("Services Required is required"), 
    shiftNotes: shortTextRule, 

    // Shift Address Fields
    street: shortTextRule.required("Street is required"),
    city: shortTextRule.required("City is required"),
    state: shortTextRule.required("State/Province is required"),
    pinCode: pinRule,
    country: shortTextRule.required("Country is required"),

    // Caregiver Assignment Fields
    assignedCaregiver: nameRule.required("Caregiver must be assigned or shift must be open"), 
    openShift: yup.boolean().notRequired(), 

    // Geofence Fields
    geofenceRadius: yup.number().typeError("Radius must be a number").min(1, "Radius must be positive").required("Radius is required"),
    alertOnEntry: yup.boolean().notRequired(),
    alertOnExit: yup.boolean().notRequired(),
});


// --- DEFAULT FORM VALUES ---
const defaultValues = {
    caregiverId: "",
    clientId: "",
    clientName: "",
    clientLocation: "",
    clientContact: "",
    startTime: "2024-10-25T09:00:00.000Z", 
    endTime: "2024-10-25T17:00:00.000Z",
    service: "",
    shiftNotes: "",
    street: "",
    city: "",
    state: "",
    pinCode: "",
    country: "",
    assignedCaregiver: "Sarah Miller", 
    openShift: false,
    geofenceRadius: 500,
    alertOnEntry: false,
    alertOnExit: false,
};


export default function Page() {

    // --- FORM INITIALIZATION (REACT-HOOK-FORM) ---
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: defaultValues,
    });

    // --- FORM SUBMISSION HANDLER ---
    const onSubmit = (data) => {
        console.log("Form Data:", data);
        console.log("Tasks:", tasks);
        // Add API call logic here
    };

    // --- TASK LIST STATE MANAGEMENT ---
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
        <PageLayout>
            <h1>
                Create New Shift
            </h1>
            {/* Form Container */}
            <form onSubmit={handleSubmit(onSubmit)}> 
                <div className={styles.cards}>
                    {/* --- CLIENT INFORMATION CARD --- */}
                    <Card>
                        <CardHeader>Client Information</CardHeader>
                        <CardContent>
                            <div className={styles.card_row_1}>
                                <InputField 
                                    label="Name" 
                                    name="clientName" // Explicit Prop Passing
                                    register={register}
                                    error={errors.clientName?.message}
                                />
                            </div>
							<div className={styles.card_row_2}>
								<InputField 
									label="Street" 
									name="street" // Explicit Prop Passing
									register={register}
									error={errors.street?.message}
								/>
								<InputField 
									label="City" 
									name="city" // Explicit Prop Passing
									register={register}
									error={errors.city?.message}
								/>
								<InputField 
									label="State/Province" 
									name="state" // Explicit Prop Passing
									register={register}
									error={errors.state?.message}
								/>
							</div>
							<div className={styles.card_row_2}>
								<InputField 
									label="Postal Code" 
									name="pinCode"
									register={register}
									error={errors.pinCode?.message}
								/>
								<InputField 
									label="Country" 
									name="country" // Explicit Prop Passing
									register={register}
									error={errors.country?.message}
								/>
							</div>
                            <div className={styles.card_row_1}>
                                <InputField 
                                    label="Contact" 
                                    type="tel" 
                                    name="clientContact" // Explicit Prop Passing
                                    register={register}
                                    error={errors.clientContact?.message}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* --- SHIFT DETAILS CARD --- */}
                    <Card>
                        <CardHeader>Shift Details</CardHeader>
                        <InputField 
                            label="Caregiver ID" 
                            name="caregiverId" // Explicit Prop Passing
                            register={register}
                            error={errors.caregiverId?.message}
                            value={watch("caregiverId")} 
                            readOnly 
                        />
                        <div className={styles.card_row_2}>
                            <InputField 
                                label="Start Date & Time" 
                                type="datetime-local" 
                                name="startTime" // Explicit Prop Passing
                                register={register}
                                error={errors.startTime?.message}
                            />
                            <InputField 
                                label="End Date & Time" 
                                type="datetime-local" 
                                name="endTime" // Explicit Prop Passing
                                register={register}
                                error={errors.endTime?.message}
                            />
                        </div>
                        <div className={styles.card_row_1}>
                            <InputField 
                                label="Services Required" 
                                name="service" // Explicit Prop Passing
                                register={register}
                                error={errors.service?.message}
                            />
                        </div>
                        <div className={styles.card_row_1}>
                            <InputField 
                                label="Notes" 
                                name="shiftNotes" // Explicit Prop Passing
                                register={register}
                                error={errors.shiftNotes?.message}
                            />
                        </div>
                    </Card>
                </div>

                <div className={styles.cards}>
                    {/* --- TASK LIST CARD (STATE MANAGED) --- */}
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
                            <Button type="button" onClick={addTask}>Add</Button>
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
                                        <button type="button" className={styles.iconButton}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button type="button" className={styles.iconButton} onClick={() => deleteTask(task.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* --- CAREGIVER ASSIGNMENT CARD --- */}
                    <Card>
                        <CardHeader>Caregiver Assignment</CardHeader>
                        <InputField 
                            label="Assign Caregiver" 
                            name="assignedCaregiver" // Explicit Prop Passing
                            register={register}
                            error={errors.assignedCaregiver?.message}
                            readOnly
                        />
                        <div className={styles.statusBadge}>Caregiver available for this shift</div>
                        <label className={styles.checkboxLabel}>
                            <input 
                                type="checkbox" 
                                className={styles.checkbox} 
                                {...register("openShift")} // Checkbox often uses Spread Registration
                            />
                            <span>Open shift</span>
                        </label>
                    </Card>
                    
                    {/* --- ADDITIONAL OPTIONS CARD --- */}
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

                {/* --- GEOFENCE CUSTOMIZATION CARD --- */}
                <Card>
                    <CardHeader>Geofence Customization</CardHeader>
                    <div className={styles.gps}>
                        <div className={styles.left}>
                            <div className={styles.mapContainer}></div>
                        </div>
                        <div className={styles.right}>
                            <InputField 
                                label="Geofence Radius (meters)" 
                                type="number"
                                name="geofenceRadius" // Explicit Prop Passing
                                register={register}
                                error={errors.geofenceRadius?.message}
                            />
                            <span>Shape Controls</span>
                            <div className={styles.buttons}>
                                <Button type="button" variant="secondary" icon={<Circle />}>Draw Circle</Button>
                                <Button type="button" variant="secondary" icon={<PencilRuler />}>Adjust Fence</Button>
                            </div>
                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        {...register("alertOnEntry")} // Checkbox often uses Spread Registration
                                    />
                                    <span>Alert on Caregiver Entry</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        {...register("alertOnExit")} // Checkbox often uses Spread Registration
                                    />
                                    <span>Alert on Caregiver Exit</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- SUBMIT BUTTON --- */}
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <Button type="submit">Create Shift</Button>
                </div>
            </form>
        </PageLayout>
    );
}