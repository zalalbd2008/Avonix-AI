export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailProvider = {
  name: string;
  send(email: Email): Promise<{ id?: string }>;
};
