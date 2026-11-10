import { expect, test } from 'bun:test'

import { parseFormData } from '@/utils/validation'

import {
  mailchimpContactNote,
  mailchimpContactSchema,
  mailchimpSubscriptionSchema,
} from './schema'

const contact = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'Please contact me.',
}

function formData(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

test('the contact form accepts a filled form and the newsletter form accepts an address alone', () => {
  expect(
    parseFormData(mailchimpContactSchema, formData(contact))
  ).toMatchObject({ success: true, data: contact })
  expect(
    parseFormData(
      mailchimpSubscriptionSchema,
      formData({ email: contact.email })
    )
  ).toMatchObject({ success: true, data: { email: contact.email } })
})

test.each([
  { field: 'name', max: 100, message: 'name_too_long_' },
  { field: 'subject', max: 100, message: 'subject_too_long_' },
  { field: 'message', max: 850, message: 'message_too_long_' },
])(
  'the contact form accepts a $field of $max characters and rejects one more',
  ({ field, max, message }) => {
    expect(
      parseFormData(
        mailchimpContactSchema,
        formData({ ...contact, [field]: 'a'.repeat(max) })
      )
    ).toMatchObject({ success: true })
    expect(
      parseFormData(
        mailchimpContactSchema,
        formData({ ...contact, [field]: 'a'.repeat(max + 1) })
      )
    ).toMatchObject({ status: 400, fieldErrors: { [field]: message } })
  }
)

test.each([
  { field: 'firstName', message: 'first_name_too_long_' },
  { field: 'lastName', message: 'last_name_too_long_' },
])(
  'the newsletter form accepts a $field of 100 characters and rejects one more',
  ({ field, message }) => {
    expect(
      parseFormData(
        mailchimpSubscriptionSchema,
        formData({ email: contact.email, [field]: 'a'.repeat(100) })
      )
    ).toMatchObject({ success: true })
    expect(
      parseFormData(
        mailchimpSubscriptionSchema,
        formData({ email: contact.email, [field]: 'a'.repeat(101) })
      )
    ).toMatchObject({ status: 400, fieldErrors: { [field]: message } })
  }
)

test("the note built from the longest accepted subject and message fits Mailchimp's 1,000 characters", () => {
  expect(mailchimpContactNote(contact)).toBe(
    'Contact form submission - Subject: Hello\n\nMessage: Please contact me.'
  )

  const longest = { subject: 'a'.repeat(100), message: 'a'.repeat(850) }
  expect(
    parseFormData(mailchimpContactSchema, formData({ ...contact, ...longest }))
  ).toMatchObject({ success: true })
  expect(mailchimpContactNote(longest).length).toBeLessThanOrEqual(1000)
})

test('an empty required contact field keeps its own message', () => {
  expect(
    parseFormData(
      mailchimpContactSchema,
      formData({ ...contact, name: '', subject: '', message: '' })
    )
  ).toMatchObject({
    status: 400,
    fieldErrors: {
      name: 'name_required_',
      subject: 'subject_required_',
      message: 'message_required_',
    },
  })
})
