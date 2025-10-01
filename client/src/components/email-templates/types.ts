import type { EmailRecord } from '@shared/types/emailTypes';

export type EmailTemplateData = EmailRecord<Record<string, unknown>>;

export interface EmailTemplateProps {
  email: EmailTemplateData;
}
