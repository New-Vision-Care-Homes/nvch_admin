"use client";

import react, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form"; 
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Search, Trash2, Circle, PencilRuler, MapPin, Plus } from "lucide-react";

// Component & Style Imports
import PageLayout from "@components/layout/PageLayout";
import styles from "./add_new_shift.module.css";
import { Card, CardHeader, CardContent, InputField } from "@components/UI/Card";
import Button from "@components/UI/Button";
import { IdRule, nameRule, phoneRule, shortTextRule, pinRule } from "@app/validation"; 

// --- 1. VALIDATION SCHEMA ---
const schema = yup.object({
    caregiverId: IdRule.required("Caregiver is required"), 
    clientId: IdRule.required("Client is required"),
    clientPhone: phoneRule.required("Client Phone is required"), 
    street: shortTextRule.required("Street is required"),
    city: shortTextRule.required("City is required"),
    state: shortTextRule.required("State/Province is required"),
    country: shortTextRule.required("Country is required"),
    startTime: yup.string().required("Start Time is required"), 
    endTime: yup.string().required("End Time is required"), 
    serviceInput: shortTextRule.required("Services Required is required"), 
    pinCode: pinRule,
    contactFName: nameRule.optional(),
    contactLName: nameRule.optional(),
    contactPhone: phoneRule.optional(),
    shiftNotes: shortTextRule.optional(), 
    assignedCaregiver: nameRule.optional(), 
    openShift: yup.boolean().notRequired(), 
    geofenceRadius: yup.number().optional(),
    alertOnEntry: yup.boolean().notRequired(),
    alertOnExit: yup.boolean().notRequired(),
});

export default function Page() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
        resolver: yupResolver(schema),
    });

	const isOpenShift = watch("openShift");

    // --- 2. UTILITY FUNCTIONS ---
    const debounce = (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };


    // ==========================================
    // --- 3. CLIENT SEARCH LOGIC ---
    // ==========================================
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientResults, setClientResults] = useState([]);
    const [showClientResults, setShowClientResults] = useState(false);
    const [selectedClientName, setSelectedClientName] = useState('');

    const fetchClients = async (search) => {
        if (search.length < 2) return;
        const token = localStorage.getItem("token");
        try {
            const url = `https://nvch-server.onrender.com/api/auth/admin/users?role=client&limit=5&search=${encodeURIComponent(search)}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
			//test
			console.log("searched result: ", data.data.users);
            setClientResults(data.data.users || []);
            setShowClientResults(true);
        } catch (err) { console.error("Client fetch error", err); }
    };

    const debouncedFetchClients = useCallback(debounce(fetchClients, 500), []);

    useEffect(() => {
        if (clientSearchTerm && clientSearchTerm !== selectedClientName) debouncedFetchClients(clientSearchTerm);
    }, [clientSearchTerm]);

    const handleClientSelect = (client) => {
        const fullName = `${client.firstName} ${client.lastName}`;
        setValue('clientId', client.clientId);
        setValue('clientPhone', client.phone || '');
        setSelectedClientName(fullName);
        setClientSearchTerm(fullName);
        setShowClientResults(false);
    };


    // ==========================================
    // --- 4. CAREGIVER SEARCH LOGIC ---
    // ==========================================
    const [cgSearchTerm, setCgSearchTerm] = useState('');
    const [cgResults, setCgResults] = useState([]);
    const [showCgResults, setShowCgResults] = useState(false);
    const [selectedCgName, setSelectedCgName] = useState('');

    const fetchCaregivers = async (search) => {
        if (search.length < 2) return;
        const token = localStorage.getItem("token");
        try {
            const url = `https://nvch-server.onrender.com/api/auth/admin/users?role=caregiver&limit=5&search=${encodeURIComponent(search)}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setCgResults(data.data.users || []);
            setShowCgResults(true);
        } catch (err) { console.error("Caregiver fetch error", err); }
    };

    const debouncedFetchCgs = useCallback(debounce(fetchCaregivers, 500), []);

    useEffect(() => {
        if (cgSearchTerm && cgSearchTerm !== selectedCgName) debouncedFetchCgs(cgSearchTerm);
    }, [cgSearchTerm]);

    const handleCgSelect = (cg) => {
        const fullName = `${cg.firstName} ${cg.lastName}`;
        setValue('caregiverId', cg.caregiverId || cg.id);
        setValue('assignedCaregiver', fullName);
        setSelectedCgName(fullName);
        setCgSearchTerm(fullName);
        setShowCgResults(false);
    };


    // ==========================================
    // --- 5. TASK LIST MANAGEMENT ---
    // ==========================================
    const [tasks, setTasks] = useState([]); 
    const [newTask, setNewTask] = useState('');
    
    const addTask = () => {
        if (newTask.trim()) {
          setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
          setNewTask('');
        }
    };
    
    const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));


    // ==========================================
    // --- 6. FORM SUBMISSION ---
    // ==========================================
    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const shiftData = {
                caregiverId: data.caregiverId,
                clientId: data.clientId,
                clientAddress: `${data.street}, ${data.city}, ${data.state}, ${data.pinCode}`,
                clientPhone: data.clientPhone,
                contactPerson: { name: `${data.contactFName} ${data.contactLName}`, phone: data.contactPhone },
                startTime: new Date(data.startTime).toISOString(),
                endTime: new Date(data.endTime).toISOString(),
                servicesRequired: data.serviceInput.split(',').map(s => s.trim()),
                tasks: tasks.map(t => ({ description: t.text, completed: false })),
                isOpenShift: data.openShift || false,
                notes: data.shiftNotes,
                geofence: { 
                    center: { latitude: 44.6488, longitude: -63.5752 }, 
                    radius: data.geofenceRadius || 500, 
                    alertOnEntry: data.alertOnEntry, 
                    alertOnExit: data.alertOnExit 
                }
            };

            const token = localStorage.getItem("token");
            const response = await fetch("https://nvch-server.onrender.com/api/shifts", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(shiftData),
            });

            if (!response.ok) throw new Error("API request failed");
            router.push("/shifts");
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

	// ==========================================
    // --- 7. TAGS MANAGEMENT ---
    // ==========================================
    const quickTags = ["Urgent", "New Client", "Recurring"];
    const [selectedTags, setSelectedTags] = useState(["Urgent"]); // Initial default tags
    const [tagInput, setTagInput] = useState('');

    // Toggle a tag (Add if not there, remove if it is)
    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Add a custom tag from the input
    const addCustomTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!selectedTags.includes(tagInput.trim())) {
                setSelectedTags([...selectedTags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    // Sync with React Hook Form (so it gets sent to API)
    useEffect(() => {
        setValue('tags', selectedTags); 
    }, [selectedTags, setValue]);


    return (
        <PageLayout>
            {/* 1. HEADER SECTION */}
            <div className={styles.header}>
                <h1>Create New Shift</h1>
                <div className={styles.buttons}>
                    <Button variant="secondary" onClick={() => router.push("/scheduling")}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={loading}> 
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.cards}>
                    
                    {/* 2. CLIENT INFORMATION CARD */}
                    <Card>
                        <CardHeader>Client Information</CardHeader>
                        <CardContent>
                            <div className={styles.searchContainer}>
                                <label className={styles.label}>Client Name</label>
                                <div className={styles.searchWrapper}>
                                    <Search className={styles.searchIcon} />
                                    <input 
                                        type="text" 
                                        placeholder="Search clients..." 
                                        className={styles.input}
                                        value={clientSearchTerm}
                                        onChange={(e) => setClientSearchTerm(e.target.value)}
                                        onFocus={() => setShowClientResults(true)}
                                    />
                                </div>
                                {showClientResults && clientResults.length > 0 && (
                                    <div className={styles.searchResultsDropdown}>
                                        {clientResults.map(c => (
                                            <div key={c.id} className={styles.searchResultItem} onMouseDown={() => handleClientSelect(c)}>
                                                {c.firstName} {c.lastName} ({c.email})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className={styles.card_row_2}>
                                <InputField label="Client ID" name="clientId" register={register} error={errors.clientId?.message} readOnly />
                                <InputField label="Client Phone" name="clientPhone" register={register} error={errors.clientPhone?.message} />
                            </div>
                            <div className={styles.card_row_2}>
                                <InputField label="Street" name="street" register={register} />
                                <InputField label="City" name="city" register={register} />
                                <InputField label="State" name="state" register={register} />
                            </div>
                            <div className={styles.card_row_2}>
                                <InputField label="Postal Code" name="pinCode" register={register} />
                                <InputField label="Country" name="country" register={register} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className={styles.column}>
                        {/* 3. SHIFT DETAILS CARD */}
                        <Card>
                            <CardHeader>Shift Information</CardHeader>
                            <CardContent>
                                <div className={styles.card_row_2}>
                                    <InputField label="Start" type="datetime-local" name="startTime" register={register} />
                                    <InputField label="End" type="datetime-local" name="endTime" register={register} />
                                </div>
                                <InputField label="Services Required" name="serviceInput" register={register} placeholder="e.g. Cooking, Bathing" />
                                <InputField label="Shift Notes" name="shiftNotes" register={register} />
                            </CardContent>
                        </Card>

                        {/* 4. CAREGIVER ASSIGNMENT CARD (WITH SEARCH) */}
                        <Card>
                            <CardHeader>Caregiver Assignment</CardHeader>
                            <CardContent>
                                <div className={styles.searchContainer}>
                                    <label className={styles.label}>Search Caregiver</label>
                                    <div className={styles.searchWrapper}>
                                        <Search className={styles.searchIcon} />
                                        <input 
                                            type="text" 
                                            placeholder="Search caregivers..." 
											disabled={isOpenShift}
                                            className={styles.input}
                                            value={cgSearchTerm}
                                            onChange={(e) => setCgSearchTerm(e.target.value)}
                                            onFocus={() => setShowCgResults(true)}
                                        />
                                    </div>
                                    {showCgResults && cgResults.length > 0 && (
                                        <div className={styles.searchResultsDropdown}>
                                            {cgResults.map(cg => (
                                                <div key={cg.id} className={styles.searchResultItem} onMouseDown={() => handleCgSelect(cg)}>
                                                    {cg.firstName} {cg.lastName}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <label className={styles.checkboxLabel} style={{marginTop: '15px'}}>
                                    <input type="checkbox" {...register("openShift")} />
                                    <span>Set as Open Shift (No fixed caregiver)</span>
                                </label>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className={styles.cards}>
                    {/* 5. TASK LIST CARD */}
                    <Card>
                        <CardHeader>Task List</CardHeader>
                        <div className={styles.taskInputGroup}>
                            <input 
                                className={styles.input} 
                                value={newTask} 
                                onChange={(e) => setNewTask(e.target.value)} 
                                placeholder="Add a specific task..." 
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                            />
                            <Button type="button" onClick={addTask}>Add</Button>
                        </div>
                        <div className={styles.taskList}>
                            {tasks.map(t => (
                                <div key={t.id} className={styles.taskItem}>
                                    <span>{t.text}</span>
                                    <button type="button" className={styles.iconButton} onClick={() => deleteTask(t.id)}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </Card>

					{/* 6. ADDITIONAL OPTIONS CARD */}
					<Card>
                        <CardHeader>Additional Options</CardHeader>
                        <CardContent>
                            
                            {/* --- Recurring Shift Toggle --- */}
                            <div className={styles.toggleRow}>
                                <div className={styles.toggleInfo}>
                                    <label className={styles.label}>Recurring Shift</label>
                                </div>
                                <label className={styles.switch}>
                                    <input 
                                        type="checkbox" 
                                        {...register("isRecurring")} 
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            {/* 
                            {isRecurring && (
                                <div className={styles.recurringOptions}>
                                    <p className={styles.helperText}>* Recurring settings can be configured after saving.</p>
                                </div>
                            )}
							*/}

                            <hr className={styles.divider} />

							<div className={styles.tagsGroup}>
								<div className={styles.searchWrapper}>
                                    <Plus size={16} className={styles.searchIcon} />
                                    <input 
                                        type="text"
										className={styles.input} 
                                        placeholder="Add custom tag and press Enter..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
										onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(),addCustomTag())}
                                    />
                                </div>
								<Button type="button" onClick={addCustomTag}>Add</Button>
							</div>


                            {/* --- Tags Section --- */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Quick Tags (Click to toggle)</label>
                                <div className={styles.tagContainer}>
                                    {quickTags.map(tag => (
                                        <span 
                                            key={tag} 
                                            className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagActive : ''}`}
                                            onClick={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* 7. GEOFENCE & MAP CARD */}
                <Card>
                    <CardHeader>Geofence Customization</CardHeader>
                    <div className={styles.gps}>
                        <div className={styles.left}>
                            {/* Map Placeholder */}
                            <div className={styles.mapContainer}>
                                <div className={styles.mapPlaceholder}>
                                    <MapPin size={48} color="#ccc" />
                                    <p>Map View Loading...</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.right}>
                            <InputField 
                                label="Geofence Radius (meters)" 
                                type="number" 
                                name="geofenceRadius" 
                                register={register} 
                            />
                            <div className={styles.buttons} style={{margin: '10px 0'}}>
                                <Button type="button" variant="secondary" icon={<Circle />}>Draw Circle</Button>
                                <Button type="button" variant="secondary" icon={<PencilRuler />}>Manual Adjust</Button>
                            </div>
                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" {...register("alertOnEntry")} />
                                    <span>Alert on Caregiver Entry</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" {...register("alertOnExit")} />
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