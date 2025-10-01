'use server'

import type { ErrorField, FormState } from '~/components/form/types'
import { fetchWithTimeout } from '~/libs/fetch-with-timeout'
import { validateFormWithTurnstile } from '../mailchimp/turnstile'

export interface ContactData {
  name: string
  email: string
  subject: string
  message: string
}

export interface MandrillConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  toEmail: string
}

// Get Mandrill configuration from environment variables
function getMandrillConfig(): MandrillConfig {
  const apiKey = process.env.MANDRILL_API_KEY
  const fromEmail =
    process.env.MANDRILL_FROM_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL
  const fromName = process.env.MANDRILL_FROM_NAME || 'AE Labs Contact Form'
  const toEmail =
    process.env.MANDRILL_TO_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL

  if (!apiKey) {
    throw new Error('MANDRILL_API_KEY is required')
  }

  if (!(fromEmail && toEmail)) {
    throw new Error(
      'MANDRILL_FROM_EMAIL and MANDRILL_TO_EMAIL (or NEXT_PUBLIC_CONTACT_EMAIL) are required'
    )
  }

  return { apiKey, fromEmail, fromName, toEmail }
}

// Send contact form email via Mandrill
async function sendContactEmail(
  contactData: ContactData
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getMandrillConfig()

    // Create email content
    const emailContent = {
      key: config.apiKey,
      message: {
        html: createEmailTemplate(contactData),
        text: createTextEmail(contactData),
        subject: `[Contact Form] ${contactData.subject}`,
        from_email: config.fromEmail,
        from_name: config.fromName,
        to: [
          {
            email: config.toEmail,
            name: 'AE Labs Team',
            type: 'to',
          },
        ],
        headers: {
          'Reply-To': contactData.email,
        },
        important: false,
        track_opens: true,
        track_clicks: false,
        auto_text: true,
        auto_html: false,
        inline_css: true,
        url_strip_qs: false,
        preserve_recipients: false,
        view_content_link: false,
        tracking_domain: null,
        signing_domain: null,
        return_path_domain: null,
        merge: true,
        tags: ['contact-form'],
        metadata: {
          source: 'website-contact-form',
        },
      },
      async: false,
    }

    const response = await fetchWithTimeout(
      'https://mandrillapp.com/api/1.0/messages/send.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent),
        timeout: 10000, // 10 second timeout for Mandrill API
      }
    )

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      return {
        success: false,
        error: errorData.message || 'Failed to send email',
      }
    }

    const result = (await response.json()) as Array<{
      status: string
      reject_reason?: string
    }>

    // Check if the email was sent successfully
    if (
      result[0] &&
      (result[0].status === 'sent' || result[0].status === 'queued')
    ) {
      return { success: true }
    }

    return {
      success: false,
      error: result[0]?.reject_reason || 'Email delivery failed',
    }
  } catch (error) {
    console.error('Mandrill email error:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

// Create HTML email template
function createEmailTemplate(data: ContactData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Form Submission</title>
      <style>
        body { font-family: 'Courier New', monospace; background: #000; color: #00ff00; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; padding: 20px; }
        .header { border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .field { margin-bottom: 15px; }
        .label { color: #888; font-size: 12px; text-transform: uppercase; }
        .value { color: #00ff00; margin-top: 5px; }
        .message { background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-top: 10px; }
        .footer { border-top: 1px solid #333; margin-top: 20px; padding-top: 10px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #00ff00;">AE Labs - Contact Form Submission</h2>
        </div>
        
        <div class="field">
          <div class="label">Name:</div>
          <div class="value">${escapeHtml(data.name)}</div>
        </div>
        
        <div class="field">
          <div class="label">Email:</div>
          <div class="value"><a href="mailto:${escapeHtml(data.email)}" style="color: #00ff00;">${escapeHtml(data.email)}</a></div>
        </div>
        
        <div class="field">
          <div class="label">Subject:</div>
          <div class="value">${escapeHtml(data.subject)}</div>
        </div>
        
        <div class="field">
          <div class="label">Message:</div>
          <div class="message">${escapeHtml(data.message).replace(/\n/g, '<br>')}</div>
        </div>
        
        <div class="footer">
          <p>Submitted from AE Labs website contact form</p>
          <p>Reply directly to this email to respond to ${escapeHtml(data.name)}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Create plain text email
function createTextEmail(data: ContactData): string {
  return `
AE Labs - Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject}

Message:
${data.message}

---
Submitted from AE Labs website contact form
Reply directly to this email to respond to ${data.name}
  `.trim()
}

// Escape HTML characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Main contact form action using Mandrill
export async function mandrillContactAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    name: formData.get('name')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    subject: formData.get('subject')?.toString() || '',
    message: formData.get('message')?.toString() || '',
  }

  const errors = new Map() as ErrorField

  // Turnstile validation (invisible spam protection)
  const turnstileValidation = await validateFormWithTurnstile(formData)
  if (!turnstileValidation.isValid) {
    for (const error of turnstileValidation.errors) {
      errors.set('turnstile', { state: true, message: error })
    }
  }

  // Basic validation
  if (!rawData.name.trim()) {
    errors.set('name', { state: true, message: 'name_required_' })
  }

  if (!rawData.email.trim()) {
    errors.set('email', { state: true, message: 'email_required_' })
  }

  if (!rawData.subject.trim()) {
    errors.set('subject', { state: true, message: 'subject_required_' })
  }

  if (!rawData.message.trim()) {
    errors.set('message', { state: true, message: 'message_required_' })
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (rawData.email && !emailRegex.test(rawData.email)) {
    errors.set('email', { state: true, message: 'invalid_email_format_' })
  }

  if (errors.size > 0) {
    return {
      status: 400,
      message: 'invalid_input_',
      errors,
      inputs: rawData,
    }
  }

  // Send via Mandrill
  const result = await sendContactEmail(rawData)

  if (!result.success) {
    console.error('Mandrill send error:', result.error)
    errors.set('submit', { state: true, message: 'submission_failed_' })
    return {
      status: 500,
      message: 'submission_failed_',
      errors,
      inputs: rawData,
    }
  }

  return {
    status: 200,
    message: 'message_sent_',
    inputs: {},
    errors: new Map(),
  }
}

// Combined contact form action - uses BOTH Mailchimp AND Mandrill
export async function combinedContactAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    name: formData.get('name')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    subject: formData.get('subject')?.toString() || '',
    message: formData.get('message')?.toString() || '',
  }

  const errors = new Map() as ErrorField

  // Turnstile validation (invisible spam protection)
  const turnstileValidation = await validateFormWithTurnstile(formData)
  if (!turnstileValidation.isValid) {
    for (const error of turnstileValidation.errors) {
      errors.set('turnstile', { state: true, message: error })
    }
  }

  // Basic validation
  if (!rawData.name.trim()) {
    errors.set('name', { state: true, message: 'name_required_' })
  }

  if (!rawData.email.trim()) {
    errors.set('email', { state: true, message: 'email_required_' })
  }

  if (!rawData.subject.trim()) {
    errors.set('subject', { state: true, message: 'subject_required_' })
  }

  if (!rawData.message.trim()) {
    errors.set('message', { state: true, message: 'message_required_' })
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (rawData.email && !emailRegex.test(rawData.email)) {
    errors.set('email', { state: true, message: 'invalid_email_format_' })
  }

  if (errors.size > 0) {
    return {
      status: 400,
      message: 'invalid_input_',
      errors,
      inputs: rawData,
    }
  }

  // Execute BOTH operations in parallel for better performance
  const [mandrillResult, mailchimpResult] = await Promise.allSettled([
    // 1. Send email to your inbox via Mandrill
    sendContactEmail(rawData),

    // 2. Add contact to Mailchimp audience (import the function)
    (async () => {
      const { addContactToMailchimp } = await import('../mailchimp')
      return addContactToMailchimp(rawData)
    })(),
  ])

  // Check results
  const mandrillSuccess =
    mandrillResult.status === 'fulfilled' && mandrillResult.value.success
  const mailchimpSuccess =
    mailchimpResult.status === 'fulfilled' && mailchimpResult.value.success

  // Log any failures but don't fail the entire operation
  if (!mandrillSuccess) {
    const error =
      mandrillResult.status === 'fulfilled'
        ? mandrillResult.value.error
        : mandrillResult.reason
    console.warn('Mandrill email failed:', error)
  }

  if (!mailchimpSuccess) {
    const error =
      mailchimpResult.status === 'fulfilled'
        ? mailchimpResult.value.error
        : mailchimpResult.reason
    console.warn('Mailchimp audience addition failed:', error)
  }

  // Determine success based on what actually matters to the user
  if (mandrillSuccess && mailchimpSuccess) {
    // Perfect - both operations succeeded
    return {
      status: 200,
      message: 'message_sent_',
      inputs: {},
      errors: new Map(),
    }
  }

  if (mandrillSuccess && !mailchimpSuccess) {
    // Email sent but not added to audience - still successful for user
    return {
      status: 200,
      message: 'message_sent_',
      inputs: {},
      errors: new Map(),
    }
  }

  if (!mandrillSuccess && mailchimpSuccess) {
    // Email failed but contact saved - partial success
    // User should know their contact was received even if notification failed
    return {
      status: 200,
      message: 'message_received_', // Different message to indicate partial success
      inputs: {},
      errors: new Map(),
    }
  }

  // Both failed - true error
  errors.set('submit', { state: true, message: 'submission_failed_' })
  return {
    status: 500,
    message: 'submission_failed_',
    errors,
    inputs: rawData,
  }
}
