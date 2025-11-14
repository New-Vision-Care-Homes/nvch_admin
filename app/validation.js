import * as yup from "yup";

export const nameRule = yup
	.string()
	.trim()
	.min(1, "Name is required")
	.max(50, "Name cannot exceed 50 characters");

export const emailRule = yup
	.string()
	.trim()
	.email("Invalid email")
	.required("Email is required");

export const phoneRule = yup
	.string()
	.trim()
	.matches(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
	.required("Phone is required");

export const addressRule = yup
	.string()
	.trim()
	.min(5, "Address is too short")
	.max(300, "Address cannot exceed 300 characters")
	.required("Address is required");


export const shortTextRule = yup
	.string()
	.trim()
	.max(20, "Cannot exceed 20 characters")
	.optional();

export const longTextRule = yup
	.string()
	.trim()
	.max(500, "Cannot exceed 500 characters")
	.optional();


export const numberRule = yup
	.number()
	.typeError("Must be a number")
	.optional();

export const booleanRule = yup.boolean().optional();

export const dateRule = yup
	.string()
	.matches(/^\d{4}\/\d{2}\/\d{2}$/, "Date must be in YYYY/MM/DD format")
	.test("is-valid-date", "Invalid date", (value) => {
		if (!value) return false;
		const [year, month, day] = value.split("/").map(Number);
		const date = new Date(year, month - 1, day);
		return (
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
		);
	})
	.required("Date is required");


export const urlRule = yup
	.string()
	.trim()
	.url("Must be a valid URL")
	.optional();


