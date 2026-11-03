/**
 * Phone number utilities for True Clothing
 * Standardizes Ethiopian phone numbers to international format (+251...)
 */

export function normalizePhone(raw) {
  if (!raw) return null;
  let str = String(raw).trim().replace(/[\s\-\(\)\.]/g, '');

  // If already starts with +251
  if (str.startsWith('+251')) {
    const rest = str.slice(4);
    if (/^[79]\d{8}$/.test(rest)) return str;
    // Allow general international or valid numbers
    if (/^\d{8,12}$/.test(rest)) return str;
  }

  // If starts with 251 without +
  if (str.startsWith('251')) {
    const rest = str.slice(3);
    if (/^[79]\d{8}$/.test(rest)) return `+${str}`;
    if (/^\d{8,12}$/.test(rest)) return `+${str}`;
  }

  // If starts with 09 or 07 (standard Ethiopian mobile)
  if (/^0[79]\d{8}$/.test(str)) {
    return `+251${str.slice(1)}`;
  }

  // If 9 digits starting with 9 or 7 (e.g. 911223344)
  if (/^[79]\d{8}$/.test(str)) {
    return `+251${str}`;
  }

  // If starts with international '+' and valid international length
  if (/^\+[1-9]\d{7,14}$/.test(str)) {
    return str;
  }

  // Fallback: if at least 9 digits
  const digits = str.replace(/\D/g, '');
  if (digits.length === 9 && /^[79]/.test(digits)) {
    return `+251${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+251${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('251')) {
    return `+${digits}`;
  }

  return null;
}

export function cleanDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function formatPhone(phone) {
  if (!phone) return '';
  const str = String(phone);
  if (str.startsWith('+251') && str.length === 13) {
    return `0${str.slice(4, 6)} ${str.slice(6, 9)} ${str.slice(9)}`;
  }
  return str;
}

