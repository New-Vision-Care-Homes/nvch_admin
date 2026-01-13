"use client";

import React, { useState, useEffect } from "react";
import styles from "./Certification.module.css";
import { Trash2, Paperclip, Upload, X, Eye, ExternalLink, FileText } from "lucide-react";
import Button from "@components/UI/Button";
import Modal from "@components/UI/Modal";
import { Table, TableHeader, TableContent, TableCell } from "@components/UI/Table";
import { InputField } from "@components/UI/Card";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { dateRule, longTextRule, shortTextRule } from "@app/validation";
import { useParams } from "next/navigation";
import { useUser } from "@/hooks/useUsers";

const API_BASE_URL = "https://nvch-server.onrender.com";

const schema = yup.object({
    name: longTextRule.required("Certificate name is required"),
    issueDate: dateRule.required("Issue date is required"),
    expiryDate: dateRule.required("Expiry date is required"),
    file: yup.mixed().test("required", "Please upload a document", (value) => {
        return value && value.length > 0;
    })
});

export default function Certification() {

	const { id } = useParams();
	const { data, isLoading, error, isError } = useUser(id);
	
	console.log("data; ", data?.data?.user?.certifications);
	//console.log("data; ", data.data.user.certifications);
	const certifications = data?.data?.user?.certifications || [];
	const [isUploading, setIsUploading] = useState(false);

	const [isModalOpen, setIsModalOpen] = useState(false);


	const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
        resolver: yupResolver(schema),
    });

    const selectedIssueDate = watch("issueDate");
    const selectedExpiryDate = watch("expiryDate");
    const selectedFile = watch("file");

    useEffect(() => {
        if (selectedIssueDate && selectedExpiryDate) {
            if (new Date(selectedExpiryDate) <= new Date(selectedIssueDate)) {
                alert("Expiry date must be after issue date");
                setValue("expiryDate", ""); 
            }
        }
    }, [selectedIssueDate, selectedExpiryDate, setValue]);

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

	const handleSave = async (formData) => {
        setIsUploading(true);
        try {
            const file = formData.file[0];
            if (!file) {
                alert("Please select a file first");
                return;
            }

            /**
             * STEP 1: Request Signed Upload URL from Backend
             * Purpose: Get a secure, temporary link to upload directly to S3.
             */
            const queryParams = new URLSearchParams({
                uploadType: 'certificate',
				userId: id,
                mimeType: file.type,
                fileSize: file.size.toString(),
                certificateType: file.name
            });

			const token = localStorage.getItem("token");

            const signedUrlResponse = await fetch(`${API_BASE_URL}/api/upload/signed-url?${queryParams.toString()}`, {
                method: 'GET',
                headers: { 
                    Authorization: `Bearer ${token}`,
                }
            });

            if (!signedUrlResponse.ok) throw new Error("Failed to fetch signed URL");
            
            const { data: { uploadUrl, fileKey } } = await signedUrlResponse.json();

            /**
             * STEP 2: Upload Binary File to AWS S3
             * Purpose: Send the file data directly to S3 using the PUT URL.
             */
            const s3UploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!s3UploadResponse.ok) throw new Error("Failed to upload file to S3");

            /**
             * STEP 3: Save Metadata to MongoDB
             * Purpose: Notify the backend that the file is uploaded and link it to the user.
             */
            const req = {
                fileKey: fileKey,
                name: formData.name,
                startDate: new Date(formData.issueDate).toISOString(),
                expiryDate: new Date(formData.expiryDate).toISOString(),
                // Example: set renewalDate 1 month before expiry
                renewalDate: new Date(new Date(formData.expiryDate).setMonth(new Date(formData.expiryDate).getMonth() - 1)).toISOString()
            };

            const dbResponse = await fetch(`${API_BASE_URL}/api/upload/certificate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req)
            });

            const result = await dbResponse.json();
			console.log("result: ", result);

            if (result.success) {
                setIsModalOpen(false);
                reset(); // Reset form fields
                alert("Certificate uploaded successfully!");
            } else {
                throw new Error(result.message || "Database save failed");
            }

        } catch (error) {
            console.error("Workflow Error:", error);
            alert(`Process failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<h2>Certifications</h2>
				<Button onClick={handleNewCertification}>
					<Upload size={16} style={{ marginRight: 8 }} />
					Upload New Certificate
				</Button>
			</div>

			<Table>
				<TableHeader>
					<TableCell>Name</TableCell>
					<TableCell>Issue Date</TableCell>
					<TableCell>Expiry Date</TableCell>
					<TableCell>Status</TableCell>
					<TableCell>Document</TableCell>
				</TableHeader>
				{certifications.map(c => (
					<TableContent key={c._id}>
						<TableCell>{c.name}</TableCell>
						<TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString() : "-"}</TableCell>
						<TableCell>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "-"}</TableCell>
						<TableCell>
						{c.certificateUrl ? (
							<a 
								href={c.certificateUrl} 
								target="_blank" 
								rel="noopener noreferrer" 
								className={styles.viewFileBtn}
							>
								<Eye size={14} />
								<span>View Document</span>
								<ExternalLink size={12} className={styles.externalIcon} />
							</a>
						) : (
							<span className={styles.noFile}>No File</span>
						)}
                        </TableCell>
						<TableCell>{c.isActive ? "Active" : "Inactive"}</TableCell>
					</TableContent>
				))}
			</Table>


			{/* Modal */}
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2 style={{ marginBottom: '20px' }}>Add New Certificate</h2>
                
                <form onSubmit={handleSubmit(handleSave)}>
                    <InputField label="Certificate Name" name="name" register={register} error={errors.name} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <InputField label="Issue Date" type="date" name="issueDate" register={register} error={errors.issueDate} />
                        <InputField label="Expiry Date" type="date" name="expiryDate" register={register} error={errors.expiryDate} />
                    </div>

					<div className={styles.uploadField}>
                        <label className={styles.label}>Certificate Document</label>
                        <div className={`${styles.dropzone} ${errors.file ? styles.errorBorder : ""}`}>
                            <input 
                                type="file" 
                                id="certFile"
                                {...register("file")} 
                                className={styles.hiddenInput} 
                            />
                            <label htmlFor="certFile" className={styles.uploadTrigger}>
                                <Paperclip size={18} />
                                <span>{selectedFile?.[0] ? selectedFile[0].name : "Click to select a file (PDF, JPG...)"}</span>
                                {selectedFile?.[0] && (
                                    <X size={16} className={styles.clearFile} onClick={(e) => {
                                        e.preventDefault();
                                        setValue("file", null);
                                    }}/>
                                )}
                            </label>
                        </div>
                        {errors.file && <p className={styles.errorMessage}>{errors.file.message}</p>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
                        <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Certificate</Button>
                    </div>
                </form>
            </Modal>
		</div>
	);
}

