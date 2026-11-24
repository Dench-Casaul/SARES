/**
 * Formatting shared by printable documents, so every document writes dates,
 * roles and offense classifications the same way.
 */
import { parseRecordDate } from '../dashboardStats.js';
import { ordinal } from './sanctionLabel.js';

const LEVEL_LABELS = {
  light: 'Light',
  less_serious: 'Less Serious',
  serious: 'Serious',
  very_serious: 'Very Serious',
};

const ROLE_LABELS = {
  staff: 'Staff',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent / Guardian',
  other: 'Other',
};

/** "November 17, 2026" (local date), or '' when unknown. */
export function formatLongDate(value) {
  const date = parseRecordDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "November 17, 2026, 10:15 AM", or '' when unknown. */
export function formatLongDateTime(value) {
  const date = parseRecordDate(value);
  if (!date) return '';
  return `${formatLongDate(date)}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** "14:30" (24-hour, as stored from a time input) → "2:30 PM", or '' when unknown. */
export function formatTimeOfDay(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return '';
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function formatReporterRole(role) {
  const key = String(role || '').trim().toLowerCase();
  return ROLE_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

export function formatOffenseLevel(subcategoryId) {
  return LEVEL_LABELS[subcategoryId] || '';
}

/** "Major Offense · Serious", "Minor Offense · Light", or '' */
export function formatOffenseClassification(record) {
  const type = record?.offense_type === 'major' ? 'Major Offense' : record?.offense_type === 'minor' ? 'Minor Offense' : '';
  return [type, formatOffenseLevel(record?.subcategory_id)].filter(Boolean).join(' · ');
}

/** "1st offense" for the case's offense number, or '' */
export function formatOffenseNumber(record) {
  const number = Number(record?.cumulative_offense_number ?? record?.offense_number);
  return Number.isFinite(number) && number > 0 ? `${ordinal(number)} offense` : '';
}

export function formatSchoolScope(scope) {
  return scope === 'elementary' ? 'Elementary' : scope === 'high_school' ? 'High School' : '';
}
