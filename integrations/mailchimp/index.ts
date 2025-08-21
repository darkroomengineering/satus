// integrations/mailchimp/index.ts

export type {
  ContactData,
  MailchimpConfig,
  SubscriptionData,
} from './action'
export {
  addContactToMailchimp,
  mailchimpContactAction,
  mailchimpSubscriptionAction,
} from './action'
