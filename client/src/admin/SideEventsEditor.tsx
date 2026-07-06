import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Zap, Clock, Edit, Save, X, AlertCircle, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  EventsConfigSchema,
  type SideEventContract,
  type EventsConfig,
} from '@shared/api/contracts';
import { EFFECT_CHANNEL_DESCRIPTIONS } from '@shared/engine/processors/ActionProcessor';
import { SIDE_EVENT_CATEGORIES, type SideEventCategory } from '@shared/types/gameTypes';
import { CANONICAL_EFFECT_KEYS, lintSideEvents, type LintIssue } from '@/admin/contentLint';

// Read-only balance-knob display context (spec §2.3/fork B): a static import of the
// authored knob file. This is DISPLAY ONLY — knob edits happen in git, not this tool.
// eslint-disable-next-line import/no-relative-packages
import balanceEvents from '../../../data/balance/events.json';

type Choice = SideEventContract['choices'][number];
type Event = SideEventContract;

export const EVENTS_CONFIG_QUERY_KEY = ['admin:events-config'] as const;

const sideEventsBalance = (balanceEvents as any).side_events as {
  weekly_chance: number;
  max_events_per_week: number;
  event_cooldown: number;
  event_weights: Record<string, number>;
};

// Plain-language category labels for the picker.
const CATEGORY_LABELS: Record<SideEventCategory, string> = {
  sync_licensing: 'Sync Licensing',
  copyright_issues: 'Copyright Issues',
  platform_opportunities: 'Platform Opportunities',
  industry_drama: 'Industry Drama',
  technical_problems: 'Technical Problems',
  business_opportunities: 'Business Opportunities',
  artist_personal: 'Artist Personal',
};

/**
 * Pure helper: template for a newly-added side event (fork D, full CRUD).
 * Exported for unit testing without mounting the component.
 */
export function newEventTemplate(now: number = Date.now()): Event {
  return {
    id: `event_${now}`,
    role_hint: '',
    category: 'industry_drama',
    prompt: '',
    choices: [
      {
        id: 'choice_1',
        label: 'Choice 1',
        effects_immediate: {},
        effects_delayed: {},
      },
    ],
  };
}

/**
 * Pure helper: category Select options, each carrying its current weight (or a
 * "no events yet" marker context is computed by the caller, since that needs the
 * live event list). Exported for testing.
 */
export function getCategoryOptions(): Array<{ value: SideEventCategory; label: string; weight: number | undefined }> {
  return SIDE_EVENT_CATEGORIES.map((cat) => ({
    value: cat,
    label: CATEGORY_LABELS[cat],
    weight: sideEventsBalance?.event_weights?.[cat],
  }));
}

const getCanonicalEffectOptions = () => {
  return CANONICAL_EFFECT_KEYS.map((key) => ({
    value: key,
    label: key.replace(/_/g, ' '),
    description: EFFECT_CHANNEL_DESCRIPTIONS[key]?.text,
    title: EFFECT_CHANNEL_DESCRIPTIONS[key]?.title ?? key,
  }));
};

export default function SideEventsEditor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SideEventCategory | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedChoices, setExpandedChoices] = useState<Map<string, Set<string>>>(new Map());

  const [editMode, setEditMode] = useState(false);
  const [modifiedEvents, setModifiedEvents] = useState<Map<string, Event>>(new Map());
  const [newEvents, setNewEvents] = useState<Event[]>([]);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: fetchedConfig,
    isLoading: isConfigLoading,
    isError: isConfigError,
    error: configError,
  } = useQuery<EventsConfig>({
    queryKey: EVENTS_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/events-config');
      return response.json();
    },
  });

  const data: EventsConfig = fetchedConfig ?? {
    version: '',
    generated: '',
    events: [],
  };

  const totalChanges = modifiedEvents.size + newEvents.length + deletedEventIds.size;

  // Count authored events per category, for the "(no events yet)" note.
  const eventCountByCategory = useMemo(() => {
    const counts: Partial<Record<SideEventCategory, number>> = {};
    const allEvents = [
      ...data.events.filter((e) => !deletedEventIds.has(e.id)),
      ...newEvents,
    ];
    for (const ev of allEvents) {
      const cat = ev.category as SideEventCategory;
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [data.events, newEvents, deletedEventIds]);

  const filteredEvents = useMemo(() => {
    const allEvents = [
      ...data.events.filter((e) => !deletedEventIds.has(e.id)),
      ...newEvents,
    ];
    return allEvents.filter((event) => {
      const matchesSearch =
        searchTerm === '' ||
        event.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.role_hint.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, data.events, newEvents, deletedEventIds]);

  const getCurrentEvent = (eventId: string): Event => {
    if (modifiedEvents.has(eventId)) return modifiedEvents.get(eventId)!;
    const newEvent = newEvents.find((e) => e.id === eventId);
    if (newEvent) return newEvent;
    return data.events.find((e) => e.id === eventId)!;
  };

  const updateEvent = (eventId: string, updates: Partial<Event>) => {
    const current = getCurrentEvent(eventId);
    const updated = { ...current, ...updates };
    const isNew = newEvents.some((e) => e.id === eventId);
    if (isNew) {
      setNewEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } else {
      setModifiedEvents(new Map(modifiedEvents).set(eventId, updated));
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const toggleChoiceExpanded = (eventId: string, choiceId: string) => {
    setExpandedChoices((prev) => {
      const newMap = new Map(prev);
      const eventChoices = newMap.get(eventId) || new Set();
      const nextChoices = new Set(eventChoices);
      if (nextChoices.has(choiceId)) nextChoices.delete(choiceId);
      else nextChoices.add(choiceId);
      newMap.set(eventId, nextChoices);
      return newMap;
    });
  };

  const isChoiceExpanded = (eventId: string, choiceId: string): boolean => {
    return expandedChoices.get(eventId)?.has(choiceId) || false;
  };

  const updateChoice = (eventId: string, choiceId: string, updates: Partial<Choice>) => {
    const current = getCurrentEvent(eventId);
    const updatedChoices = current.choices.map((c) => (c.id === choiceId ? { ...c, ...updates } : c));
    updateEvent(eventId, { choices: updatedChoices });
  };

  const addChoice = (eventId: string) => {
    const current = getCurrentEvent(eventId);
    const newChoice: Choice = {
      id: `choice_${Date.now()}`,
      label: 'New Choice',
      effects_immediate: {},
      effects_delayed: {},
    };
    updateEvent(eventId, { choices: [...current.choices, newChoice] });
    toggleChoiceExpanded(eventId, newChoice.id);
  };

  const deleteChoice = (eventId: string, choiceId: string) => {
    const current = getCurrentEvent(eventId);
    if (current.choices.length <= 1) {
      toast({
        title: 'Cannot Delete',
        description: 'Events must have at least one choice.',
        variant: 'destructive',
      });
      return;
    }
    updateEvent(eventId, { choices: current.choices.filter((c) => c.id !== choiceId) });
  };

  const updateEffect = (
    eventId: string,
    choiceId: string,
    effectType: 'immediate' | 'delayed',
    effectKey: string,
    value: number,
  ) => {
    const current = getCurrentEvent(eventId);
    const updatedChoices = current.choices.map((choice) => {
      if (choice.id !== choiceId) return choice;
      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      return {
        ...choice,
        [effectsKey]: {
          ...choice[effectsKey],
          [effectKey]: value,
        },
      };
    });
    updateEvent(eventId, { choices: updatedChoices });
  };

  const renameEffect = (
    eventId: string,
    choiceId: string,
    effectType: 'immediate' | 'delayed',
    oldKey: string,
    newKey: string,
  ) => {
    if (oldKey === newKey) return;
    const current = getCurrentEvent(eventId);
    const updatedChoices = current.choices.map((choice) => {
      if (choice.id !== choiceId) return choice;
      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      const effectValue = choice[effectsKey][oldKey];
      if (effectValue === undefined) return choice;
      const { [oldKey]: _, ...remaining } = choice[effectsKey];
      return {
        ...choice,
        [effectsKey]: { ...remaining, [newKey]: Number(effectValue) },
      };
    });
    updateEvent(eventId, { choices: updatedChoices });
  };

  const deleteEffect = (eventId: string, choiceId: string, effectType: 'immediate' | 'delayed', effectKey: string) => {
    const current = getCurrentEvent(eventId);
    const updatedChoices = current.choices.map((choice) => {
      if (choice.id !== choiceId) return choice;
      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      const { [effectKey]: _, ...remaining } = choice[effectsKey];
      return { ...choice, [effectsKey]: remaining };
    });
    updateEvent(eventId, { choices: updatedChoices });
  };

  const addEffect = (eventId: string, choiceId: string, effectType: 'immediate' | 'delayed') => {
    const current = getCurrentEvent(eventId);
    const choice = current.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
    const existingKeys = Object.keys(choice[effectsKey]);
    let newEffectKey = 'money';
    if (existingKeys.includes(newEffectKey)) {
      newEffectKey = CANONICAL_EFFECT_KEYS.find((name) => !existingKeys.includes(name)) ?? CANONICAL_EFFECT_KEYS[0];
    }
    updateEffect(eventId, choiceId, effectType, newEffectKey, 0);
  };

  const addEvent = () => {
    const template = newEventTemplate();
    setNewEvents((prev) => [...prev, template]);
    setExpandedEvents((prev) => new Set([...Array.from(prev), template.id]));
  };

  const deleteEvent = (eventId: string) => {
    const isNew = newEvents.some((e) => e.id === eventId);
    if (isNew) {
      setNewEvents((prev) => prev.filter((e) => e.id !== eventId));
    } else {
      setDeletedEventIds((prev) => new Set([...Array.from(prev), eventId]));
    }
    setModifiedEvents((prev) => {
      const newMap = new Map(prev);
      newMap.delete(eventId);
      return newMap;
    });
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  };

  const handleDiscardChanges = () => {
    setModifiedEvents(new Map());
    setNewEvents([]);
    setDeletedEventIds(new Set());
    setLintIssues([]);
    toast({ title: 'Changes Discarded', description: 'All unsaved changes have been discarded.' });
  };

  const toggleEditMode = () => {
    if (editMode && totalChanges > 0) {
      setShowDiscardConfirm(true);
    } else {
      setEditMode(!editMode);
    }
  };

  const confirmDiscardAndExitEditMode = () => {
    setEditMode(false);
    setModifiedEvents(new Map());
    setNewEvents([]);
    setDeletedEventIds(new Set());
    setLintIssues([]);
  };

  const handleSaveChanges = async () => {
    if (totalChanges === 0) {
      toast({ title: 'No Changes', description: 'There are no modifications to save.', variant: 'default' });
      return;
    }

    setIsSaving(true);
    setLintIssues([]);

    try {
      const updatedEvents = [
        ...data.events.filter((e) => !deletedEventIds.has(e.id)).map((e) => modifiedEvents.get(e.id) || e),
        ...newEvents,
      ];

      // Lint gate FIRST (spec §2.3): hard-block issues must clear before the Zod parse.
      const issues = lintSideEvents(updatedEvents, sideEventsBalance?.event_weights ?? {});
      if (issues.length > 0) {
        setLintIssues(issues);
        toast({
          title: 'Lint Failed',
          description: `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} that must be fixed before saving. See the panel below.`,
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const updatedConfig = {
        ...data,
        events: updatedEvents,
        generated: new Date().toISOString(),
      };

      try {
        EventsConfigSchema.parse(updatedConfig);
      } catch (validationError: any) {
        const errorMessage = validationError.errors
          ? validationError.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
          : 'Invalid configuration structure';
        toast({
          title: 'Validation Failed',
          description: `Please fix the following errors before saving: ${errorMessage}`,
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const response = await apiRequest('POST', '/api/admin/events-config', { config: updatedConfig });
      const result = await response.json();

      const changesSummary = [
        modifiedEvents.size > 0 ? `${modifiedEvents.size} modified` : '',
        newEvents.length > 0 ? `${newEvents.length} added` : '',
        deletedEventIds.size > 0 ? `${deletedEventIds.size} deleted` : '',
      ]
        .filter(Boolean)
        .join(', ');

      toast({
        title: '✓ Changes Saved',
        description: `Successfully saved changes (${changesSummary}) to events.json. ${result.backupCreated ? 'Backup created.' : ''}`,
        variant: 'default',
      });

      setModifiedEvents(new Map());
      setNewEvents([]);
      setDeletedEventIds(new Set());
      setLintIssues([]);
      await queryClient.invalidateQueries({ queryKey: EVENTS_CONFIG_QUERY_KEY });
    } catch (error) {
      console.error('Failed to save events config:', error);
      toast({
        title: '✗ Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-8 text-center text-white/60">Loading events configuration...</CardContent>
        </Card>
      </div>
    );
  }

  if (isConfigError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-8 text-center text-red-300">
            Failed to load events configuration
            {configError instanceof Error ? `: ${configError.message}` : '.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Side Events</h2>
          <p className="text-white/70">
            Version {data.version} • Generated {data.generated} • {data.events.length} events
          </p>
        </div>

        {/* Lint Error Panel */}
        {lintIssues.length > 0 && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Save blocked — {lintIssues.length} lint issue{lintIssues.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription className="text-red-200/70">
                Fix the issues below before saving. These mirror hard rules the test suite enforces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lintIssues.map((issue, idx) => (
                  <li key={`${issue.scope}-${idx}`} className="text-sm text-red-200">
                    <Badge variant="outline" className="text-xs bg-red-500/20 text-red-300 border-red-500/30 mr-2">
                      {issue.scope}
                    </Badge>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Production Warning Banner (slice-2 pattern, kept here too) */}
        {import.meta.env.PROD && (
          <Card className="bg-yellow-900/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-300 mb-1">Production Environment Warning</div>
                  <p className="text-sm text-yellow-200/80">
                    You are editing the events.json file in production. Any changes saved here will be{' '}
                    <strong>lost on next deployment</strong>. All permanent edits should be made in your local
                    development environment, committed to git, and deployed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Read-only knobs strip (fork B) */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white/80">Balance Knobs (read-only)</CardTitle>
            <CardDescription className="text-white/50">
              Display context from data/balance/events.json — knob edits happen in git, not in this tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                weekly_chance: {sideEventsBalance?.weekly_chance}
              </Badge>
              <Badge variant="outline" className="text-xs">
                max_events_per_week: {sideEventsBalance?.max_events_per_week}
              </Badge>
              <Badge variant="outline" className="text-xs">
                event_cooldown: {sideEventsBalance?.event_cooldown}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {getCategoryOptions().map((opt) => (
                <Badge key={opt.value} variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">
                  {opt.label}: {opt.weight}
                  {!eventCountByCategory[opt.value] && (
                    <span className="text-white/40 ml-1">(no events yet)</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Mode Controls */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant={editMode ? 'default' : 'outline'} size="sm" onClick={toggleEditMode}>
                  {editMode ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Exit Edit Mode
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Enable Edit Mode
                    </>
                  )}
                </Button>

                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEvent}
                    className="bg-green-600/10 hover:bg-green-600/20 border-green-500/30 text-green-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Event
                  </Button>
                )}

                {editMode && totalChanges > 0 && (
                  <div className="flex items-center gap-2 text-orange-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {modifiedEvents.size > 0 && `${modifiedEvents.size} modified`}
                      {modifiedEvents.size > 0 && (newEvents.length > 0 || deletedEventIds.size > 0) && ', '}
                      {newEvents.length > 0 && `${newEvents.length} new`}
                      {newEvents.length > 0 && deletedEventIds.size > 0 && ', '}
                      {deletedEventIds.size > 0 && `${deletedEventIds.size} deleted`}
                    </span>
                  </div>
                )}
              </div>

              {editMode && totalChanges > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                    <X className="h-4 w-4 mr-2" />
                    Discard Changes
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search events by id, prompt, or role hint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/30 border-white/10"
          />
          <div>
            <div className="text-sm font-medium text-white/80 mb-2">Category:</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={selectedCategory === null ? 'default' : 'outline'} onClick={() => setSelectedCategory(null)}>
                All
              </Button>
              {SIDE_EVENT_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-sm text-white/60">
            Showing {filteredEvents.length} of {data.events.length} events
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEvents.map((originalEvent) => {
          const event = getCurrentEvent(originalEvent.id);
          const isExpanded = expandedEvents.has(event.id);
          const isModified = modifiedEvents.has(event.id);

          return (
            <Card
              key={event.id}
              className={`bg-gray-900/50 border-white/10 hover:border-white/20 transition-colors ${
                isModified ? 'ring-2 ring-orange-500/50' : ''
              }`}
            >
              <CardHeader className="cursor-pointer" onClick={() => toggleEventExpanded(event.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {event.id}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">
                        {CATEGORY_LABELS[event.category as SideEventCategory] ?? event.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.choices.length} choice{event.choices.length !== 1 ? 's' : ''}
                      </Badge>
                      {isModified && (
                        <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                          Modified
                        </Badge>
                      )}
                      {newEvents.some((e) => e.id === event.id) && (
                        <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                          New
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base text-white/90 font-medium">{event.prompt || '(no prompt yet)'}</CardTitle>
                    <CardDescription className="text-white/50 text-xs">{event.role_hint}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmEventId(event.id);
                        }}
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      {isExpanded ? '▼' : '▶'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 border-t border-white/10 pt-4">
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">Event ID</label>
                        <Input
                          value={event.id}
                          onChange={(e) => updateEvent(event.id, { id: e.target.value })}
                          className="h-8 text-xs bg-black/30 border-white/10"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">Role Hint</label>
                        <Input
                          value={event.role_hint}
                          onChange={(e) => updateEvent(event.id, { role_hint: e.target.value })}
                          className="h-8 text-xs bg-black/30 border-white/10"
                          placeholder="e.g. Sync Licensing"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">Category</label>
                        <Select
                          value={event.category}
                          onValueChange={(value) => updateEvent(event.id, { category: value as SideEventCategory })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-black/30 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getCategoryOptions().map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label} — weight {opt.weight}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">Prompt</label>
                        <Textarea
                          value={event.prompt}
                          onChange={(e) => updateEvent(event.id, { prompt: e.target.value })}
                          className="text-sm bg-black/30 border-white/10"
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-brand-gold/10 rounded-lg border border-brand-gold/20">
                      <div className="text-xs font-semibold text-brand-gold mb-1">Prompt:</div>
                      <div className="text-sm text-white/90">{event.prompt}</div>
                    </div>
                  )}

                  {/* Choices */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-white/80">Choices ({event.choices.length}):</div>
                      {editMode && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addChoice(event.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Choice
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {event.choices.map((choice, idx) => {
                        const expanded = isChoiceExpanded(event.id, choice.id);
                        return (
                          <div key={choice.id} className="bg-black/30 rounded-lg border border-white/10">
                            <div className="p-3 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleChoiceExpanded(event.id, choice.id)}
                              >
                                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                              <Badge variant="outline" className="text-xs shrink-0">
                                #{idx + 1}
                              </Badge>
                              <div className="flex-1">
                                {editMode && expanded ? (
                                  <Input
                                    value={choice.label}
                                    onChange={(e) => updateChoice(event.id, choice.id, { label: e.target.value })}
                                    className="h-7 text-sm bg-black/30 border-white/10"
                                    placeholder="Choice label"
                                  />
                                ) : (
                                  <div className="font-medium text-white text-sm">{choice.label}</div>
                                )}
                              </div>
                              {editMode && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => deleteChoice(event.id, choice.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {expanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                                <div>
                                  <label className="text-xs text-white/60 mb-1 block">Choice ID:</label>
                                  {editMode ? (
                                    <Input
                                      value={choice.id}
                                      onChange={(e) => updateChoice(event.id, choice.id, { id: e.target.value })}
                                      className="h-7 text-xs bg-black/30 border-white/10"
                                    />
                                  ) : (
                                    <div className="text-xs text-white/50">{choice.id}</div>
                                  )}
                                </div>

                                {/* Immediate Effects */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <Zap className="h-3 w-3 text-orange-300" />
                                      <span className="text-xs font-semibold text-white/60">Immediate Effects:</span>
                                    </div>
                                    {editMode && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-xs"
                                        onClick={() => addEffect(event.id, choice.id, 'immediate')}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    )}
                                  </div>
                                  {Object.entries(choice.effects_immediate).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries(choice.effects_immediate).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-2">
                                          {editMode ? (
                                            <>
                                              <Select
                                                value={key}
                                                onValueChange={(newKey) => renameEffect(event.id, choice.id, 'immediate', key, newKey)}
                                              >
                                                <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {getCanonicalEffectOptions().map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                type="number"
                                                value={value as number}
                                                onChange={(e) =>
                                                  updateEffect(event.id, choice.id, 'immediate', key, Number(e.target.value))
                                                }
                                                className="h-7 text-xs bg-black/30 border-white/10 w-24"
                                              />
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => deleteEffect(event.id, choice.id, 'immediate', key)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className={`text-xs ${
                                                typeof value === 'number' && value > 0
                                                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                  : typeof value === 'number' && value < 0
                                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                              }`}
                                            >
                                              {key}: {value}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-white/30">No immediate effects</div>
                                  )}
                                </div>

                                {/* Delayed Effects */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 text-blue-300" />
                                      <span className="text-xs font-semibold text-white/60">Delayed Effects:</span>
                                    </div>
                                    {editMode && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-xs"
                                        onClick={() => addEffect(event.id, choice.id, 'delayed')}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    )}
                                  </div>
                                  {Object.entries(choice.effects_delayed).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries(choice.effects_delayed).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-2">
                                          {editMode ? (
                                            <>
                                              <Select
                                                value={key}
                                                onValueChange={(newKey) => renameEffect(event.id, choice.id, 'delayed', key, newKey)}
                                              >
                                                <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {getCanonicalEffectOptions().map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                type="number"
                                                value={value as number}
                                                onChange={(e) =>
                                                  updateEffect(event.id, choice.id, 'delayed', key, Number(e.target.value))
                                                }
                                                className="h-7 text-xs bg-black/30 border-white/10 w-24"
                                              />
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => deleteEffect(event.id, choice.id, 'delayed', key)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </>
                                          ) : (
                                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">
                                              {key}: {value}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-white/30">No delayed effects</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Raw JSON */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80">View Raw JSON</summary>
                    <pre className="mt-2 p-3 bg-black/50 rounded text-xs overflow-auto">{JSON.stringify(event, null, 2)}</pre>
                  </details>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-8 text-center text-white/50">
            No events match your filters. Try adjusting your search or filter criteria.
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes to events.json?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save {totalChanges} change{totalChanges !== 1 ? 's' : ''} to the events.json file. A
              backup will be created automatically before saving.
              <br />
              <br />
              <span className="text-orange-400 font-medium">
                This will modify the game's data files. Please ensure changes are intentional.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                handleSaveChanges();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {totalChanges} unsaved change{totalChanges !== 1 ? 's' : ''}. Exiting edit mode will discard
              them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardConfirm(false);
                confirmDiscardAndExitEditMode();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={deleteConfirmEventId !== null} onOpenChange={(open) => !open && setDeleteConfirmEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmEventId &&
                (() => {
                  const eventToDelete = getCurrentEvent(deleteConfirmEventId);
                  const isNew = newEvents.some((e) => e.id === deleteConfirmEventId);
                  return (
                    <>
                      Are you sure you want to delete <strong className="text-white">{eventToDelete?.id}</strong>?
                      <br />
                      <br />
                      {isNew ? (
                        <span className="text-yellow-400">
                          This event will be removed from the new events list (not yet saved to file).
                        </span>
                      ) : (
                        <span className="text-red-400 font-medium">
                          This event will be marked for deletion and removed when you save changes.
                        </span>
                      )}
                    </>
                  );
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmEventId) {
                  deleteEvent(deleteConfirmEventId);
                  setDeleteConfirmEventId(null);
                  toast({
                    title: 'Event Deleted',
                    description: 'The event has been marked for deletion. Save changes to apply.',
                    variant: 'default',
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
