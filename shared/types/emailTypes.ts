export type EmailCategory =
  | "tour_completion"
  | "top_10_debut"
  | "release"
  | "number_one_debut"
  | "tier_unlock"
  | "artist_discovery"
  | "financial_report";

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