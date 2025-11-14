import { Request, Response, NextFunction } from "express";
const expressValidator = require("express-validator");

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = expressValidator.validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors.array(),
    });
  }
  next();
};

// Common validation rules using express-validator v7 API
export const emailValidation = () => [
  expressValidator.body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
];

export const passwordValidation = () => [
  expressValidator.body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
];

export const nameValidation = (field: string = "name") => [
  expressValidator.body(field)
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(`${field} must be between 1 and 50 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`),
];

export const phoneValidation = () => [
  expressValidator.body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// Role validation
export const roleValidation = () => [
  expressValidator.body("role")
    .isIn(["admin", "caregiver", "client"])
    .withMessage("Role must be 'admin', 'caregiver', or 'client'"),
];

// Employee ID validation for caregivers
export const employeeIdValidation = () => [
  expressValidator.body("employeeId")
    .if(expressValidator.body("role").equals("caregiver"))
    .notEmpty()
    .withMessage("Employee ID is required for caregivers")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Employee ID must be between 1 and 50 characters"),
];

// Admin-specific validations
export const adminValidation = () => [
  expressValidator.body("adminLevel")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isIn(["super", "manager", "supervisor"])
    .withMessage("Admin level must be 'super', 'manager', or 'supervisor'"),
  
  expressValidator.body("permissions")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),
  
  expressValidator.body("permissions.*")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isIn([
      "manage_users",
      "manage_shifts", 
      "view_reports",
      "manage_settings",
      "view_audit_logs",
      "manage_caregivers",
      "manage_clients"
    ])
    .withMessage("Invalid permission specified"),
  
  expressValidator.body("department")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Department name cannot exceed 100 characters"),
  
  expressValidator.body("canManageUsers")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isBoolean()
    .withMessage("canManageUsers must be a boolean"),
  
  expressValidator.body("canManageShifts")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isBoolean()
    .withMessage("canManageShifts must be a boolean"),
  
  expressValidator.body("canViewReports")
    .if(expressValidator.body("role").equals("admin"))
    .optional()
    .isBoolean()
    .withMessage("canViewReports must be a boolean"),
];

// Caregiver-specific validations
export const caregiverValidation = () => [
  expressValidator.body("certifications")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isArray()
    .withMessage("Certifications must be an array"),
  
  expressValidator.body("certifications.*.name")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Certificate name must be between 1 and 100 characters"),
  
  expressValidator.body("certifications.*.url")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isURL()
    .withMessage("Certificate URL must be a valid URL"),
  
  expressValidator.body("certifications.*.startDate")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isISO8601()
    .withMessage("Certificate start date must be a valid date"),
  
  expressValidator.body("certifications.*.expiryDate")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isISO8601()
    .withMessage("Certificate expiry date must be a valid date"),
  
  expressValidator.body("certifications.*.renewalDate")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isISO8601()
    .withMessage("Certificate renewal date must be a valid date"),
  
  expressValidator.body("certifications.*.isActive")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isBoolean()
    .withMessage("Certificate isActive must be a boolean"),
  
  expressValidator.body("specialties")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isArray()
    .withMessage("Specialties must be an array"),
  
  expressValidator.body("specialties.*")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each specialty must be between 1 and 100 characters"),
  
  // expressValidator.body("emergencyContact.name")
  //   .if(expressValidator.body("role").equals("caregiver"))
  //   .optional()
  //   .trim()
  //   .isLength({ min: 1, max: 100 })
  //   .withMessage("Emergency contact name must be between 1 and 100 characters"),
  
  // expressValidator.body("emergencyContact.phone")
  //   .if(expressValidator.body("role").equals("caregiver"))
  //   .optional()
  //   .isMobilePhone()
  //   .withMessage("Please provide a valid emergency contact phone number"),
  
  // expressValidator.body("emergencyContact.relationship")
  //   .if(expressValidator.body("role").equals("caregiver"))
  //   .optional()
  //   .trim()
  //   .isLength({ min: 1, max: 50 })
  //   .withMessage("Emergency contact relationship must be between 1 and 50 characters"),
  
  // Availability validation
  expressValidator.body("availability")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isArray()
    .withMessage("Availability must be an array"),
  
  expressValidator.body("availability.*.day")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isIn(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
    .withMessage("Invalid day specified. Must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday"),
  
  expressValidator.body("availability.*.startTime")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),
  
  expressValidator.body("availability.*.endTime")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:MM format"),
  
  expressValidator.body("availability.*.isAvailable")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),
  
  expressValidator.body("availability.*.notes")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Availability notes cannot exceed 200 characters"),
  
  // Feedback validation
  expressValidator.body("feedback")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isArray()
    .withMessage("Feedback must be an array"),
  
  expressValidator.body("feedback.*.clientId")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Client ID must be between 1 and 50 characters"),
  
  expressValidator.body("feedback.*.clientName")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Client name must be between 1 and 100 characters"),
  
  expressValidator.body("feedback.*.rating")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5 stars"),
  
  expressValidator.body("feedback.*.review")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Review cannot exceed 1000 characters"),
  
  expressValidator.body("feedback.*.isVisible")
    .if(expressValidator.body("role").equals("caregiver"))
    .optional()
    .isBoolean()
    .withMessage("isVisible must be a boolean"),
];

// Client ID validation for clients
export const clientIdValidation = () => [
  expressValidator.body("clientId")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("Client ID is required for clients")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Client ID must be between 1 and 50 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Client ID must contain only uppercase letters and numbers"),
];

// Client-specific validations
export const clientValidation = () => [
  // Address validation
  expressValidator.body("address.street")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("Street address is required for clients")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Street address must be between 1 and 200 characters"),
  
  expressValidator.body("address.city")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("City is required for clients")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters"),
  
  expressValidator.body("address.state")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("State is required for clients")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("State must be between 1 and 50 characters"),
  
  expressValidator.body("address.pinCode")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("Postal code is required for clients")
    .matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)
    .withMessage("Please enter a valid Postal code"),
  
  expressValidator.body("address.country")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Country name cannot exceed 50 characters"),
  
  // GPS coordinates validation
  expressValidator.body("address.gpsCoordinates.latitude")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("GPS latitude is required for clients")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  
  expressValidator.body("address.gpsCoordinates.longitude")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("GPS longitude is required for clients")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  
  // Notes validation
  expressValidator.body("notes")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2000 characters"),
  
  // Statutory Decision Maker validation
  expressValidator.body("statutoryDecisionMaker.name")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("SDM name is required for clients")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("SDM name must be between 1 and 100 characters"),
  
  expressValidator.body("statutoryDecisionMaker.phoneNumber")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("SDM phone number is required for clients")
    .isMobilePhone()
    .withMessage("Please provide a valid SDM phone number"),
  
  expressValidator.body("statutoryDecisionMaker.email")
    .if(expressValidator.body("role").equals("client"))
    .notEmpty()
    .withMessage("SDM email is required for clients")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid SDM email address"),
  
  // Care Plan validation (all optional fields with length limits)
  expressValidator.body("carePlan.medicalCondition.chronicConditions")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Chronic conditions cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.medicalCondition.allergies")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Allergies cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.medicalCondition.pastSurgeries")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Past surgeries cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.currentMedications.prescriptionMedications")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Prescription medications cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.currentMedications.otcMedications")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("OTC medications cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.currentMedications.dosageSchedule")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Dosage schedule cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.specialNotes.dietaryRestrictions")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Dietary restrictions cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.specialNotes.mobilityAssistanceNeeds")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Mobility needs cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.specialNotes.cognitiveStatus")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Cognitive status cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.careInstructions.dailyCareTasks")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Daily care tasks cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.careInstructions.emergencyProcedures")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Emergency procedures cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.careInstructions.communicationPreferences")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Communication preferences cannot exceed 2000 characters"),
  
  expressValidator.body("carePlan.careInstructions.otherInstructions")
    .if(expressValidator.body("role").equals("client"))
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Other instructions cannot exceed 2000 characters"),
];

// Date of birth validation
export const dateOfBirthValidation = () => [
  expressValidator.body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date")
    .custom((value: string) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 16 || age > 100) {
        throw new Error("Age must be between 16 and 100 years");
      }
      return true;
    }),
];

export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Remove any potential XSS attempts
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  // Sanitize string fields in body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    });
  }

  next();
};
