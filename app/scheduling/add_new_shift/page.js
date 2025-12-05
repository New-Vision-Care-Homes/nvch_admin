"use client";

import react, { useState } from "react";
import { useRouter } from "next/navigation";
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
    // IDs (Top-level fields)
    caregiverId: IdRule.required("Caregiver ID is required"), 
    clientId: IdRule.required("Client ID is required"),

    // Client Info Fields (Used to construct address and phone)
    //clientFirstName: nameRule.required("Client Name is required"), 
    //clientLirstName: nameRule.required("Client Name is required"), 
    clientPhone: phoneRule.required("Client Phone is required"), 
    contactFName: nameRule.optional(),
    contactLName: nameRule.optional(),
    contactPhone: phoneRule.optional(),
    
    // Shift Timing
    startTime: yup.string().required("Start Time is required"), 
    endTime: yup.string().required("End Time is required"), 
    
    // Services and Notes
    serviceInput: shortTextRule.required("Services Required is required"), 
    shiftNotes: shortTextRule, 
    
    // Client Address Fields (Will be combined into clientAddress string)
    street: shortTextRule.required("Street is required"),
    city: shortTextRule.required("City is required"),
    state: shortTextRule.required("State/Province is required"),
    pinCode: pinRule,
    country: shortTextRule.required("Country is required"),

    // Assignment / Status
    assignedCaregiver: nameRule.optional(), 
    openShift: yup.boolean().notRequired(), 

    // Geofence Fields
    //geofenceRadius: yup.number().typeError("Radius must be a number").min(1, "Radius must be positive").required("Radius is required"),
    //alertOnEntry: yup.boolean().notRequired(),
    //alertOnExit: yup.boolean().notRequired(),
});

export default function Page() {

    const [loading, setLoading] = useState(false);
    const router = useRouter();
    // --- FORM INITIALIZATION (REACT-HOOK-FORM) ---
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

	// --- TASK LIST STATE MANAGEMENT ---
    // Initialize tasks as an empty array
    const [tasks, setTasks] = useState([]); 
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

    const onSubmit = async (data) => {
        // Time Conversion: Convert local datetime-local string to UTC ISO 8601 string

        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             alert("Invalid Start or End Time provided.");
             setLoading(false); 
             return;
        }

        const convertedStartTime = startDate.toISOString();
        const convertedEndTime = endDate.toISOString();

        // 1. Combine Address fields into a single string
        const clientAddress = `${data.street}, ${data.city}, ${data.state}${data.pinCode ? ', ' + data.pinCode : ''}`;

        // 2. Convert service input string to an array
        const servicesArray = data.serviceInput.split(',').map(service => service.trim()).filter(service => service.length > 0);
        
        // 3. Map local tasks state to the simplified backend 'tasks' format
        const finalTasks = tasks.map(task => ({
            description: task.text,
            completed: false
        }));

        // 4. Construct the final Shift object matching the backend API request format
        const shiftData = {
            "caregiverId": data.caregiverId,
            "clientId": data.clientId,
            "clientAddress": clientAddress,
            "clientPhone": data.clientPhone,
            
            // contactPerson
            "contactPerson": { 
                "name": `${data.contactFName || 'John'} ${data.contactLName || 'Doe'}`, 
                "phone": data.contactPhone
            },
            
            "startTime": convertedStartTime, // Use converted UTC time
            "endTime": convertedEndTime,     // Use converted UTC time
            "servicesRequired": servicesArray,
            
            // Geofence info
            "geofence": {
                "center": {
                    "latitude": 44.6488, 
                    "longitude": -63.5752 
                },
                "radius": data.geofenceRadius || 500,
                "shape": "circle", 
                "alertOnEntry": data.alertOnEntry || false,
                "alertOnExit": data.alertOnExit || false
            },
            
            "tasks": finalTasks,
            
            // recurringShift
            "recurringShift": {
                "isRecurring": false
            },
            
            // Tags
            "tags": ["Urgent", "New Client"],
            
            "isOpenShift": data.openShift || false,
            "notes": data.shiftNotes
        };
        
        setLoading(true);

        try {
            console.log("Sending Shift Data:", shiftData);
            const token = localStorage.getItem("token");
			console.log("token: ", token);
            // --- API CALL IMPLEMENTATION ---
            const response = await fetch("https://nvch-server.onrender.com/api/shifts", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(shiftData),
            });

            if (!response.ok) {
                // Handle HTTP errors (4xx or 5xx status codes)
                const errorData = await response.json();
                throw new Error(errorData.message || `API request failed with status: ${response.status}`);
            }

            // Shift created successfully
            console.log("Shift created successfully!");
            router.push("/shifts"); // Redirect after successful creation

        } catch (error) {
            // Handle network errors or errors thrown above
            console.error("Failed to create shift:", error.message);
            // You might want to display an error message to the user here
            alert(`Error: ${error.message}. Please try again.`);

        } finally {
            // Ensure loading state is turned off regardless of success or failure
            setLoading(false);
        }
    };

    function handleCancel() {
        router.push("/scheduling");
    }


    return (
        <PageLayout>
            <div className={styles.header}>
                <h1>Create New Shift</h1>
                <div className={styles.buttons}>
                    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                    <Button variant="primary" type="submit" onClick={handleSubmit(onSubmit)} disabled={loading}> 
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
            {/* Form Container */}
            <form onSubmit={handleSubmit(onSubmit)}> 
                <div className={styles.cards}>
                    {/* --- CLIENT INFORMATION CARD --- */}
                    <Card>
                        <CardHeader>Client Information</CardHeader>
                        <CardContent>
                            <div className={styles.card_row_2}>
                                {/*}
                                <InputField 
                                    label="First Name" 
                                    name="clientFirstName" 
                                    register={register}
                                    error={errors.clientFirstName?.message}
                                />
                                <InputField 
                                    label="Last Name" 
                                    name="clientLastName" 
                                    register={register}
                                    error={errors.clientLastName?.message}
                                />*/}

                                <InputField 
                                    label="Client ID" 
                                    name="clientId" 
                                    register={register}
                                    error={errors.clientId?.message}
                                />
                            </div>
							<div className={styles.card_row_1}>
                                <InputField 
                                    label="Client Phone" 
                                    name="clientPhone" 
                                    register={register}
                                    error={errors.clientPhone?.message}
                                />
                            </div>
                            <div className={styles.card_row_2}>
                                <InputField 
                                    label="Street" 
                                    name="street" 
                                    register={register}
                                    error={errors.street?.message}
                                />
                                <InputField 
                                    label="City" 
                                    name="city" 
                                    register={register}
                                    error={errors.city?.message}
                                />
                                <InputField 
                                    label="State/Province" 
                                    name="state" 
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
                                    name="country" 
                                    register={register}
                                    error={errors.country?.message}
                                />
                            </div>
                            <div className={styles.card_row_2}>
                                <InputField 
                                    label="Contact First Name" 
                                    name="contactFName" 
                                    register={register}
                                    error={errors.contactFName?.message}
                                />
                                <InputField 
                                    label="Contact Last Name" 
                                    name="contactLName" 
                                    register={register}
                                    error={errors.contactLName?.message}
                                />
                            </div>
                            <div className={styles.card_row_1}>
                                <InputField 
                                    label="Contact Phone" 
                                    name="contactPhone" 
                                    register={register}
                                    error={errors.contactPhone?.message}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* --- SHIFT DETAILS CARD --- */}
                    <Card>
                        <CardHeader>Shift Details</CardHeader>
                        <CardContent>
                            <InputField 
                                label="Caregiver ID" 
                                name="caregiverId" 
                                register={register}
                                error={errors.caregiverId?.message}
                                value={watch("caregiverId")} 
                                readOnly 
                            />
                            <div className={styles.card_row_2}>
                                <InputField 
                                    label="Start Date & Time" 
                                    type="datetime-local" 
                                    name="startTime" 
                                    register={register}
                                    error={errors.startTime?.message}
                                />
                                <InputField 
                                    label="End Date & Time" 
                                    type="datetime-local" 
                                    name="endTime" 
                                    register={register}
                                    error={errors.endTime?.message}
                                />
                            </div>
                            <div className={styles.card_row_1}>
                                <InputField 
                                    label="Services Required (Comma Separated)" 
                                    name="serviceInput" 
                                    register={register}
                                    error={errors.serviceInput?.message}
                                />
                            </div>
                            <div className={styles.card_row_1}>
                                <InputField 
                                    label="Notes" 
                                    name="shiftNotes" 
                                    register={register}
                                    error={errors.shiftNotes?.message}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className={styles.cards}>
                    {/* --- TASK LIST CARD (Simplified) --- */}
                    <Card>
                        <CardHeader>Task List</CardHeader>
                        <div className={styles.taskInputGroup}>
                            <input 
                                type="text" 
                                placeholder="Add a new task..." 
                                className={styles.input}
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                // Add task on Enter key press
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault(); // Prevent form submission on Enter
                                        addTask();
                                    }
                                }}
                            />
                            <Button type="button" onClick={addTask}>Add</Button>
                        </div>
                        <div className={styles.taskList}>
                            {tasks.map((task) => (
                                <div key={task.id} className={styles.taskItem}>
                                    <label className={styles.taskLabel}>
										{/*}
                                        <input 
                                            type="checkbox" 
                                            className={styles.checkbox}
                                            checked={task.completed}
                                            onChange={() => {
                                                setTasks(tasks.map(t => 
                                                t.id === task.id ? { ...t, completed: !t.completed } : t
                                                ));
                                            }}
                                        />*/}
                                        <span className={task.completed ? styles.taskTextCompleted : ''}>
                                            {task.text}
                                        </span>
                                    </label>
                                    <div className={styles.taskActions}>
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
                            name="assignedCaregiver" 
                            register={register}
                            error={errors.assignedCaregiver?.message}
                            readOnly
                        />
                        <div className={styles.statusBadge}>Caregiver available for this shift</div>
                        <label className={styles.checkboxLabel}>
                            <input 
                                type="checkbox" 
                                className={styles.checkbox} 
                                {...register("openShift")} 
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
                                name="geofenceRadius" 
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
                                        {...register("alertOnEntry")} 
                                    />
                                    <span>Alert on Caregiver Entry</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        {...register("alertOnExit")} 
                                    />
                                    <span>Alert on Caregiver Exit</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>
            </form>
        </PageLayout>
    );
}