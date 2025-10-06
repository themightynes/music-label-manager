import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
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
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="group relative cursor-pointer border-brand-purple/80 bg-gradient-to-br from-brand-dark-mid via-brand-dark-mid to-brand-dark transition hover:border-brand-burgundy focus:outline-none focus:ring-2 focus:ring-brand-burgundy h-full flex flex-col"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Inbox className="h-5 w-5 text-brand-pink" />
            Inbox
          </CardTitle>
          <Badge className="bg-brand-burgundy text-white">
            {unreadLoading ? '—' : `${unreadCount} unread`}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
              <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
            </div>
          ) : emails.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {emails.map((email) => (
                <div key={email.id} className="space-y-2 pb-3 border-b border-white/10 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{email.subject}</p>
                    <Badge variant="outline" className="text-xs text-white/70">
                      {formatCategory(email.category)}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/60">
                    {email.preview ?? 'Open to read the full briefing.'}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-white/40">
                    Week {email.week}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-white/60">
              <p>No emails yet.</p>
              <p>Advance the week to receive updates from your team.</p>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="bg-brand-burgundy text-white hover:bg-brand-burgundy-light"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            Open inbox
          </Button>
        </CardContent>
      </Card>

      <InboxModal open={open} onOpenChange={setOpen} initialEmailId={emails[0]?.id ?? null} />
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
    default:
      return 'Update';
  }
}
