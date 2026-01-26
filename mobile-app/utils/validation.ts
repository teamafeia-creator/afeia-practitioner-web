// Fonctions de validation pour AFEIA Patient

import { Config } from '../constants/Config';

// Valider une adresse email
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'L\'email est requis' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  return { valid: true };
};

// Valider un mot de passe (8+ chars, 1 maj, 1 min, 1 chiffre)
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Le mot de passe est requis' };
  }

  if (password.length < Config.PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Le mot de passe doit contenir au moins ${Config.PASSWORD_MIN_LENGTH} caractères` };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une minuscule' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  return { valid: true };
};

// Valider la confirmation du mot de passe
export const validatePasswordConfirm = (password: string, confirm: string): { valid: boolean; error?: string } => {
  if (!confirm || confirm.trim() === '') {
    return { valid: false, error: 'La confirmation du mot de passe est requise' };
  }

  if (password !== confirm) {
    return { valid: false, error: 'Les mots de passe ne correspondent pas' };
  }

  return { valid: true };
};

// Valider un code OTP (6 chiffres)
export const validateOTP = (code: string): { valid: boolean; error?: string } => {
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Le code est requis' };
  }

  const cleanCode = code.replace(/\s/g, '');

  if (cleanCode.length !== Config.OTP_LENGTH) {
    return { valid: false, error: `Le code doit contenir ${Config.OTP_LENGTH} chiffres` };
  }

  if (!/^\d+$/.test(cleanCode)) {
    return { valid: false, error: 'Le code doit contenir uniquement des chiffres' };
  }

  return { valid: true };
};

// Valider un numéro de téléphone
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Le numéro de téléphone est requis' };
  }

  // Nettoyer le numéro
  const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');

  // Format français ou international
  const phoneRegex = /^(\+33|0033|0)[1-9](\d{8})$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: 'Format de numéro de téléphone invalide' };
  }

  return { valid: true };
};

// Valider un champ requis
export const validateRequired = (value: string, fieldName: string = 'Ce champ'): { valid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} est requis` };
  }
  return { valid: true };
};

// Valider un nombre dans une plage
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Cette valeur'
): { valid: boolean; error?: string } => {
  if (isNaN(value)) {
    return { valid: false, error: `${fieldName} doit être un nombre` };
  }

  if (value < min || value > max) {
    return { valid: false, error: `${fieldName} doit être entre ${min} et ${max}` };
  }

  return { valid: true };
};

// Valider une date
export const validateDate = (date: string): { valid: boolean; error?: string } => {
  if (!date || date.trim() === '') {
    return { valid: false, error: 'La date est requise' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Format de date invalide' };
  }

  return { valid: true };
};

// Valider un formulaire complet
export const validateForm = (
  validations: { valid: boolean; error?: string }[]
): { valid: boolean; errors: string[] } => {
  const errors = validations
    .filter(v => !v.valid)
    .map(v => v.error || 'Erreur de validation');

  return {
    valid: errors.length === 0,
    errors,
  };
};

export default {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateOTP,
  validatePhoneNumber,
  validateRequired,
  validateNumberRange,
  validateDate,
  validateForm,
};
