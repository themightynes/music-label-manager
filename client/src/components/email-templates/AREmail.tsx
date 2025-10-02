import { ArtistDiscoveryEmail } from './ArtistDiscoveryEmail';
import { ArtistSigningEmail } from './ArtistSigningEmail';
import type { EmailTemplateProps } from './types';

export function AREmail({ email }: EmailTemplateProps) {
  // Route to appropriate template based on subject
  const subjectLower = email.subject.toLowerCase();

  if (subjectLower.includes('signed') || subjectLower.includes('welcome')) {
    return <ArtistSigningEmail email={email} />;
  }

  return <ArtistDiscoveryEmail email={email} />;
}
