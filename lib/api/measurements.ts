import { supabase } from '@/lib/supabase';

// Types
export interface MeasurementData {
  weight?: number;
  body_fat_percentage?: number;
  chest?: number;
  shoulders?: number;
  neck?: number;
  bicep_left?: number;
  bicep_right?: number;
  forearm_left?: number;
  forearm_right?: number;
  waist?: number;
  hips?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
  notes?: string;
  unit?: 'in' | 'cm';
}

export interface MeasurementEntry extends MeasurementData {
  id: string;
  user_id: string;
  measured_at: string;
  created_at: string;
}

// Save or update measurements for a date
export async function saveMeasurements(
  userId: string,
  date: string,
  data: MeasurementData
): Promise<MeasurementEntry> {
  // Filter out undefined values
  const cleanData: Record<string, any> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanData[key] = value;
    }
  });

  const { data: result, error } = await supabase
    .from('body_measurements')
    .upsert(
      {
        user_id: userId,
        measured_at: date,
        ...cleanData,
      },
      {
        onConflict: 'user_id,measured_at',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return result;
}

// Get measurements for a specific date
export async function getMeasurements(
  userId: string,
  date: string
): Promise<MeasurementEntry | null> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .eq('measured_at', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

// Get the most recent measurements
export async function getLatestMeasurements(
  userId: string
): Promise<MeasurementEntry | null> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

// Get all measurement entries (for history/charts)
export async function getMeasurementHistory(
  userId: string,
  limit?: number
): Promise<MeasurementEntry[]> {
  let query = supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// Delete measurements for a date
export async function deleteMeasurements(
  userId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('user_id', userId)
    .eq('measured_at', date);

  if (error) throw error;
}

// Get measurement dates (for calendar marking)
export async function getMeasurementDates(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('measured_at')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(d => d.measured_at);
}

// Measurement field labels for display
export const MEASUREMENT_FIELDS: { key: keyof MeasurementData; label: string; section: string }[] = [
  // General
  { key: 'weight', label: 'Weight', section: 'General' },
  { key: 'body_fat_percentage', label: 'Body Fat %', section: 'General' },
  // Upper Body
  { key: 'chest', label: 'Chest', section: 'Upper Body' },
  { key: 'shoulders', label: 'Shoulders', section: 'Upper Body' },
  { key: 'neck', label: 'Neck', section: 'Upper Body' },
  { key: 'bicep_left', label: 'Bicep (L)', section: 'Upper Body' },
  { key: 'bicep_right', label: 'Bicep (R)', section: 'Upper Body' },
  { key: 'forearm_left', label: 'Forearm (L)', section: 'Upper Body' },
  { key: 'forearm_right', label: 'Forearm (R)', section: 'Upper Body' },
  // Core
  { key: 'waist', label: 'Waist', section: 'Core' },
  { key: 'hips', label: 'Hips', section: 'Core' },
  // Lower Body
  { key: 'thigh_left', label: 'Thigh (L)', section: 'Lower Body' },
  { key: 'thigh_right', label: 'Thigh (R)', section: 'Lower Body' },
  { key: 'calf_left', label: 'Calf (L)', section: 'Lower Body' },
  { key: 'calf_right', label: 'Calf (R)', section: 'Lower Body' },
];

// Chartable measurement fields (excluding weight which has its own chart)
export const CHARTABLE_FIELDS: { key: keyof MeasurementData; label: string; isLossGood?: boolean }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'waist', label: 'Waist', isLossGood: true },
  { key: 'hips', label: 'Hips', isLossGood: true },
  { key: 'bicep_left', label: 'Bicep (L)' },
  { key: 'bicep_right', label: 'Bicep (R)' },
  { key: 'forearm_left', label: 'Forearm (L)' },
  { key: 'forearm_right', label: 'Forearm (R)' },
  { key: 'thigh_left', label: 'Thigh (L)' },
  { key: 'thigh_right', label: 'Thigh (R)' },
  { key: 'calf_left', label: 'Calf (L)' },
  { key: 'calf_right', label: 'Calf (R)' },
  { key: 'neck', label: 'Neck' },
  { key: 'body_fat_percentage', label: 'Body Fat %', isLossGood: true },
];

// Timeline data point
export interface MeasurementTimelinePoint {
  date: string;
  value: number;
}

// Get timeline data for a specific measurement type
export async function getMeasurementTimeline(
  userId: string,
  measurementType: keyof MeasurementData
): Promise<MeasurementTimelinePoint[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select(`measured_at, ${measurementType}`)
    .eq('user_id', userId)
    .not(measurementType, 'is', null)
    .order('measured_at', { ascending: true });

  if (error) throw error;

  return (data || [])
    .filter(d => d[measurementType] !== null && d[measurementType] !== undefined)
    .map(d => ({
      date: d.measured_at,
      value: d[measurementType] as number,
    }));
}

// Comparison result for a measurement
export interface MeasurementComparison {
  key: keyof MeasurementData;
  label: string;
  firstValue: number | null;
  latestValue: number | null;
  change: number | null;
  isLossGood?: boolean;
}

// Compare first and latest measurements
export function compareMeasurements(
  first: MeasurementEntry | null,
  latest: MeasurementEntry | null
): MeasurementComparison[] {
  const comparisons: MeasurementComparison[] = [];

  const fieldsToCompare: { key: keyof MeasurementData; label: string; isLossGood?: boolean }[] = [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist', isLossGood: true },
    { key: 'hips', label: 'Hips', isLossGood: true },
    { key: 'bicep_left', label: 'Bicep (L)' },
    { key: 'bicep_right', label: 'Bicep (R)' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'thigh_left', label: 'Thigh (L)' },
    { key: 'thigh_right', label: 'Thigh (R)' },
    { key: 'body_fat_percentage', label: 'Body Fat %', isLossGood: true },
  ];

  for (const field of fieldsToCompare) {
    const firstVal = first?.[field.key] as number | undefined;
    const latestVal = latest?.[field.key] as number | undefined;

    if (firstVal !== undefined || latestVal !== undefined) {
      comparisons.push({
        key: field.key,
        label: field.label,
        firstValue: firstVal ?? null,
        latestValue: latestVal ?? null,
        change: (firstVal !== undefined && latestVal !== undefined)
          ? Math.round((latestVal - firstVal) * 10) / 10
          : null,
        isLossGood: field.isLossGood,
      });
    }
  }

  return comparisons;
}

// Get first measurement entry
export async function getFirstMeasurements(
  userId: string
): Promise<MeasurementEntry | null> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

// Delete measurement by ID
export async function deleteMeasurementById(id: string): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
