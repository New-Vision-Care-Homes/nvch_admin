import * as yup from "yup";

export const phoneRule = yup
	.string()
	.notRequired()
	.transform((value) => {
		if (!value) return undefined;
		return value.replace(/\D/g, "");
	})
	.matches(/^\d+$/, {
		message: "Must be digits only",
		excludeEmptyString: true,
	})
	.length(10, "Must be exactly 10 digits");

export const passwordRule = yup
	.string()
	.trim()
	.min(8, "Password must be at least 8 characters")
	.max(100, "Password cannot exceed 100 characters")
	.matches(/[A-Z]/, "Password must contain at least one uppercase letter")
	.matches(/[a-z]/, "Password must contain at least one lowercase letter")
	.matches(/[0-9]/, "Password must contain at least one number")
	.matches(/[^A-Za-z0-9]/, "Password must contain at least one special character")
	.required("Password is required");

export const IdRule = yup
	.string()
	.trim()
	.min(1, "ID must be between 1 and 50 characters")
	.max(50, "ID must be between 1 and 50 characters")
	.uppercase("ID must contain only uppercase letters and numbers")
	.matches(
		/^[A-Z0-9]+$/,
		"Client ID must contain only uppercase letters and numbers"
	)
	.required("Client ID is required for clients");


export const nameRule = yup
	.string()
	.trim()
	.transform((value) => value === "" ? undefined : value)
	.min(1, "Name is required")
	.max(100, "Name must be between 1 and 100 characters")
	.matches(
		/^[a-zA-Z\s'-]+$/,
		"Name can only contain letters, spaces, hyphens, and apostrophes"
	)
	.optional()


export const pinRule = yup
	.string()
	.trim()
	.required("Postal code is required")
	.matches(
		// This regex pattern allows formats like A1A 1A1 or A1A1A1.
		/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
		'Please enter a valid Canadian Postal Code (e.g., A1A 1A1)'
	);

export const birthRule = yup
	.string()
	.trim()
	.required("Date of Birth is required.")

	// 1. Format Check: Must be YYYY-MM-DD
	.test(
		'is-iso-date',
		'Date of birth must be a valid date in YYYY-MM-DD format.',
		(value) => {
			if (!value) return false; // Fail if required and empty
			// This regex helps ensure the YYYY-MM-DD format
			return /^\d{4}-\d{2}-\d{2}$/.test(value);
		}
	)

	// 2. Custom Age Validation (Age must be between 16 and 100)
	.test(
		'age-range',
		'Age must be between 16 and 100 years',
		(value) => {
			if (!value) return true;

			const birthDate = new Date(value);
			const today = new Date();

			// Check if the date is even parseable (prevents non-date strings from crashing the app)
			if (isNaN(birthDate.getTime())) {
				return false;
			}

			// Calculate age precisely
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDifference = today.getMonth() - birthDate.getMonth();

			// Adjust age if the birthday hasn't passed yet this year
			if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}

			// Enforce the 16 to 100 age range
			if (age < 16 || age > 100) {
				return false;
			}

			return true;
		}
	);


export const emailRule = yup
	.string()
	.trim()
	.transform((value) => value === "" ? undefined : value)
	.email("Invalid email")
	.matches(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email')
	.optional();


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
	.max(2000, "Cannot exceed 2000 characters")
	.optional();


export const numberRule = yup
	.number()
	.typeError("Must be a number")
	.optional();

export const booleanRule = yup.boolean().optional();


// --- BASE LOGIC (Your existing dateRule without the .required() part) ---
const baseDateValidation = yup
	.string()
	.matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
	.test("is-valid-date", "Invalid date", (value) => {
		// Crucial: Allow empty values to pass this specific test
		if (!value) return true;

		const [yearStr, monthStr, dayStr] = value.split("-");
		const year = Number(yearStr);
		const month = Number(monthStr);
		const day = Number(dayStr);

		if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

		const date = new Date(year, month - 1, day);

		return (
			date.getFullYear() === year &&
			date.getMonth() === month - 1 &&
			date.getDate() === day
		);
	});

// --- EXPORTED RULES ---

// 1. Required Rule (What your original dateRule likely was)
export const dateRule = baseDateValidation.required("Date is required");

// 2. Optional Rule (The new one you need)
export const dateRuleOptional = baseDateValidation
	.nullable(true) // Allows the field to be null
	// Converts empty string ('') from input to null, which is accepted by .nullable()
	.transform((value) => (value === "" ? null : value))
	.optional(); // Explicitly mark as optional for yup object validation



export const urlRule = yup
	.string()
	.trim()
	.url("Must be a valid URL")
	.optional();




