/**
 * Validation Utilities
 * AFEIA Mobile App
 */

/**
 * Validate email address
 * @param email - The email to validate
 * @returns true if valid, error message if invalid
 */
export function validateEmail(email: string): true | string {
  if (!email || email.trim() === '') {
    return 'L\'adresse email est requise';
  }

  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  if (!emailRegex.test(email)) {
    return 'Adresse email invalide';
  }

  return true;
}

/**
 * Validate password strength
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 digit
 * @param password - The password to validate
 * @returns true if valid, error message if invalid
 */
export function validatePassword(password: string): true | string {
  if (!password || password.length === 0) {
    return 'Le mot de passe est requis';
  }

  if (password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule';
  }

  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule';
  }

  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }

  return true;
}

/**
 * Validate OTP code (6 digits)
 * @param otp - The OTP code to validate
 * @returns true if valid, error message if invalid
 */
export function validateOTP(otp: string): true | string {
  if (!otp || otp.trim() === '') {
    return 'Le code est requis';
  }

  const cleaned = otp.replace(/\s/g, '');

  if (cleaned.length !== 6) {
    return 'Le code doit contenir 6 chiffres';
  }

  if (!/^\d{6}$/.test(cleaned)) {
    return 'Le code doit contenir uniquement des chiffres';
  }

  return true;
}

/**
 * Validate French phone number
 * @param phone - The phone number to validate
 * @returns true if valid, error message if invalid
 */
export function validatePhoneNumber(phone: string): true | string {
  if (!phone || phone.trim() === '') {
    return 'Le numéro de téléphone est requis';
  }

  // Remove spaces, dots, and dashes
  const cleaned = phone.replace(/[\s.-]/g, '');

  // French phone number patterns
  // Mobile: 06XXXXXXXX or 07XXXXXXXX
  // Landline: 01-05XXXXXXXX or 09XXXXXXXX
  // With country code: +33XXXXXXXXX or 0033XXXXXXXXX
  const frenchMobileRegex = /^(?:(?:\+|00)33|0)[67]\d{8}$/;
  const frenchLandlineRegex = /^(?:(?:\+|00)33|0)[1-59]\d{8}$/;

  if (!frenchMobileRegex.test(cleaned) && !frenchLandlineRegex.test(cleaned)) {
    return 'Numéro de téléphone invalide';
  }

  return true;
}

/**
 * Validate required field
 * @param value - The value to check
 * @param fieldName - The field name for the error message
 * @returns true if valid, error message if invalid
 */
export function validateRequired(value: unknown, fieldName: string = 'Ce champ'): true | string {
  if (value === null || value === undefined) {
    return `${fieldName} est requis`;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} est requis`;
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName} est requis`;
  }

  return true;
}

/**
 * Validate minimum length
 * @param value - The string value to check
 * @param minLength - Minimum required length
 * @param fieldName - The field name for the error message
 * @returns true if valid, error message if invalid
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string = 'Ce champ'
): true | string {
  if (!value || value.length < minLength) {
    return `${fieldName} doit contenir au moins ${minLength} caractères`;
  }
  return true;
}

/**
 * Validate maximum length
 * @param value - The string value to check
 * @param maxLength - Maximum allowed length
 * @param fieldName - The field name for the error message
 * @returns true if valid, error message if invalid
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = 'Ce champ'
): true | string {
  if (value && value.length > maxLength) {
    return `${fieldName} ne doit pas dépasser ${maxLength} caractères`;
  }
  return true;
}

/**
 * Validate numeric value
 * @param value - The value to check
 * @param fieldName - The field name for the error message
 * @returns true if valid, error message if invalid
 */
export function validateNumeric(value: string, fieldName: string = 'Ce champ'): true | string {
  if (value && !/^\d+$/.test(value)) {
    return `${fieldName} doit être un nombre`;
  }
  return true;
}

/**
 * Validate that passwords match
 * @param password - The password
 * @param confirmPassword - The confirmation password
 * @returns true if valid, error message if invalid
 */
export function validatePasswordMatch(password: string, confirmPassword: string): true | string {
  if (password !== confirmPassword) {
    return 'Les mots de passe ne correspondent pas';
  }
  return true;
}

/**
 * Compose multiple validators
 * @param value - The value to validate
 * @param validators - Array of validator functions
 * @returns true if all validators pass, first error message if any fails
 */
export function composeValidators<T>(
  value: T,
  validators: Array<(value: T) => true | string>
): true | string {
  for (const validator of validators) {
    const result = validator(value);
    if (result !== true) {
      return result;
    }
  }
  return true;
}

// Export validation utilities object for convenience
export const validation = {
  email: validateEmail,
  password: validatePassword,
  otp: validateOTP,
  phone: validatePhoneNumber,
  required: validateRequired,
  minLength: validateMinLength,
  maxLength: validateMaxLength,
  numeric: validateNumeric,
  passwordMatch: validatePasswordMatch,
  compose: composeValidators,
};

export default validation;
