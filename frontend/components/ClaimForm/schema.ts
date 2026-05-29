import { z } from 'zod'

const uploadedFile = z.object({
  file_url: z.string().url(),
  file_name: z.string(),
})

export const claimFormSchema = z.object({
  // Step 1 — Personal details
  full_name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:         z.string().email('Invalid email address'),
  phone:         z.string().min(7, 'Invalid phone number'),
  policy_number: z.string().min(1, 'Policy number is required'),

  // Step 2 — Insurance details
  departure_date:       z.string().min(1, 'Required'),
  return_date:          z.string().min(1, 'Required'),
  destination_country:  z.string().min(1, 'Required'),
  booking_reference:    z.string().min(1, 'Required'),
  cancellation_reason:  z.enum([
    'illness_claimant', 'illness_family', 'death_family',
    'natural_disaster', 'carrier_bankruptcy', 'home_uninhabitable',
    'jury_duty', 'job_loss', 'travel_advisory',
  ]),
  cancellation_date:    z.string().min(1, 'Required'),
  aware_of_reason_date: z.string().min(1, 'Required'),
  total_cost:           z.number({ error: 'Enter a valid amount' }).positive('Must be greater than 0'),
  already_refunded:     z.number().min(0, 'Cannot be negative'),
  description:          z.string().min(30, 'Please provide more detail (min 30 characters)'),
  confirmation:         z.boolean().refine((value) => value === true, {
    message: 'Please confirm your claim details before submitting.',
  }),

  // Step 3 — Attachments (keyed by document_type / slot.id)
  attachments: z.record(z.string(), uploadedFile.optional()),
})

export type ClaimFormValues = z.infer<typeof claimFormSchema>
