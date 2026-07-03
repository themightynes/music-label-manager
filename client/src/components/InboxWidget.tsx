import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, MailOpen } from 'lucide-react';
import { useEmails, useUnreadEmailCount } from '@/hooks/useEmails';
import { InboxModal } from './InboxModal';

export function InboxWidget() {
  const [open, setOpen] = useState(false);
  const { data: unreadData, isLoading: unreadLoading } = useUnreadEmailCount();
  const { data, isLoading } = useEmails({ limit: 2 });

  const emails = data?.emails ?? [];
  const unreadCount = unreadData?.count ?? data?.unreadCount ?? 0;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-label="Open inbox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="inbox-modal"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="glass-panel chromatic-hairline group cursor-pointer transition hover:border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-neon-purple/40 h-full flex flex-col"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-xl text-text-primary">
            <Inbox className="h-5 w-5 text-text-accent" />
            Inbox
          </CardTitle>
          <Badge className="font-mono bg-white/[0.04] text-text-muted border border-white/[0.08] rounded-pill" aria-hidden="true">
            {unreadLoading ? "..." : `${unreadCount} unread`}
          </Badge>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {unreadLoading ? "Loading unread messages" : `${unreadCount} unread messages`}
          </span>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-chip bg-white/10" />
              <Skeleton className="h-14 w-full rounded-chip bg-white/10" />
            </div>
          ) : emails.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {emails.map((email) => (
                <div key={email.id} className="space-y-2 pb-3 border-b border-white/[0.06] last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">{email.subject}</p>
                    <Badge variant="outline" className="text-xs text-text-body border-white/[0.08]">
                      {formatCategory(email.category)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {email.preview ?? 'Open to read the full briefing.'}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-label">
                    Week {email.week}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-9">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-purple/[0.12] border border-neon-purple/[0.32] flex items-center justify-center mb-4 shadow-glow-purple">
                <MailOpen className="h-5 w-5 text-text-accent" />
              </div>
              <p className="text-sm font-semibold text-text-primary">No emails yet.</p>
              <p className="text-xs text-text-muted mt-1 max-w-[230px]">Advance the week to receive updates from your team.</p>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full font-medium text-text-body border border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.045] hover:text-text-primary rounded-button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            Open inbox
          </Button>
        </CardContent>
      </Card>

      <InboxModal
        open={open}
        onOpenChange={setOpen}
        initialEmailId={emails[0]?.id ?? null}
        contentId="inbox-modal"
      />
    </>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatCategory(category: string) {
  switch (category) {
    case 'chart':
      return 'Chart';
    case 'financial':
      return 'Financial';
    case 'artist':
      return 'Artist';
    case 'ar':
      return 'A&R';
    case 'other':
      return 'Other';
    default:
      return 'Update';
  }
}
