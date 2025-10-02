import { TourCompletionEmail } from './TourCompletionEmail';
import { ReleaseEmail } from './ReleaseEmail';
import type { EmailTemplateProps } from './types';

export function ArtistEmail({ email }: EmailTemplateProps) {
  // Route to appropriate template based on subject or description
  const subjectLower = email.subject.toLowerCase();
  const body = email.body as Record<string, any>;
  const descriptionLower = (body?.description ?? '').toLowerCase();

  if (subjectLower.includes('tour') || descriptionLower.includes('tour')) {
    return <TourCompletionEmail email={email} />;
  }

  return <ReleaseEmail email={email} />;
}
