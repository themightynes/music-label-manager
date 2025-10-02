import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useEmails, useMarkEmailRead, useUnreadEmailCount } from '@/hooks/useEmails';
import type { EmailCategory } from '@shared/types/emailTypes';
import type { EmailTemplateData, EmailTemplateProps } from './email-templates';
import {
  AREmail,
  ChartEmail,
  ArtistEmail,
  FinancialEmail,
} from './email-templates';

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  chart: 'Chart',
  financial: 'Financial',
  artist: 'Artist',
  ar: 'A&R',
};

const CATEGORY_OPTIONS: { value: 'all' | EmailCategory; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'chart', label: 'Chart' },
  { value: 'financial', label: 'Financial' },
  { value: 'artist', label: 'Artist' },
  { value: 'ar', label: 'A&R' },
];

const TEMPLATE_MAP: Record<EmailCategory, React.ComponentType<EmailTemplateProps>> = {
  chart: ChartEmail, // Handles both top 10 and #1 debuts
  financial: FinancialEmail, // Handles financial reports and tier unlocks
  artist: ArtistEmail, // Handles tours and releases
  ar: AREmail, // Handles artist discovery and signing
};

interface InboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmailId?: string | null;
}

export function InboxModal({ open, onOpenChange, initialEmailId }: InboxModalProps) {
  const [category, setCategory] = useState<'all' | EmailCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      limit: 50,
      category: category === 'all' ? undefined : category,
      isRead: showUnreadOnly ? false : undefined,
    }),
    [category, showUnreadOnly]
  );

  const { data, isLoading, isFetching, refetch } = useEmails(queryParams);
  const { data: unreadData } = useUnreadEmailCount();
  const markEmailRead = useMarkEmailRead();

  const emails = data?.emails ?? [];
  const unreadCount = unreadData?.count ?? data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) {
      setSelectedEmailId(null);
      setCategory('all');
      setShowUnreadOnly(false);
      return;
    }

    if (emails.length === 0) {
      setSelectedEmailId(null);
      return;
    }

    setSelectedEmailId((current) => {
      if (current && emails.some((email) => email.id === current)) {
        return current;
      }

      if (initialEmailId && emails.some((email) => email.id === initialEmailId)) {
        return initialEmailId;
      }

      return emails[0]?.id ?? null;
    });
  }, [open, emails, initialEmailId]);

  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? null;

  const TemplateComponent = selectedEmail
    ? TEMPLATE_MAP[selectedEmail.category] ?? DefaultEmailTemplate
    : null;

  const handleToggleRead = () => {
    if (!selectedEmail) return;
    markEmailRead.mutate({ emailId: selectedEmail.id, isRead: !selectedEmail.isRead });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border border-[#4e324c] bg-[#160c12] text-white">
        <DialogHeader className="border-b border-[#4e324c] pb-4">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-white">
            <span>Inbox</span>
            <Badge variant="secondary" className="bg-[#A75A5B] text-white">
              {unreadCount} unread
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex h-[70vh] flex-col gap-4 lg:flex-row">
          <aside className="w-full flex-shrink-0 lg:w-72">
            <div className="flex h-full flex-col rounded-xl border border-[#4e324c] bg-[#1b1016]">
              <div className="space-y-4 border-b border-[#4e324c] p-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-white/60">Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as 'all' | EmailCategory)}>
                    <SelectTrigger className="h-9 border-[#4e324c] bg-black/40 text-white">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="border-[#4e324c] bg-[#160c12] text-white">
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-sm">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="unread-only"
                      checked={showUnreadOnly}
                      onCheckedChange={(checked) => setShowUnreadOnly(checked)}
                    />
                    <Label htmlFor="unread-only" className="text-xs text-white/70">
                      Unread only
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-white/70 hover:text-white"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    {isFetching ? 'Refreshing…' : 'Refresh'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {isLoading ? (
                    <LoadingList />
                  ) : emails.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/20 bg-black/20 p-6 text-center text-sm text-white/60">
                      No emails yet. Advance the week to generate updates.
                    </div>
                  ) : (
                    emails.map((email) => (
                      <button
                        key={email.id}
                        type="button"
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#A75A5B]',
                          selectedEmailId === email.id
                            ? 'border-[#A75A5B] bg-[#A75A5B]/20'
                            : 'border-transparent bg-black/20 hover:border-[#4e324c] hover:bg-black/30'
                        )}
                        onClick={() => setSelectedEmailId(email.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {!email.isRead && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                            <span className="text-sm font-semibold text-white">{email.subject}</span>
                          </div>
                          <span className="text-xs text-white/50">{formatTimestamp(email.createdAt)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-white/60">{email.sender}</span>
                          <Badge variant="outline" className="text-xs text-white/70">
                            {CATEGORY_LABELS[email.category]}
                          </Badge>
                        </div>
                        {email.preview && (
                          <p className="mt-2 text-xs text-white/55">
                            {email.preview}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </aside>

          <section className="flex-1 rounded-xl border border-[#4e324c] bg-[#1b1016]">
            {selectedEmail && TemplateComponent ? (
              <div className="flex h-full flex-col">
                <div className="space-y-3 border-b border-[#4e324c] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-white/10 text-white/80">
                      Week {selectedEmail.week}
                    </Badge>
                    <Badge variant="outline" className="border-[#A75A5B] text-[#F6B5B6]">
                      {CATEGORY_LABELS[selectedEmail.category]}
                    </Badge>
                    {!selectedEmail.isRead && (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                        Unread
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedEmail.subject}</h3>
                    <p className="text-xs text-white/60">
                      {selectedEmail.sender} • {formatTimestamp(selectedEmail.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleRead}
                      disabled={markEmailRead.isPending}
                      className="border-[#4e324c] text-xs text-white hover:border-[#A75A5B] hover:text-white"
                    >
                      {selectedEmail.isRead ? 'Mark unread' : 'Mark as read'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-white/70 hover:text-white"
                      onClick={() => {
                        setShowUnreadOnly(false);
                        setCategory('all');
                      }}
                    >
                      Show all
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 p-4">
                    <Separator className="border-[#4e324c]" />
                    <TemplateComponent email={selectedEmail as EmailTemplateData} />
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/60">
                Select an email to read the details.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

function DefaultEmailTemplate({ email }: EmailTemplateProps) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-white/70">
      {JSON.stringify(email.body, null, 2)}
    </pre>
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
