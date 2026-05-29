export interface DocumentSlot {
  id: string
  label: string
  description: string
  required: boolean
  accept: string
}

export const DOCUMENT_SLOTS: Record<string, DocumentSlot[]> = {
  illness_claimant: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',   required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',           required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'physician_statement',  label: 'Physician statement',  description: 'Doctor note confirming illness',      required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'cancellation_proof',   label: 'Cancellation proof',   description: 'Airline/hotel cancellation email',   required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  illness_family: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'physician_statement',  label: 'Physician statement',  description: 'Doctor note for the family member',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  death_family: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'death_certificate',    label: 'Death certificate',    description: 'Official death certificate',         required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  job_loss: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'redundancy_letter',    label: 'Redundancy letter',    description: 'Official employer letter',           required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  natural_disaster: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'official_report',      label: 'Official report',      description: 'Government or news source evidence', required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  travel_advisory: [
    { id: 'booking_confirmation',  label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',         label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'travel_advisory_copy',  label: 'Travel advisory',      description: 'Official government advisory copy',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  default: [
    { id: 'booking_confirmation', label: 'Booking confirmation', description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',        description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'other',                label: 'Supporting document',  description: 'Any relevant supporting document',   required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
}

export function getSlotsForReason(reason: string): DocumentSlot[] {
  return DOCUMENT_SLOTS[reason] ?? DOCUMENT_SLOTS['default']
}

export const CANCELLATION_REASON_LABELS: Record<string, string> = {
  illness_claimant:    'Illness (you)',
  illness_family:      'Illness (family member)',
  death_family:        'Death of family member',
  natural_disaster:    'Natural disaster',
  carrier_bankruptcy:  'Carrier bankruptcy',
  home_uninhabitable:  'Home uninhabitable',
  jury_duty:           'Jury duty',
  job_loss:            'Job loss / redundancy',
  travel_advisory:     'Travel advisory',
}
