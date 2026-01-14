'use client'

import { Form, Messages, SubmitButton } from '@/components/ui/form'
import { InputField, TextareaField } from '@/components/ui/form/fields'
import { demoFormAction } from './form-demo-action'

export function FormDemo() {
  return (
    <div className="w-full max-w-md">
      <Form
        action={demoFormAction}
        onSuccess={(state) => console.log('Success:', state)}
        onError={(state) => console.log('Error:', state)}
        className="flex flex-col gap-4"
      >
        <InputField
          id="name"
          type="text"
          label="Name"
          placeholder="Your name"
          required
          idx={0}
        />
        <InputField
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          required
          idx={1}
        />
        <TextareaField
          id="message"
          label="Message"
          placeholder="Your message..."
          rows={4}
          idx={2}
        />
        <Messages />
        <SubmitButton
          className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20 disabled:opacity-50"
          defaultText="Send Message"
          pendingText="Sending..."
          successText="Sent!"
          errorText="Failed"
        />
      </Form>
    </div>
  )
}
