import React, { useState, useEffect } from "react";
import { SquarePen, Calendar, Clock, Users, Plus, Trash2 } from "lucide-react";
import styles from "./Timesheet.module.css";
import { Table, TableContent, TableCell, TableHeader } from "@components/UI/Table";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { useParams } from "next/navigation";
import Certification from "./Certification";

// Helper function to map day names and group slots for display.
// This transforms the flat backend array (e.g., slot 1, slot 2, slot 3...) 
// into a structured array grouped by day (e.g., Monday: [slot 1, slot 2], Tuesday: [slot 3]),
// which is required for UI rendering.
const groupAvailabilityByDay = (availabilityArray) => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const grouped = {};

    // 1. Initialize all days with empty slots
    daysOrder.forEach(day => {
        grouped[day] = [];
    });

    // 2. Group the backend slots by day
    availabilityArray.forEach(slot => {
        // Normalize day name: 'monday' -> 'Monday'
        const dayName = slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase();
        if (grouped[dayName]) {
            grouped[dayName].push(slot);
        }
    });

    // 3. Convert the grouped object back to an ordered array for rendering
    return daysOrder.map(day => ({
        day: day,
        slots: grouped[day] || []
    }));
};

export default function Timesheet() {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const { id } = useParams();

    // --- State Initialization matching backend structure ---
    const defaultAvailability = [
        // Example structure matching backend flat format
        { day: 'monday', startTime: '09:00', endTime: '13:00', isAvailable: true, notes: '' },
        { day: 'tuesday', startTime: '10:00', endTime: '16:00', isAvailable: true, notes: '' },
    ];

    // availability stores the current editable data (raw flat array from backend)
    const [availability, setAvailability] = useState(defaultAvailability); 
    // originalAvailability stores the data loaded from the backend for cancellation/reset
    const [originalAvailability, setOriginalAvailability] = useState(defaultAvailability);
    
    // --- Other States ---
    const [stats, setStats] = useState([
        { label: "Total Hours Worked (Bi-Weekly)", value: 40.5 },
        { label: "Total Overtime Hours", value: 2.5 },
        { label: "Pending Approvals", value: 3 },
    ]);

    const [shifts, setShifts] = useState([
        {
            id: '1',
            status: "Confirmed",
            date: "Oct 29, 2024",
            shiftTimes: "11:00 AM - 4:00 PM",
            client: "Dr. Maria Lopez",
            services: "Companionship, Specialized Care",
            hoursWorked: 5.0,
            overtime: 0.0,
            approvalStatus: "Approved",
            supervisorComments: "Client very pleased with service.",
        },
        // Remove example data if you want to test the "No Shifts" message initially
    ]);

    const [maxHours, setMaxHours] = useState(80);
    const [lastPeriodHours, setLastPeriodHours] = useState(72);


    // --- useEffect: Data Fetching ---
    useEffect(() => {
        if (!id) {
            console.error("User ID not found in parameters.");
            alert("id not found");
            return;
        }
    
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                console.log("No token found. Please log in.");
                return;
            }
        
            try {
                const res = await fetch(
                    `https://nvch-server.onrender.com/api/auth/admin/users/${id}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
                );
        
                const data = await res.json();
                console.log("Fetched user data:", data);
        
                if (res.ok && data.data) {
                    // Set availability directly from backend (flat array)
                    const backendAvailability = data.data.user.availability || [];
                    setAvailability(backendAvailability);
                    setOriginalAvailability(backendAvailability); // Store the original for reset
            
                    // Set other user data, defaulting if necessary
                    setShifts(data.data.shifts || []); // If backend returns null, use []
                    setStats(data.data.stats || [
                        { label: "Total Hours Worked (Bi-Weekly)", value: 0 },
                        { label: "Total Overtime Hours", value: 0 },
                        { label: "Pending Approvals", value: 0 },
                    ]);
                    setMaxHours(data.data.maxHours || 80);
                    setLastPeriodHours(data.data.lastPeriodHours || 72);
                } else {
                    console.error(data.message || "Failed to fetch user data");
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        };
    
        fetchUserData();
    }, [id]);

    // --- Modal Handlers ---

    // Handles closing the modal and reverting changes to original state
    const handleCancel = () => {
        setIsModalOpen(false);
        setAvailability(originalAvailability); 
        // Reset maxHours/lastPeriodHours to their original loaded values if needed
        setMaxHours(80); 
        setLastPeriodHours(72);
    }

    // Handles saving the changes (sends data back to backend in a real app)
    const handleSave = async () => {
        setIsModalOpen(false);
        // TODO: Implement actual API call to save 'availability' state back to backend
		const submissionBody = {
            employeeId: data.employeeId,
			Certification: [],
			availability: [],
        

            // Emergency Contact structure re-nesting
            emergencyContact: {
                name: `${data.emergencyFName} ${data.emergencyLName}`.trim(),
                phone: data.emergencyPhone,
                relationship: data.relationship
            },
            
        };

		const token = localStorage.getItem("token");
		if (!token) {
			console.log("No token found. Please log in.");
			return;
		}
	
		try {
			const res = await fetch(
				`https://nvch-server.onrender.com/api/auth/admin/users/${id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);
	
			const data = await res.json();
			console.log("Fetched user data:", data);
	
			if (res.ok && data.data) {
				// Set availability directly from backend (flat array)
				const backendAvailability = data.data.user.availability || [];
				setAvailability(backendAvailability);
				setOriginalAvailability(backendAvailability); // Store the original for reset
		
				// Set other user data, defaulting if necessary
				setShifts(data.data.shifts || []); // If backend returns null, use []
				setStats(data.data.stats || [
					{ label: "Total Hours Worked (Bi-Weekly)", value: 0 },
					{ label: "Total Overtime Hours", value: 0 },
					{ label: "Pending Approvals", value: 0 },
				]);
				setMaxHours(data.data.maxHours || 80);
				setLastPeriodHours(data.data.lastPeriodHours || 72);
			} else {
				console.error(data.message || "Failed to fetch user data");
			}
		} catch (err) {
			console.error("Error fetching user data:", err);
		}
	

        console.log("Availability to save:", availability);
        alert("✅ Availability updated successfully!");
        setOriginalAvailability(availability); // Update the original state after saving
    };

    // Updates a specific time field (startTime or endTime) for a slot using its index in the flat array
    const handleTimeChange = (slotIndex, field, value) => {
        const updated = [...availability];
        const key = field === "start" ? "startTime" : "endTime"; // Map UI field to backend field
        updated[slotIndex][key] = value;
        setAvailability(updated);
    };

    // Adds a new default slot for a specific day to the flat array
    const handleAddSlot = (dayName) => {
        const newSlot = {
            day: dayName.toLowerCase(), 
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
            notes: ""
        };
        setAvailability([...availability, newSlot]);
    };

    // Removes a slot using its index in the flat array
    const handleRemoveSlot = (slotIndex) => {
        const updated = availability.filter((_, index) => index !== slotIndex);
        setAvailability(updated);
    };

    // Use the helper function to prepare data for display/layout
    const groupedAvailability = groupAvailabilityByDay(availability);


    return (
        <div className={styles.container}>
            <div className={styles.time}>
                {/* LEFT SIDE: Availability Display */}
                <div className={styles.left}>
                    <div className={styles.header}>
                        <Calendar className={styles.icon} />
                        <h2 className={styles.title}>Availability</h2>
                    </div>

                    <div className={styles.scheduleList}>
                        {groupedAvailability.map((item, index) => (
                            <div key={index} className={styles.scheduleItem}>
                                <div className={styles.day}>{item.day}:</div>
                                <div className={styles.slotsContainer}>
                                    {item.slots.length > 0 ? (
                                        item.slots.map((slot, idx) => (
                                            <span key={idx} className={styles.slot}>
                                                {slot.startTime} - {slot.endTime}
                                            </span>
                                        ))
                                    ) : (
                                        <span className={styles.notAvailable}>Not Available</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE: Work Capacity and Edit Button */}
                <div className={styles.right}>
                    <div className={styles.block}>
                        <div className={styles.header}>
                            <Clock className={styles.icon} />
                            <h2 className={styles.title}>Bi-weekly Work Capacity</h2>
                        </div>
                        <div className={styles.content}>
                            <div className={styles.label}>Max Hours:</div>
                            <div className={styles.value}>{maxHours} hours</div>
                        </div>
                    </div>

                    <div className={styles.block}>
                        <div className={styles.header}>
                            <Users className={styles.icon} />
                            <h2 className={styles.title}>Previous Bi-weekly Work</h2>
                        </div>
                        <div className={styles.content}>
                            <div className={styles.label}>Hours Worked (Last Period):</div>
                            <div className={styles.value}>{lastPeriodHours} hours</div>
                        </div>
                    </div>

                    <div className={styles.button}>
                        <Button icon={<SquarePen />} onClick={() => setIsModalOpen(true)}>
                            Edit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className={styles.hours}>
                {stats.map((stat, index) => (
                    <div key={index} className={styles.hour}>
                        <div className={styles.label}>{stat.label}</div>
                        <div className={styles.value}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Modal for Editing */}
            <Modal isOpen={isModalOpen} onClose={handleCancel}>
                <h2>Edit Timesheet</h2>
                <div className={styles.modalContent}>
                    {/* Availability Editor (Left Column) */}
                    <div>
                        <h3 className={styles.sectionTitle}>Availability</h3>
                        {groupedAvailability.map((dayItem, dayIndex) => (
                            <div key={dayIndex} className={styles.dayBlock}>
                                <div className={styles.dayHeader}>
                                    <strong>{dayItem.day}</strong>
                                    <Button variant="outline" size="sm" onClick={() => handleAddSlot(dayItem.day)}>
                                        <Plus size={14} /> Add Slot
                                    </Button>
                                </div>

                                {dayItem.slots.length > 0 ? (
                                    dayItem.slots.map((slot, slotInnerIndex) => {
                                        // Find the actual index of this slot in the flat 'availability' array for mutation
                                        const flatIndex = availability.findIndex(
                                            s => s.day.toLowerCase() === dayItem.day.toLowerCase() && 
                                            s.startTime === slot.startTime && 
                                            s.endTime === slot.endTime
                                        );
                                        
                                        if (flatIndex === -1) return null; 

                                        return (
                                            <div key={slotInnerIndex} className={styles.slotRow}>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={(e) =>
                                                        handleTimeChange(flatIndex, "start", e.target.value)
                                                    }
                                                    className={styles.timeInput}
                                                />
                                                <span>to</span>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={(e) =>
                                                        handleTimeChange(flatIndex, "end", e.target.value)
                                                    }
                                                    className={styles.timeInput}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveSlot(flatIndex)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className={styles.notAvailableText}>Not Available</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Work Hours Editor (Right Column) */}
                    <div>
                        <h3 className={styles.sectionTitle}>Work Hours</h3>
                        <div className={styles.inputGroup}>
                            <label>Max Hours (Bi-weekly)</label>
                            <input
                                type="number"
                                value={maxHours}
                                onChange={(e) => setMaxHours(e.target.value)}
                                className={styles.numberInput}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Last Period Hours</label>
                            <input
                                type="number"
                                value={lastPeriodHours}
                                onChange={(e) => setLastPeriodHours(e.target.value)}
                                className={styles.numberInput}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Shifts Table Section */}
            <Table>
                <TableHeader>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Shift Times</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Hour Worked</TableCell>
                    <TableCell>Overtime</TableCell>
                    <TableCell>Approval Status</TableCell>
                    <TableCell>Supervisor Comments</TableCell>
                </TableHeader>

                {/* Conditional Rendering: Check if shifts array is populated */}
                {shifts && shifts.length > 0 ? (
                    // Render shift rows
                    shifts.map(c => (
                        <TableContent key={c.id}>
                            <TableCell>{c.status}</TableCell>
                            <TableCell>{c.date}</TableCell>
                            <TableCell>{c.shiftTimes}</TableCell>
                            <TableCell>{c.client}</TableCell>
                            <TableCell>{c.hoursWorked}</TableCell>
                            <TableCell>{c.overtime}</TableCell>
                            <TableCell>{c.approvalStatus}</TableCell>
                            <TableCell>{c.supervisorComments}</TableCell>
                        </TableContent>
                    ))
                ) : (
                    // Render "No Shifts" message
                    <TableContent>
                        <TableCell colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                            No shifts found for this user.
                        </TableCell>
                    </TableContent>
                )}
            </Table>
        </div>
    );
};

