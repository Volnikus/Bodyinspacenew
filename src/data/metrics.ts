import type { NumericMetricKey, OrganId } from '../engine/types'

export interface MetricInfo {
  label: string
  /** Label for tight spaces. */
  short: string
  unit: string
  decimals: number
  organ: OrganId
  /** Normal range shown beside inputs. */
  normal: string
  min: number
  max: number
  step: number
}

export const METRIC_INFO: Record<NumericMetricKey, MetricInfo> = {
  hr: { label: 'Heart rate', short: 'Pulse', unit: 'bpm', decimals: 0, organ: 'heart', normal: '51–90', min: 30, max: 200, step: 1 },
  sbp: { label: 'Systolic pressure', short: 'Systolic', unit: 'mmHg', decimals: 0, organ: 'heart', normal: '111–219', min: 60, max: 240, step: 1 },
  dbp: { label: 'Diastolic pressure', short: 'Diastolic', unit: 'mmHg', decimals: 0, organ: 'heart', normal: 'below 80', min: 30, max: 140, step: 1 },
  rr: { label: 'Breathing rate', short: 'Breaths', unit: '/min', decimals: 0, organ: 'lungs', normal: '12–20', min: 4, max: 40, step: 1 },
  spo2: { label: 'Oxygen saturation', short: 'SpO2', unit: '%', decimals: 0, organ: 'lungs', normal: '96 or more', min: 80, max: 100, step: 1 },
  temp: { label: 'Temperature', short: 'Temp', unit: '°C', decimals: 1, organ: 'skin', normal: '36.1–38.0', min: 34, max: 41, step: 0.1 },
  glucose: { label: 'Fasting glucose', short: 'Glucose', unit: 'mg/dL', decimals: 0, organ: 'blood', normal: '70–99', min: 30, max: 300, step: 1 },
  sleepH: { label: 'Sleep last night', short: 'Sleep', unit: 'h', decimals: 1, organ: 'brain', normal: '7–9', min: 0, max: 12, step: 0.5 },
  phq9: { label: 'Mood check (PHQ-9)', short: 'Mood', unit: 'pts', decimals: 0, organ: 'brain', normal: '0–4', min: 0, max: 27, step: 1 },
  phq9Item9: { label: 'PHQ-9 item 9', short: 'Item 9', unit: '', decimals: 0, organ: 'brain', normal: '0', min: 0, max: 3, step: 1 },
  exerciseMin: { label: 'Exercise today', short: 'Exercise', unit: 'min', decimals: 0, organ: 'bones', normal: '120 a day', min: 0, max: 180, step: 5 },
  reactionMs: { label: 'Reaction time', short: 'Reaction', unit: 'ms', decimals: 0, organ: 'brain', normal: 'your own baseline', min: 150, max: 1000, step: 1 },
}

export function formatMetric(key: NumericMetricKey, value: number): string {
  return value.toFixed(METRIC_INFO[key].decimals)
}
