export const EMAIL_CATEGORIES = [
  "chart",
  "financial",
  "artist",
  "ar",
  "other"
] as const;

export type EmailCategory = typeof EMAIL_CATEGORIES[number];

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  chart: 'Chart',
  financial: 'Financial',
  artist: 'Artist',
  ar: 'A&R',
  other: 'Other'
};

export interface EmailMetadataBase {
  [key: string]: unknown;
}

export interface EmailRecord<Metadata extends EmailMetadataBase = EmailMetadataBase> {
  id: string;
  gameId: string;
  week: number;
  category: EmailCategory;
  sender: string;
  senderRoleId?: string | null;
  subject: string;
  preview?: string | null;
  body: Metadata;
  metadata: EmailMetadataBase;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailPayload<Metadata extends EmailMetadataBase = EmailMetadataBase> {
  gameId: string;
  week: number;
  category: EmailCategory;
  sender: string;
  senderRoleId?: string | null;
  subject: string;
  preview?: string | null;
  body: Metadata;
  metadata?: EmailMetadataBase;
}

export type EmailTemplateMap = Record<EmailCategory, string>;
