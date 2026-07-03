import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Trash2, Inbox, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmails, useMarkEmailRead, useDeleteEmail, useUnreadEmailCount } from '@/hooks/useEmails';
import { EMAIL_CATEGORIES, EMAIL_CATEGORY_LABELS, type EmailCategory } from '@shared/types/emailTypes';
import type { EmailTemplateData, EmailTemplateProps } from './email-templates';
import {
  AREmail,
  ChartEmail,
  ArtistEmail,
  FinancialEmail,
} from './email-templates';

const CATEGORY_STORAGE_KEY = 'inbox:lastCategory';
const UNREAD_STORAGE_KEY = 'inbox:showUnreadOnly';

const CATEGORY_LABELS = EMAIL_CATEGORY_LABELS;

const CATEGORY_OPTIONS: { value: 'all' | EmailCategory; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...EMAIL_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))
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
  contentId?: string;
}

export function InboxModal({ open, onOpenChange, initialEmailId, contentId }: InboxModalProps) {
  const [category, setCategory] = useState<'all' | EmailCategory>(() => readStoredCategory());
  const [showUnreadOnly, setShowUnreadOnly] = useState(() => readStoredUnread());
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const emailListRef = useRef<HTMLDivElement | null>(null);
  const descriptionId = contentId ? `${contentId}-description` : 'inbox-modal-description';

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

  const liveRegionMessage = deleteEmail.isPending
    ? 'Deleting email'
    : markEmailRead.isPending
      ? 'Updating email status'
      : isFetching
        ? 'Refreshing inbox'
        : '';

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

  const activeOptionId = selectedEmailId ? `inbox-option-${selectedEmailId}` : undefined;

  const TemplateComponent = selectedEmail
    ? TEMPLATE_MAP[selectedEmail.category] ?? DefaultEmailTemplate
    : null;

  const focusEmailByIndex = useCallback((index: number) => {
    const focus = () => {
      const target = emailListRef.current?.querySelector<HTMLButtonElement>(`[data-email-index="${index}"]`);
      target?.focus();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focus);
    } else {
      focus();
    }
  }, []);

  const handleEmailKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!emails.length) {
      return;
    }

    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = index === emails.length - 1 ? 0 : index + 1;
        break;
      case 'ArrowUp':
        nextIndex = index === 0 ? emails.length - 1 : index - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = emails.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextEmail = emails[nextIndex];
    if (nextEmail) {
      setSelectedEmailId(nextEmail.id);
      focusEmailByIndex(nextIndex);
    }
  };

  useEffect(() => {
    if (!open || !selectedEmailId) {
      return;
    }
    const index = emails.findIndex((email) => email.id === selectedEmailId);
    if (index >= 0) {
      focusEmailByIndex(index);
    }
  }, [open, selectedEmailId, emails, focusEmailByIndex]);

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
      <DialogContent
        id={contentId}
        aria-describedby={descriptionId}
        className="max-w-5xl border-white/[0.08] bg-surface-panel/95 text-text-primary backdrop-blur-sm"
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveRegionMessage}
        </div>
        <DialogHeader className="border-b border-white/[0.08] pb-4">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-text-primary">
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-neon-lilac" />
              Inbox
            </span>
            <span className="rounded-pill border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-text-muted">
              {unreadCount} unread
            </span>
          </DialogTitle>
          <DialogDescription id={descriptionId} className="sr-only">
            Review inbox messages and manage read status.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex h-[70vh] flex-col gap-4 lg:flex-row">
          <aside className="w-full flex-shrink-0 lg:w-72">
            <div className="glass-panel chromatic-hairline flex h-full flex-col rounded-card">
              <div className="space-y-4 border-b border-white/[0.06] p-4">
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as 'all' | EmailCategory)}>
                    <SelectTrigger className="h-9 border-white/[0.09] bg-black/20 text-text-primary">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="border-white/[0.09] bg-surface-panel text-text-primary">
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
                    <Label htmlFor="unread-only" className="text-xs text-text-body">
                      Unread only
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-text-body hover:text-text-primary"
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
                <div
                  ref={emailListRef}
                  className="space-y-2 p-3"
                  role="listbox"
                  aria-label="Inbox messages"
                  aria-activedescendant={activeOptionId ?? undefined}
                >
                  {isLoading ? (
                    <LoadingList />
                  ) : emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-9 text-center">
                      <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-neon-purple/[0.32] bg-neon-purple/[0.12] shadow-glow-purple">
                        <MailOpen className="h-[18px] w-[18px] text-neon-lilac" />
                      </div>
                      <div className="text-sm font-semibold text-text-primary/85">No messages yet</div>
                      <div className="mt-1 max-w-[230px] text-[12.5px] text-text-muted">
                        Advance the week to generate updates.
                      </div>
                    </div>
                  ) : (
                    emails.map((email, index) => (
                      <button
                        key={email.id}
                        type="button"
                        id={`inbox-option-${email.id}`}
                        data-email-index={index}
                        role="option"
                        aria-selected={selectedEmailId === email.id}
                        onKeyDown={(event) => handleEmailKeyDown(event, index)}
                        className={cn(
                          'w-full rounded-[12px] border px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-neon-lilac/60',
                          selectedEmailId === email.id
                            ? 'border-neon-purple/[0.5] bg-neon-purple/[0.14]'
                            : 'border-white/[0.08] bg-surface-inner/50 hover:border-white/[0.16] hover:bg-white/[0.045]'
                        )}
                        onClick={() => setSelectedEmailId(email.id)}
                      >
                        <div className="flex items-center gap-2">
                          {!email.isRead && (
                            <span className="rounded-pill border border-positive/40 bg-positive/[0.14] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-positive">
                              Unread
                            </span>
                          )}
                          <span className="text-sm font-semibold text-text-primary">{email.subject}</span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-text-muted">
                          From: {email.sender}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded-pill border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] text-text-muted">
                            Week {email.week}
                          </span>
                          <span className="rounded-pill border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-text-muted">
                            {CATEGORY_LABELS[email.category]}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </aside>

          <section className="glass-panel chromatic-hairline flex-1 rounded-card">
            {selectedEmail && TemplateComponent ? (
              <div className="flex h-full flex-col">
                <div className="space-y-3 border-b border-white/[0.06] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-pill border border-white/[0.08] bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-text-body">
                      Week {selectedEmail.week}
                    </span>
                    <span className="rounded-pill border border-neon-pink/40 bg-neon-pink/[0.1] px-3 py-1 text-[11px] text-neon-pink">
                      {CATEGORY_LABELS[selectedEmail.category]}
                    </span>
                    {!selectedEmail.isRead && (
                      <span className="rounded-pill border border-positive/40 bg-positive/[0.14] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-positive">
                        Unread
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">{selectedEmail.subject}</h3>
                    <p className="font-mono text-xs text-text-muted">
                      {selectedEmail.sender} - {formatTimestamp(selectedEmail.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleRead}
                      disabled={markEmailRead.isPending}
                      className="border-white/[0.12] text-xs text-text-primary hover:border-neon-lilac/50 hover:text-text-primary"
                    >
                      {selectedEmail.isRead ? 'Mark unread' : 'Mark as read'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-text-body hover:text-text-primary"
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
                    <Separator className="border-white/[0.08]" />
                    <TemplateComponent email={selectedEmail as EmailTemplateData} />
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                Select an email to read the details.
              </div>
            )}
          </section>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-white/[0.08] bg-surface-panel text-text-primary">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Delete this email?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-body">
              This action cannot be undone. This will permanently delete this email from your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.09] text-text-primary hover:bg-white/[0.08]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmail}
              disabled={deleteEmail.isPending}
              className="bg-negative text-white hover:bg-negative/80"
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
        <Skeleton key={index} className="h-16 w-full rounded-[12px] bg-white/5" />
      ))}
    </div>
  );
}

function DefaultEmailTemplate({ email }: EmailTemplateProps) {
  return (
    <pre className="overflow-x-auto rounded-[12px] border border-white/[0.08] bg-black/20 p-4 font-mono text-xs text-text-body">
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
