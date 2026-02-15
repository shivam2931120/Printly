/**
 * Security utilities for input sanitization and XSS prevention.
 */

/**
 * Sanitize a string to prevent XSS attacks.
 * Strips HTML tags and encodes special characters.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize for plain text display (strip all HTML).
 */
export const stripHtml = (input: string): string => {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Validate email format.
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate that a string is a safe file name.
 */
export const isSafeFileName = (name: string): boolean => {
  // No path traversal, no null bytes, no control chars
  return !/[<>:"/\\|?*\x00-\x1f]/.test(name) && !name.includes('..');
};

/**
 * Sanitize file name for safe storage.
 */
export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.\./g, '_')
    .slice(0, 255);
};

/**
 * Simple CSRF state token generator for client-side flows.
 */
export const generateCsrfToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Mask sensitive data for display (e.g., email masking).
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : `${local[0]}***`;
  return `${masked}@${domain}`;
};

/**
 * Validate password strength.
 * Returns an object with strength score and feedback.
 */
export const checkPasswordStrength = (password: string): {
  score: number; // 0-4
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else feedback.push('Mix uppercase and lowercase');

  if (/\d/.test(password)) score++;
  else feedback.push('Add a number');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Add a special character');

  return { score, feedback };
};
