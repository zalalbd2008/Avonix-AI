export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a human reply should go, when that differs from the sender. */
  replyTo?: string;
};

export type EmailProvider = {
  name: string;
  send(email: Email): Promise<{ id?: string }>;
};
