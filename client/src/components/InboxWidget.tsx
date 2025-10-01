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
  const { data, isLoading } = useEmails({ limit: 1 });

  const latestEmail = data?.emails?.[0] ?? null;
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
        className="group relative cursor-pointer border-[#4e324c]/80 bg-gradient-to-br from-[#28131d] via-[#221018] to-[#1b0e14] transition hover:border-[#A75A5B] focus:outline-none focus:ring-2 focus:ring-[#A75A5B]"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Inbox className="h-5 w-5 text-[#F6B5B6]" />
            Inbox
          </CardTitle>
          <Badge className="bg-[#A75A5B] text-white">
            {unreadLoading ? '—' : `${unreadCount} unread`}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
          ) : latestEmail ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{latestEmail.subject}</p>
                <Badge variant="outline" className="text-xs text-white/70">
                  {formatCategory(latestEmail.category)}
                </Badge>
              </div>
              <p className="text-xs text-white/60">
                {latestEmail.preview ?? 'Open to read the full briefing.'}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-white/40">
                {formatTimestamp(latestEmail.createdAt)} • Week {latestEmail.week}
              </p>
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
            className="bg-[#A75A5B] text-white hover:bg-[#c3747a]"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
          >
            Open inbox
          </Button>
        </CardContent>
      </Card>

      <InboxModal open={open} onOpenChange={setOpen} initialEmailId={latestEmail?.id ?? null} />
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
    case 'tour_completion':
      return 'Tour';
    case 'top_10_debut':
      return 'Top 10 Debut';
    case 'number_one_debut':
      return '#1 Debut';
    case 'release':
      return 'Release';
    case 'tier_unlock':
      return 'Tier Unlock';
    case 'artist_discovery':
      return 'Artist Discovery';
    case 'financial_report':
      return 'Financial Report';
    default:
      return 'Update';
  }
}
