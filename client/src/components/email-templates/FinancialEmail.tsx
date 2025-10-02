import { FinancialReportEmail } from './FinancialReportEmail';
import { TierUnlockEmail } from './TierUnlockEmail';
import type { EmailTemplateProps } from './types';

export function FinancialEmail({ email }: EmailTemplateProps) {
  // Route to appropriate template based on subject
  const subjectLower = email.subject.toLowerCase();

  if (subjectLower.includes('unlock') || subjectLower.includes('tier') || subjectLower.includes('access')) {
    return <TierUnlockEmail email={email} />;
  }

  return <FinancialReportEmail email={email} />;
}
