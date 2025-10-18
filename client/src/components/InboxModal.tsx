import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmails, useMarkEmailRead, useDeleteEmail, useUnreadEmailCount } from '@/hooks/useEmails';
import type { EmailCategory } from '@shared/types/emailTypes';
import type { EmailTemplateData, EmailTemplateProps } from './email-templates';
import {
  AREmail,
  ChartEmail,
  ArtistEmail,
  FinancialEmail,
} from './email-templates';

const CATEGORY_STORAGE_KEY = 'inbox:lastCategory';
const UNREAD_STORAGE_KEY = 'inbox:showUnreadOnly';

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  chart: 'Chart',
  financial: 'Financial',
  artist: 'Artist',
  ar: 'A&R',
  other: 'Other',
};

const CATEGORY_OPTIONS: { value: 'all' | EmailCategory; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'chart', label: 'Chart' },
  { value: 'financial', label: 'Financial' },
  { value: 'artist', label: 'Artist' },
  { value: 'ar', label: 'A&R' },
  { value: 'other', label: 'Other' },
];

const TEMPLATE_MAP: Record<EmailCategory, React.ComponentType<EmailTemplateProps>> = {
  chart: ChartEmail, // Handles both top 10 and #1 debuts
  financial: FinancialEmail, // Handles financial reports and tier unlocks
  artist: ArtistEmail, // Handles tours and releases
  ar: AREmail, // Handles artist discovery and signing
  other: DefaultEmailTemplate,
};

function isEmailCategory(value: unknown): value is EmailCategory {
  return typeof value === 'string' && value in CATEGORY_LABELS;
}

function readStoredCategory(): 'all' | EmailCategory {
  if (typeof window === 'undefined') {
    return 'all';
  }

  const stored = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
  if (stored === 'all') {
    return 'all';
  }

  if (isEmailCategory(stored)) {
    return stored;
  }

  return 'all';
}

function readStoredUnread(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const stored = window.localStorage.getItem(UNREAD_STORAGE_KEY);
  if (stored === 'true') {
    return true;
  }

  if (stored === 'false') {
    return false;
  }

  return false;
}

interface InboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmailId?: string | null;
}

export function InboxModal({ open, onOpenChange, initialEmailId }: InboxModalProps) {
  const [category, setCategory] = useState<'all' | EmailCategory>(() => readStoredCategory());
  const [showUnreadOnly, setShowUnreadOnly] = useState(() => readStoredUnread());
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const deleteEmail = useDeleteEmail();

  const emails = data?.emails ?? [];
  const unreadCount = unreadData?.count ?? data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) {
      setSelectedEmailId(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(CATEGORY_STORAGE_KEY, category);
  }, [category]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(UNREAD_STORAGE_KEY, showUnreadOnly ? 'true' : 'false');
  }, [showUnreadOnly]);

  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? null;

  const TemplateComponent = selectedEmail
    ? TEMPLATE_MAP[selectedEmail.category] ?? DefaultEmailTemplate
    : null;

  const handleToggleRead = () => {
    if (!selectedEmail) return;
    markEmailRead.mutate({ emailId: selectedEmail.id, isRead: !selectedEmail.isRead });
  };

  const handleDeleteEmail = () => {
    if (!selectedEmail) return;

    deleteEmail.mutate(selectedEmail.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        // Select next email or previous if this was the last one
        const currentIndex = emails.findIndex(e => e.id === selectedEmail.id);
        const nextEmail = emails[currentIndex + 1] ?? emails[currentIndex - 1] ?? null;
        setSelectedEmailId(nextEmail?.id ?? null);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border border-brand-purple bg-brand-dark/90 text-white backdrop-blur-sm">
        <DialogHeader className="border-b border-brand-purple pb-4">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-white">
            <span>Inbox</span>
            <Badge variant="secondary" className="bg-brand-burgundy text-white">
              {unreadCount} unread
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex h-[70vh] flex-col gap-4 lg:flex-row">
          <aside className="w-full flex-shrink-0 lg:w-72">
            <div className="flex h-full flex-col rounded-xl border border-brand-purple bg-brand-dark">
              <div className="space-y-4 border-b border-brand-purple p-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-white/60">Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as 'all' | EmailCategory)}>
                    <SelectTrigger className="h-9 border-brand-purple bg-black/40 text-white">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="border-brand-purple bg-brand-dark text-white">
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
                    onClick={() => {
                      if (!isFetching) {
                        refetch();
                      }
                    }}
                    disabled={isFetching}
                    aria-label="Refresh inbox"
                  >
                    {isFetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3" role="listbox" aria-label="Inbox messages">
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
                        role="option"
                        aria-selected={selectedEmailId === email.id}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-burgundy',
                          selectedEmailId === email.id
                            ? 'border-brand-burgundy bg-brand-burgundy/20'
                            : 'border-transparent bg-black/20 hover:border-brand-purple hover:bg-black/30'
                        )}
                        onClick={() => setSelectedEmailId(email.id)}
                      >
                        <div className="flex items-center gap-2">
                          {!email.isRead && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                          <span className="text-sm font-semibold text-white">{email.subject}</span>
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          From: {email.sender}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-white/70">
                            Week {email.week}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-white/70">
                            {CATEGORY_LABELS[email.category]}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </aside>

          <section className="flex-1 rounded-xl border border-brand-purple bg-brand-dark">
            {selectedEmail && TemplateComponent ? (
              <div className="flex h-full flex-col">
                <div className="space-y-3 border-b border-brand-purple p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-white/10 text-white/80">
                      Week {selectedEmail.week}
                    </Badge>
                    <Badge variant="outline" className="border-brand-burgundy text-brand-pink">
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
                      {selectedEmail.sender} - {formatTimestamp(selectedEmail.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleRead}
                      disabled={markEmailRead.isPending}
                      className="border-brand-purple text-xs text-white hover:border-brand-burgundy hover:text-white"
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteEmail.isPending}
                      className="ml-auto text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 p-4">
                    <Separator className="border-brand-purple" />
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-brand-purple bg-brand-dark text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this email?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This action cannot be undone. This will permanently delete this email from your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-brand-purple text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmail}
              disabled={deleteEmail.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteEmail.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
