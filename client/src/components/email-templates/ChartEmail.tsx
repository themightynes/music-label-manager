import { Top10DebutEmail } from './Top10DebutEmail';
import { NumberOneDebutEmail } from './NumberOneDebutEmail';
import type { EmailTemplateProps } from './types';

export function ChartEmail({ email }: EmailTemplateProps) {
  // Route to appropriate template based on subject
  if (email.subject.includes('#1')) {
    return <NumberOneDebutEmail email={email} />;
  }
  return <Top10DebutEmail email={email} />;
}
