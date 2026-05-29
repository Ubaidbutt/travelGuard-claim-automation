import type { ComponentType } from 'react'
import { PlaneTakeoff, HeartPulse, BaggageClaim, Timer } from 'lucide-react'

export interface ClaimTypeConfig {
  id: string
  label: string
  description: string
  shortDescription: string
  icon: ComponentType<{ size?: number; className?: string }>
  iconClass: string
  badgeClass: string
  available: boolean
}

export const CLAIM_TYPES: ClaimTypeConfig[] = [
  {
    id: 'trip_cancellation',
    label: 'Trip Cancellation',
    description: 'Cancelled or cut-short trips due to illness, redundancy, bereavement, and other covered reasons.',
    shortDescription: 'Cancelled or cut-short trip',
    icon: PlaneTakeoff,
    iconClass: 'bg-sky-100 text-sky-600 border-sky-200',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    available: true,
  },
  {
    id: 'medical_emergency',
    label: 'Medical Emergency',
    description: 'Emergency medical treatment and repatriation costs incurred while travelling abroad.',
    shortDescription: 'Emergency treatment abroad',
    icon: HeartPulse,
    iconClass: 'bg-rose-100 text-rose-600 border-rose-200',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    available: false,
  },
  {
    id: 'baggage_loss',
    label: 'Baggage Loss',
    description: 'Lost, stolen, or damaged baggage and personal belongings during your trip.',
    shortDescription: 'Lost or damaged luggage',
    icon: BaggageClaim,
    iconClass: 'bg-amber-100 text-amber-600 border-amber-200',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    available: false,
  },
  {
    id: 'travel_delay',
    label: 'Travel Delay',
    description: 'Compensation for significant delays to your outbound or return journey.',
    shortDescription: 'Outbound or return delay',
    icon: Timer,
    iconClass: 'bg-violet-100 text-violet-600 border-violet-200',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    available: false,
  },
]
