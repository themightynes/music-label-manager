import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconPrefix, IconProp } from '@fortawesome/fontawesome-svg-core';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Zap, Clock, Edit, Save, X, AlertCircle, Pencil, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ActionsConfigSchema,
  type WeeklyAction,
  type ActionCategory,
  type ActionsConfig,
  type DialogueChoiceContract,
} from '@shared/api/contracts';
import { EFFECT_CHANNEL_DESCRIPTIONS } from '@shared/engine/processors/ActionProcessor';
import { RELEVANCE_TAGS, HAPPENING_TYPES, type RelevanceTag, type HappeningType } from '@shared/types/gameTypes';
import { CANONICAL_EFFECT_KEYS, lintMeetings, type LintIssue } from '@/admin/contentLint';
import { slugifyId, isIdAvailable, orderWithNewestFirst } from '@/admin/utils';

// Use shared types from contracts
type Effect = Record<string, number>;
type Choice = DialogueChoiceContract;
type Action = WeeklyAction;
type ActionsData = ActionsConfig;

export const ACTIONS_CONFIG_QUERY_KEY = ['admin:actions-config'] as const;

// Plain-language labels for the `requires` relevance-tag checkbox group.
const RELEVANCE_TAG_LABELS: Record<RelevanceTag, string> = {
  artist_signed: 'At least one artist signed',
  music_exists: 'The label has released music',
  release_planned: 'A release is currently planned',
  release_out: 'A release went out this week',
  recording_project_active: 'A recording project is active',
  tour_active: 'A tour is currently active',
};

// Plain-language labels + "why now" explainer copy for the reactive_trigger selector.
const HAPPENING_TYPE_LABELS: Record<HappeningType, string> = {
  chart_debut: 'A song debuted on the charts this week',
  release_out: 'A release went live this week',
  mood_crater: "An artist's mood cratered this week",
  recent_signing: 'An artist was signed last week',
};

/**
 * Pure helper: given the current set of checked relevance tags, returns the
 * `requires` value to store on the action — `undefined` (field omitted) when
 * nothing is checked, since the schema requires nonempty-or-absent and the
 * engine treats "no requires field" as always-eligible (NOT the same as an
 * empty array, which the schema rejects outright).
 */
export function computeRequiresFromChecked(checked: ReadonlySet<RelevanceTag>): RelevanceTag[] | undefined {
  if (checked.size === 0) return undefined;
  // Keep a stable, canonical ordering (RELEVANCE_TAGS order) regardless of
  // check/uncheck order, so diffs stay predictable.
  const ordered = RELEVANCE_TAGS.filter((tag) => checked.has(tag));
  return ordered.length > 0 ? ordered : undefined;
}

const prefixMap: Record<string, IconPrefix> = {
  fas: 'fas',
  far: 'far',
  fab: 'fab',
  fal: 'fal',
  fad: 'fad',
  fat: 'fat',
  'fa-solid': 'fas',
  'fa-regular': 'far',
  'fa-brands': 'fab',
  'fa-light': 'fal',
  'fa-duotone': 'fad',
  'fa-thin': 'fat',
};

const fallbackIcon: IconProp = ['fas', 'circle-question'];

const parseIconClass = (iconClass: string): IconProp => {
  const parts = iconClass.split(' ').filter(Boolean);
  let prefix: IconPrefix | null = null;
  let iconName: string | null = null;

  parts.forEach((part) => {
    if (!prefix) {
      const mapped = prefixMap[part];
      if (mapped) prefix = mapped;
    }
    if (!iconName && part.startsWith('fa-') && part !== 'fa') {
      iconName = part.slice(3);
    }
  });

  if (!iconName) {
    return fallbackIcon;
  }

  return [prefix ?? 'fas', iconName] as IconProp;
};

const formatIconLabel = (iconClass: string) => {
  const parts = iconClass.split(' ').filter(Boolean);
  const iconName = parts.find((part) => part.startsWith('fa-') && part !== 'fa');
  if (!iconName) {
    return iconClass;
  }
  return iconName.replace('fa-', '').replace(/-/g, ' ');
};

// Canonical effect whitelist: LIVE_EFFECT_KEYS ∪ {executive_mood} (imported from
// @/admin/contentLint, which itself derives from ActionProcessor.ts — the single
// source of truth). Anything outside this set is "orphaned" — legacy data the
// engine no longer reads.
const isEffectConnected = (effectKey: string) => (CANONICAL_EFFECT_KEYS as readonly string[]).includes(effectKey);

export default function ActionsViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [modifiedActions, setModifiedActions] = useState<Map<string, Action>>(new Map());
  const [newActions, setNewActions] = useState<Action[]>([]);
  const [deletedActionIds, setDeletedActionIds] = useState<Set<string>>(new Set());
  const [editingPrompt, setEditingPrompt] = useState<{actionId: string; field: 'prompt' | 'prompt_before_selection'} | null>(null);
  const [expandedChoices, setExpandedChoices] = useState<Map<string, Set<string>>>(new Map()); // actionId -> Set of choiceIds
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteConfirmActionId, setDeleteConfirmActionId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Creation dialog state (slice 4, playtest feedback: new actions must appear at
  // the top of the list via a pop-up, not silently appended off-screen at the bottom).
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createRole, setCreateRole] = useState('ceo');
  const [createCategory, setCreateCategory] = useState('');
  const [createScope, setCreateScope] = useState<'global' | 'predetermined' | 'user_selected'>('global');
  const [createIcon, setCreateIcon] = useState('fas fa-circle');
  const [createId, setCreateId] = useState('');
  const [createIdEdited, setCreateIdEdited] = useState(false);

  // Data source: fetch via the admin GET endpoint (no static bundle import — the
  // viewer must reflect the live file, including after a save, not build-time data).
  const {
    data: fetchedConfig,
    isLoading: isConfigLoading,
    isError: isConfigError,
    error: configError,
  } = useQuery<ActionsData>({
    queryKey: ACTIONS_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/actions-config');
      return response.json();
    },
  });

  // Fallback empty shape while loading/erroring so hooks below can run
  // unconditionally (rules-of-hooks) — the JSX gates on isConfigLoading/isConfigError
  // before rendering the actions list.
  const data: ActionsData = fetchedConfig ?? {
    version: '',
    generated: '',
    description: '',
    weekly_actions: [],
    action_categories: [],
  };

  // Get unique roles from actions
  const uniqueRoles = useMemo(() => {
    const roles = new Set(data.weekly_actions.map(action => action.role_id));
    return Array.from(roles).sort();
  }, [data.weekly_actions]);

  // Role display names
  const getRoleDisplayName = (roleId: string) => {
    const roleNames: Record<string, string> = {
      'ceo': 'CEO',
      'head_ar': 'A&R',
      'cco': 'CCO',
      'cmo': 'CMO',
      'head_distribution': 'Distribution'
    };
    return roleNames[roleId] || roleId;
  };

  // Get category options from data
  const getCategoryOptions = () => {
    return data.action_categories.map(cat => ({
      value: cat.id,
      label: cat.name,
      icon: cat.icon
    }));
  };

  // Get target scope options
  const getTargetScopeOptions = () => {
    return [
      {
        value: 'global',
        label: 'Global (🌍)',
        description: 'Affects ALL signed artists equally',
        example: 'CEO sets quarterly goals that boost everyone\'s morale'
      },
      {
        value: 'predetermined',
        label: 'Predetermined (⭐)',
        description: 'Automatically selects artist with highest popularity',
        example: 'Crisis management where most popular artist handles media'
      },
      {
        value: 'user_selected',
        label: 'User Selected (👤)',
        description: 'Player chooses which artist is affected',
        example: 'Strategic decision where player picks artist for single strategy',
        required: 'Requires prompt_before_selection field and {artistName} placeholder'
      }
    ];
  };

  // Get role options
  const getRoleOptions = () => {
    return [
      { value: 'ceo', label: 'CEO' },
      { value: 'head_ar', label: 'A&R' },
      { value: 'cco', label: 'CCO' },
      { value: 'cmo', label: 'CMO' },
      { value: 'head_distribution', label: 'Distribution' }
    ];
  };

  // Get icon options from actions data
  const getIconOptions = () => {
    const icons = new Set(data.weekly_actions.map(action => action.icon));
    return Array.from(icons).sort().map(iconClass => ({
      value: iconClass,
      label: formatIconLabel(iconClass),
      iconClass: iconClass
    }));
  };

  // Canonical effect-name options for the effect picker (2.2a): the canonical
  // whitelist only, each carrying its EFFECT_CHANNEL_DESCRIPTIONS blurb for
  // help text/title. Replaces the old data-derived getAllEffectNames dropdown.
  const getCanonicalEffectOptions = () => {
    return CANONICAL_EFFECT_KEYS.map(key => ({
      value: key,
      label: key.replace(/_/g, ' '),
      description: EFFECT_CHANNEL_DESCRIPTIONS[key]?.text,
      title: EFFECT_CHANNEL_DESCRIPTIONS[key]?.title ?? key,
    }));
  };

  // Filter actions based on search and filters
  const filteredActions = useMemo(() => {
    // Display order: newest-first new actions on top, then originals — a pure
    // display-order change (slice 4). The save handler below composes its own
    // array independently and is unchanged in content/order.
    const allActions = orderWithNewestFirst(
      newActions,
      data.weekly_actions.filter(a => !deletedActionIds.has(a.id)),
    );

    return allActions.filter(action => {
      const matchesSearch = searchTerm === '' ||
        action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesScope = !selectedScope || action.target_scope === selectedScope;
      const matchesRole = !selectedRole || action.role_id === selectedRole;

      return matchesSearch && matchesScope && matchesRole;
    });
  }, [searchTerm, selectedScope, selectedRole, newActions, deletedActionIds]);

  const toggleAction = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedActions(new Set(filteredActions.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedActions(new Set());
  };

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'global': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'predetermined': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'user_selected': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Aggregate all effects across all choices for quick preview
  const getActionEffectsSummary = (action: Action) => {
    const allImmediate: Record<string, Set<number>> = {};
    const allDelayed: Record<string, Set<number>> = {};

    action.choices.forEach(choice => {
      Object.entries(choice.effects_immediate).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!allImmediate[key]) allImmediate[key] = new Set();
          allImmediate[key].add(value);
        }
      });
      Object.entries(choice.effects_delayed).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!allDelayed[key]) allDelayed[key] = new Set();
          allDelayed[key].add(value);
        }
      });
    });

    return { allImmediate, allDelayed };
  };

  const renderEffects = (effects: Effect, label: string) => {
    const effectEntries = Object.entries(effects);
    if (effectEntries.length === 0) return null;

    return (
      <div className="mt-2">
        <div className="text-xs font-semibold text-white/60 mb-1">{label}:</div>
        <div className="flex flex-wrap gap-2">
          {effectEntries.map(([key, value]) => (
            <Badge
              key={key}
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
          ))}
        </div>
      </div>
    );
  };

  // Get the current action (modified, new, or original)
  const getCurrentAction = (actionId: string): Action => {
    // Check modified first
    if (modifiedActions.has(actionId)) {
      return modifiedActions.get(actionId)!;
    }
    // Check new actions
    const newAction = newActions.find(a => a.id === actionId);
    if (newAction) {
      return newAction;
    }
    // Fallback to original
    return data.weekly_actions.find(a => a.id === actionId)!;
  };

  // Update an action field
  const updateAction = (actionId: string, updates: Partial<Action>) => {
    const current = getCurrentAction(actionId);
    const updated = { ...current, ...updates };

    // Check if it's a new action
    const isNew = newActions.some(a => a.id === actionId);
    if (isNew) {
      setNewActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } else {
      setModifiedActions(new Map(modifiedActions).set(actionId, updated));
    }
  };

  // Canonical effect names for the effect-name picker (2.2a): the effect-name
  // Select in edit mode offers ONLY canonical keys — no data-derived union, no
  // 'new_effect' fallback. Kept as `getAllEffectNames` name for call-site
  // continuity; sourced from CANONICAL_EFFECT_KEYS.
  const getAllEffectNames = CANONICAL_EFFECT_KEYS;

  // Toggle expanded state for a choice
  const toggleChoiceExpanded = (actionId: string, choiceId: string) => {
    setExpandedChoices(prev => {
      const newMap = new Map(prev);
      const actionChoices = newMap.get(actionId) || new Set();
      const newChoices = new Set(actionChoices);

      if (newChoices.has(choiceId)) {
        newChoices.delete(choiceId);
      } else {
        newChoices.add(choiceId);
      }

      newMap.set(actionId, newChoices);
      return newMap;
    });
  };

  // Check if choice is expanded
  const isChoiceExpanded = (actionId: string, choiceId: string): boolean => {
    return expandedChoices.get(actionId)?.has(choiceId) || false;
  };

  // Update a specific choice in an action
  const updateChoice = (actionId: string, choiceId: string, updates: Partial<Choice>) => {
    const current = getCurrentAction(actionId);
    const updatedChoices = current.choices.map(choice =>
      choice.id === choiceId ? { ...choice, ...updates } : choice
    );
    updateAction(actionId, { choices: updatedChoices });

    // If ID changed, update expandedChoices state to maintain expansion
    if (updates.id && updates.id !== choiceId) {
      const newId = updates.id; // Type guard: ensure it's string
      setExpandedChoices(prev => {
        const newMap = new Map(prev);
        const actionChoices = newMap.get(actionId) || new Set();
        if (actionChoices.has(choiceId)) {
          const newChoices = new Set(actionChoices);
          newChoices.delete(choiceId);
          newChoices.add(newId);
          newMap.set(actionId, newChoices);
          return newMap;
        }
        return prev;
      });
    }
  };

  // Add new choice to action
  const addChoice = (actionId: string) => {
    const current = getCurrentAction(actionId);
    const newChoice: Choice = {
      id: `choice_${Date.now()}`,
      label: 'New Choice',
      effects_immediate: {},
      effects_delayed: {}
    };
    const updatedChoices = [...current.choices, newChoice];
    updateAction(actionId, { choices: updatedChoices });
    // Auto-expand the new choice
    toggleChoiceExpanded(actionId, newChoice.id);
  };

  // Delete choice from action
  const deleteChoice = (actionId: string, choiceId: string) => {
    const current = getCurrentAction(actionId);
    if (current.choices.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Actions must have at least one choice.",
        variant: "destructive",
      });
      return;
    }
    const updatedChoices = current.choices.filter(choice => choice.id !== choiceId);
    updateAction(actionId, { choices: updatedChoices });
  };

  // Update effect in choice
  const updateEffect = (
    actionId: string,
    choiceId: string,
    effectType: 'immediate' | 'delayed',
    effectKey: string,
    value: number
  ) => {
    const current = getCurrentAction(actionId);
    const updatedChoices = current.choices.map(choice => {
      if (choice.id !== choiceId) return choice;

      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      return {
        ...choice,
        [effectsKey]: {
          ...choice[effectsKey],
          [effectKey]: value
        }
      };
    });
    updateAction(actionId, { choices: updatedChoices });
  };

  const renameEffect = (
    actionId: string,
    choiceId: string,
    effectType: 'immediate' | 'delayed',
    oldKey: string,
    newKey: string
  ) => {
    if (oldKey === newKey) return;

    const current = getCurrentAction(actionId);
    const updatedChoices = current.choices.map(choice => {
      if (choice.id !== choiceId) return choice;

      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      const effectValue = choice[effectsKey][oldKey];
      if (effectValue === undefined) {
        return choice;
      }

      const { [oldKey]: _, ...remainingEffects } = choice[effectsKey];
      return {
        ...choice,
        [effectsKey]: {
          ...remainingEffects,
          [newKey]: Number(effectValue),
        },
      };
    });

    updateAction(actionId, { choices: updatedChoices });
  };

  // Delete effect from choice
  const deleteEffect = (actionId: string, choiceId: string, effectType: 'immediate' | 'delayed', effectKey: string) => {
    const current = getCurrentAction(actionId);
    const updatedChoices = current.choices.map(choice => {
      if (choice.id !== choiceId) return choice;

      const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
      const { [effectKey]: _, ...remainingEffects } = choice[effectsKey];
      return {
        ...choice,
        [effectsKey]: remainingEffects
      };
    });
    updateAction(actionId, { choices: updatedChoices });
  };

  // Add effect to choice
  const addEffect = (actionId: string, choiceId: string, effectType: 'immediate' | 'delayed') => {
    // Start with a default effect name that's not already used
    const current = getCurrentAction(actionId);
    const choice = current.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const effectsKey = effectType === 'immediate' ? 'effects_immediate' : 'effects_delayed';
    const existingKeys = Object.keys(choice[effectsKey]);

    // Find first unused effect name — ALWAYS from the canonical set, never a
    // non-canonical fallback like the old 'new_effect' placeholder.
    let newEffectKey = 'money';
    if (existingKeys.includes(newEffectKey)) {
      newEffectKey =
        getAllEffectNames.find(name => !existingKeys.includes(name)) ?? CANONICAL_EFFECT_KEYS[0];
    }

    updateEffect(actionId, choiceId, effectType, newEffectKey, 0);
  };

  // All action ids currently in play (originals not deleted + new + modified) —
  // used by the creation dialog to validate id uniqueness (spec: unique against
  // ALL current action ids).
  const allCurrentActionIds = useMemo(() => {
    const ids = new Set<string>();
    data.weekly_actions.forEach(a => {
      if (!deletedActionIds.has(a.id)) ids.add(a.id);
    });
    newActions.forEach(a => ids.add(a.id));
    modifiedActions.forEach((_, id) => ids.add(id));
    return ids;
  }, [data.weekly_actions, deletedActionIds, newActions, modifiedActions]);

  const createIdTaken = createId.length > 0 && !isIdAvailable(createId, allCurrentActionIds);
  const createNameValid = createName.trim().length > 0;
  const canCreateAction = createNameValid && createId.length > 0 && !createIdTaken;

  const openCreateDialog = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateRole('ceo');
    setCreateCategory(data.action_categories[0]?.id ?? 'business');
    setCreateScope('global');
    setCreateIcon('fas fa-circle');
    setCreateId('');
    setCreateIdEdited(false);
    setShowCreateDialog(true);
  };

  // Keep the id in sync with the name until the user edits it directly.
  const handleCreateNameChange = (value: string) => {
    setCreateName(value);
    if (!createIdEdited) {
      setCreateId(slugifyId(value));
    }
  };

  const handleCreateIdChange = (value: string) => {
    setCreateIdEdited(true);
    setCreateId(value);
  };

  // Add new action — invoked by the creation dialog's Create button. Replaces the
  // old instant-append-a-blank-template pattern (playtest feedback: new actions
  // must appear via a pop-up, at the top of the list, not silently at the bottom).
  const createAction = () => {
    if (!canCreateAction) return;

    // requires/reactive_trigger deliberately OMITTED here (not set to empty/none):
    // absent means always-eligible and never-reactive (spec §2.2d) — the editors
    // below handle their absence directly.
    const newAction: Action = {
      id: createId,
      name: createName.trim(),
      type: 'role_meeting',
      icon: createIcon,
      description: createDescription,
      role_id: createRole,
      meeting_id: createId,
      category: createCategory,
      target_scope: createScope,
      prompt: '',
      choices: [{
        id: 'choice_1',
        label: 'Choice 1',
        effects_immediate: {},
        effects_delayed: {}
      }]
    };

    if (createScope === 'user_selected') {
      newAction.prompt_before_selection = 'Which artist should be affected by this decision?';
    }

    setNewActions(prev => [...prev, newAction]);
    // Auto-expand the new action
    setExpandedActions(prev => new Set([...Array.from(prev), newAction.id]));
    setShowCreateDialog(false);
  };

  // Delete action
  const deleteAction = (actionId: string) => {
    // Check if it's a new action
    const isNew = newActions.some(a => a.id === actionId);
    if (isNew) {
      // Remove from newActions
      setNewActions(prev => prev.filter(a => a.id !== actionId));
    } else {
      // Mark existing action as deleted
      setDeletedActionIds(prev => new Set([...Array.from(prev), actionId]));
    }
    // Remove from modified if it was there
    setModifiedActions(prev => {
      const newMap = new Map(prev);
      newMap.delete(actionId);
      return newMap;
    });
    // Collapse if expanded
    setExpandedActions(prev => {
      const next = new Set(prev);
      next.delete(actionId);
      return next;
    });
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setModifiedActions(new Map());
    setNewActions([]);
    setDeletedActionIds(new Set());
    setLintIssues([]);
    toast({
      title: "Changes Discarded",
      description: "All unsaved changes have been discarded.",
    });
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    const totalChanges = modifiedActions.size + newActions.length + deletedActionIds.size;
    if (editMode && totalChanges > 0) {
      // Warn about unsaved changes
      setShowDiscardConfirm(true);
    } else {
      setEditMode(!editMode);
    }
  };

  const confirmDiscardAndExitEditMode = () => {
    setEditMode(false);
    setModifiedActions(new Map());
    setNewActions([]);
    setDeletedActionIds(new Set());
    setLintIssues([]);
  };

  // Save all changes to the backend
  const handleSaveChanges = async () => {
    const totalChanges = modifiedActions.size + newActions.length + deletedActionIds.size;
    if (totalChanges === 0) {
      toast({
        title: "No Changes",
        description: "There are no modifications to save.",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);
    setLintIssues([]);

    try {
      // Create a new copy of the data with all changes applied
      const updatedActions = [
        // Original actions (excluding deleted, applying modifications)
        ...data.weekly_actions
          .filter(action => !deletedActionIds.has(action.id))
          .map(action => {
            const modified = modifiedActions.get(action.id);
            return modified || action;
          }),
        // Add new actions
        ...newActions
      ];

      // Lint gate FIRST (spec §2.2f): hard-block issues (bad effect key, bad
      // requires tag, bad reactive_trigger, empty choices, dup ids, weakly-
      // dominant choices) must all clear before we even attempt the Zod parse.
      const issues = lintMeetings(updatedActions);
      if (issues.length > 0) {
        setLintIssues(issues);
        toast({
          title: "Lint Failed",
          description: `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} that must be fixed before saving. See the panel below.`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const updatedConfig = {
        ...data,
        weekly_actions: updatedActions,
        generated: new Date().toISOString()
      };

      // Validate using shared schema BEFORE sending to backend (second gate)
      try {
        ActionsConfigSchema.parse(updatedConfig);
      } catch (validationError: any) {
        const errorMessage = validationError.errors
          ? validationError.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
          : 'Invalid configuration structure';

        toast({
          title: "Validation Failed",
          description: `Please fix the following errors before saving: ${errorMessage}`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Call the backend API
      const response = await apiRequest('POST', '/api/admin/actions-config', { config: updatedConfig });

      const result = await response.json();

      const changesSummary = [
        modifiedActions.size > 0 ? `${modifiedActions.size} modified` : '',
        newActions.length > 0 ? `${newActions.length} added` : '',
        deletedActionIds.size > 0 ? `${deletedActionIds.size} deleted` : ''
      ].filter(Boolean).join(', ');

      toast({
        title: "✓ Changes Saved",
        description: `Successfully saved changes (${changesSummary}) to actions.json. ${result.backupCreated ? 'Backup created.' : ''}`,
        variant: "default",
      });

      // Clear all local edit state and refetch the config instead of a full
      // page reload (spec §2.2e).
      setModifiedActions(new Map());
      setNewActions([]);
      setDeletedActionIds(new Set());
      setLintIssues([]);
      await queryClient.invalidateQueries({ queryKey: ACTIONS_CONFIG_QUERY_KEY });

    } catch (error) {
      console.error('Failed to save actions config:', error);
      toast({
        title: "✗ Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save changes. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-8 text-center text-white/60">
            Loading actions configuration...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isConfigError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-8 text-center text-red-300">
            Failed to load actions configuration
            {configError instanceof Error ? `: ${configError.message}` : '.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Meetings</h2>
            <p className="text-white/70">
              Version {data.version} • Generated {data.generated} • {data.weekly_actions.length} actions
            </p>
            <p className="text-sm text-white/50">{data.description}</p>
          </div>

          {/* Lint Error Panel (spec §2.2f): grouped by action, scope + message. */}
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

          {/* Production Warning Banner */}
          {import.meta.env.PROD && (
            <Card className="bg-yellow-900/20 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-300 mb-1">
                      Production Environment Warning
                    </div>
                    <p className="text-sm text-yellow-200/80">
                      You are editing the actions.json file in production. Any changes saved here will be <strong>lost on next deployment</strong>.
                      All permanent edits should be made in your local development environment, committed to git, and deployed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Mode Controls */}
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Edit Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleEditMode}
                    >
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
                  </div>

                  {/* Add New Action Button */}
                  {editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateDialog}
                      className="bg-green-600/10 hover:bg-green-600/20 border-green-500/30 text-green-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Action
                    </Button>
                  )}

                  {/* Changes Counter */}
                  {editMode && (modifiedActions.size > 0 || newActions.length > 0 || deletedActionIds.size > 0) && (
                    <div className="flex items-center gap-2 text-orange-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {modifiedActions.size > 0 && `${modifiedActions.size} modified`}
                        {modifiedActions.size > 0 && (newActions.length > 0 || deletedActionIds.size > 0) && ', '}
                        {newActions.length > 0 && `${newActions.length} new`}
                        {newActions.length > 0 && deletedActionIds.size > 0 && ', '}
                        {deletedActionIds.size > 0 && `${deletedActionIds.size} deleted`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Save/Discard Buttons */}
                {editMode && (modifiedActions.size > 0 || newActions.length > 0 || deletedActionIds.size > 0) && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDiscardChanges}
                    >
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

              {/* Edit Mode Info */}
              {editMode && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/60">
                    <strong>Edit Mode Active:</strong> Click on action names, descriptions, or prompts to edit them. Changes are tracked and can be saved all at once.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div>
              <Input
                placeholder="Search actions by name, ID, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>

            {/* Executive/Role Filter */}
            <div>
              <div className="text-sm font-medium text-white/80 mb-2">Executive:</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedRole === null ? "default" : "outline"}
                  onClick={() => setSelectedRole(null)}
                >
                  All
                </Button>
                {uniqueRoles.map(roleId => (
                  <Button
                    key={roleId}
                    size="sm"
                    variant={selectedRole === roleId ? "default" : "outline"}
                    onClick={() => setSelectedRole(roleId)}
                  >
                    {getRoleDisplayName(roleId)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Target Scope Filter */}
            <div>
              <div className="text-sm font-medium text-white/80 mb-2">Target Scope:</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedScope === null ? "default" : "outline"}
                  onClick={() => setSelectedScope(null)}
                >
                  All
                </Button>
                {['global', 'predetermined', 'user_selected'].map(scope => (
                  <Button
                    key={scope}
                    size="sm"
                    variant={selectedScope === scope ? "default" : "outline"}
                    onClick={() => setSelectedScope(scope)}
                  >
                    {scope}
                  </Button>
                ))}
              </div>
            </div>

            {/* Expand/Collapse Controls */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button size="sm" variant="outline" onClick={expandAll}>
                Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                Collapse All
              </Button>
              <div className="ml-auto text-sm text-white/60 flex items-center">
                Showing {filteredActions.length} of {data.weekly_actions.length} actions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredActions.map(originalAction => {
            const action = getCurrentAction(originalAction.id);
            const isExpanded = expandedActions.has(action.id);
            const isModified = modifiedActions.has(action.id);
            const { allImmediate, allDelayed } = getActionEffectsSummary(action);

            return (
              <Card
                key={action.id}
                className={`bg-gray-900/50 border-white/10 hover:border-white/20 transition-colors ${
                  isModified ? 'ring-2 ring-orange-500/50' : ''
                }`}
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={(e) => {
                    // Don't toggle if clicking on editable content or buttons
                    if ((e.target as HTMLElement).contentEditable === 'true') return;
                    if ((e.target as HTMLElement).closest('button')) return;
                    toggleAction(action.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={parseIconClass(action.icon)} className="text-brand-gold text-lg" />
                        <CardTitle
                          className={`text-xl ${editMode ? 'hover:bg-white/5 px-2 -mx-2 rounded cursor-text' : ''}`}
                          contentEditable={editMode}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            if (editMode) {
                              const newName = e.currentTarget.textContent || action.name;
                              if (newName !== action.name) {
                                updateAction(action.id, { name: newName });
                              }
                            }
                          }}
                          onClick={(e) => {
                            if (editMode) {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {action.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {action.id}
                        </Badge>
                        {isModified && (
                          <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                            Modified
                          </Badge>
                        )}
                        {newActions.some(a => a.id === action.id) && (
                          <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                            New
                          </Badge>
                        )}
                      </div>
                      <CardDescription
                        className={`${editMode ? 'hover:bg-white/5 px-2 -mx-2 rounded cursor-text' : ''}`}
                        contentEditable={editMode}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          if (editMode) {
                            const newDesc = e.currentTarget.textContent || action.description;
                            if (newDesc !== action.description) {
                              updateAction(action.id, { description: newDesc });
                            }
                          }
                        }}
                        onClick={(e) => {
                          if (editMode) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {action.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {editMode ? (
                          <>
                            {/* Target Scope Select */}
                            <Select
                              value={action.target_scope}
                              onValueChange={(value) => {
                                const newScope = value as 'global' | 'predetermined' | 'user_selected';
                                updateAction(action.id, { target_scope: newScope });

                                // Auto-add prompt_before_selection field for user_selected
                                if (newScope === 'user_selected' && !action.prompt_before_selection) {
                                  updateAction(action.id, {
                                    target_scope: newScope,
                                    prompt_before_selection: 'Which artist should be affected by this decision?'
                                  });
                                }

                                // Add {artistName} placeholder to prompt if missing for user_selected
                                if (newScope === 'user_selected' && !action.prompt.includes('{artistName}')) {
                                  toast({
                                    title: "Action Required",
                                    description: "Add {artistName} placeholder to main prompt for User Selected actions",
                                    variant: "default",
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto min-w-[150px] border-white/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getTargetScopeOptions().map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Role ID Select */}
                            <Select
                              value={action.role_id}
                              onValueChange={(value) => {
                                updateAction(action.id, { role_id: value });
                              }}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto min-w-[100px] border-white/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getRoleOptions().map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getScopeBadgeColor(action.target_scope)}`}
                            >
                              {action.target_scope}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {action.role_id}
                            </Badge>
                          </>
                        )}
                      </div>

                      {/* Effects Preview - Collapsed View */}
                      {!isExpanded && (Object.keys(allImmediate).length > 0 || Object.keys(allDelayed).length > 0) && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                          {/* Immediate Effects */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Zap className="h-3 w-3 text-orange-300" />
                              <span className="text-xs font-medium text-white/60">Immediate</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(allImmediate).length > 0 ? (
                                Object.entries(allImmediate).map(([effect, values]) => {
                                  const valuesArray = Array.from(values);
                                  const hasPositive = valuesArray.some(v => v > 0);
                                  const hasNegative = valuesArray.some(v => v < 0);
                                  const isOrphaned = !isEffectConnected(effect);
                                  return (
                                    <Badge
                                      key={effect}
                                      variant="outline"
                                      className={`text-xs ${
                                        isOrphaned
                                          ? 'bg-gray-500/10 text-gray-400 border-gray-500/30 opacity-50'
                                          : hasPositive && hasNegative
                                          ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                                          : hasPositive
                                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                                      }`}
                                      title={isOrphaned ? 'Not implemented in game logic' : undefined}
                                    >
                                      {effect.replace(/_/g, ' ')} {isOrphaned && '○'}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-white/30">None</span>
                              )}
                            </div>
                          </div>

                          {/* Delayed Effects */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-blue-300" />
                              <span className="text-xs font-medium text-white/60">Delayed</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(allDelayed).length > 0 ? (
                                Object.entries(allDelayed).map(([effect, values]) => {
                                  const isOrphaned = !isEffectConnected(effect);
                                  return (
                                    <Badge
                                      key={effect}
                                      variant="outline"
                                      className={`text-xs ${
                                        isOrphaned
                                          ? 'bg-gray-500/10 text-gray-400 border-gray-500/30 opacity-50'
                                          : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                      }`}
                                      title={isOrphaned ? 'Not implemented in game logic' : undefined}
                                    >
                                      {effect.replace(/_/g, ' ')} {isOrphaned && '○'}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-white/30">None</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editMode && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmActionId(action.id);
                          }}
                          title="Delete action"
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
                    {/* Prompts */}
                    <div>
                      {/* Show pre-selection prompt for user_selected OR if it already exists */}
                      {(action.target_scope === 'user_selected' || action.prompt_before_selection) && (
                        <div className={`mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 ${editMode ? 'hover:bg-blue-500/20 cursor-pointer' : ''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                              Pre-Selection Prompt {action.target_scope === 'user_selected' && '(Required for User Selected)'}
                              {action.target_scope === 'user_selected' && !action.prompt_before_selection && (
                                <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                                  Missing
                                </Badge>
                              )}
                            </div>
                            {editMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                                onClick={() => setEditingPrompt({actionId: action.id, field: 'prompt_before_selection'})}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {editingPrompt?.actionId === action.id && editingPrompt?.field === 'prompt_before_selection' ? (
                            <div className="space-y-2">
                              <Textarea
                                defaultValue={action.prompt_before_selection}
                                className="text-sm bg-black/30 border-blue-500/30"
                                rows={3}
                                onBlur={(e) => {
                                  const newValue = e.currentTarget.value;
                                  if (newValue !== action.prompt_before_selection) {
                                    updateAction(action.id, { prompt_before_selection: newValue });
                                  }
                                  setEditingPrompt(null);
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingPrompt(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-white/90">
                              {action.prompt_before_selection}
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`p-3 bg-brand-gold/10 rounded-lg border border-brand-gold/20 ${editMode ? 'hover:bg-brand-gold/20 cursor-pointer' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold text-brand-gold flex items-center gap-2">
                            Main Prompt:
                            {action.target_scope === 'user_selected' && !action.prompt.includes('{artistName}') && (
                              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                Missing {'{artistName}'} placeholder
                              </Badge>
                            )}
                          </div>
                          {editMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => setEditingPrompt({actionId: action.id, field: 'prompt'})}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingPrompt?.actionId === action.id && editingPrompt?.field === 'prompt' ? (
                          <div className="space-y-2">
                            <Textarea
                              defaultValue={action.prompt}
                              className="text-sm bg-black/30 border-brand-gold/30"
                              rows={3}
                              onBlur={(e) => {
                                const newValue = e.currentTarget.value;
                                if (newValue !== action.prompt) {
                                  updateAction(action.id, { prompt: newValue });
                                }
                                setEditingPrompt(null);
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingPrompt(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-white/90">
                            {action.prompt}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Scope Help */}
                    {editMode && (
                      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="text-sm font-semibold text-purple-300 mb-2">
                          ℹ️ Target Scope Guide
                        </div>
                        <div className="text-xs text-white/70 space-y-2">
                          <div>
                            <strong className="text-blue-300">🌍 Global:</strong> Affects ALL signed artists equally.
                            <div className="text-white/50 ml-4">Example: CEO quarterly goals boost everyone's morale</div>
                          </div>
                          <div>
                            <strong className="text-yellow-300">⭐ Predetermined:</strong> Auto-selects artist with highest popularity.
                            <div className="text-white/50 ml-4">Example: Crisis management where top artist handles media</div>
                          </div>
                          <div>
                            <strong className="text-green-300">👤 User Selected:</strong> Player chooses which artist is affected.
                            <div className="text-white/50 ml-4">Requires: <code className="text-orange-300">prompt_before_selection</code> and <code className="text-orange-300">{'{artistName}'}</code> placeholder</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata Configuration */}
                    {editMode && (
                      <div className="p-4 bg-gray-800/30 rounded-lg border border-white/10">
                        <div className="text-sm font-semibold text-white/80 mb-3">
                          Metadata Configuration
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Icon Field */}
                          <div>
                            <label className="text-xs text-white/60 mb-1 block">Icon</label>
                            <div className="flex gap-3 items-start">
                              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-brand-gold/20 to-brand-burgundy/20 rounded-lg border-2 border-brand-gold/40 shadow-lg">
                                <FontAwesomeIcon icon={parseIconClass(action.icon)} className="text-brand-gold text-3xl" />
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={action.icon}
                                  onValueChange={(value) => {
                                    updateAction(action.id, { icon: value });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-black/30 border-white/10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getIconOptions().map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        <span className="flex items-center gap-2">
                                          <FontAwesomeIcon icon={parseIconClass(opt.iconClass)} className="text-brand-gold w-4" />
                                          <span className="capitalize">{opt.label}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="text-xs text-white/40 mt-1">{action.icon}</div>
                              </div>
                            </div>
                          </div>

                          {/* Category Select */}
                          <div>
                            <label className="text-xs text-white/60 mb-1 block">Category</label>
                            <Select
                              value={action.category}
                              onValueChange={(value) => {
                                updateAction(action.id, { category: value });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getCategoryOptions().map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className="flex items-center gap-2">
                                      <FontAwesomeIcon icon={parseIconClass(opt.icon)} />
                                      {opt.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Meeting ID */}
                          <div className="col-span-2">
                            <label className="text-xs text-white/60 mb-1 block">Meeting ID</label>
                            <Input
                              value={action.meeting_id}
                              onChange={(e) => {
                                updateAction(action.id, { meeting_id: e.target.value });
                              }}
                              className="text-xs h-8 bg-black/30 border-white/10"
                              placeholder="meeting_id"
                            />
                          </div>

                          {/* requires (relevance tags) editor (spec §2.2a) */}
                          <div className="col-span-2">
                            <label className="text-xs text-white/60 mb-1 block">
                              Eligibility Requirements (requires)
                            </label>
                            <div className="space-y-1.5 p-2 bg-black/20 rounded border border-white/10">
                              {RELEVANCE_TAGS.map(tag => {
                                const currentRequires = (action.requires ?? []) as string[];
                                const checked = currentRequires.includes(tag);
                                return (
                                  <label key={tag} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        const current = new Set<RelevanceTag>(currentRequires as RelevanceTag[]);
                                        if (value) {
                                          current.add(tag);
                                        } else {
                                          current.delete(tag);
                                        }
                                        const nextRequires = computeRequiresFromChecked(current);
                                        updateAction(action.id, {
                                          requires: nextRequires as Action['requires'],
                                        });
                                      }}
                                    />
                                    {RELEVANCE_TAG_LABELS[tag]}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="text-xs text-white/40 mt-1">
                              Meeting is only offered when ALL checked conditions are true. Nothing checked = always available.
                            </div>
                          </div>

                          {/* reactive_trigger selector (spec §2.2c) */}
                          <div className="col-span-2">
                            <label className="text-xs text-white/60 mb-1 block">Reactive Trigger</label>
                            <Select
                              value={action.reactive_trigger ?? 'none'}
                              onValueChange={(value) => {
                                updateAction(action.id, {
                                  reactive_trigger: value === 'none' ? undefined : (value as HappeningType),
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (not reactive)</SelectItem>
                                {HAPPENING_TYPES.map(trigger => (
                                  <SelectItem key={trigger} value={trigger} title={HAPPENING_TYPE_LABELS[trigger]}>
                                    {HAPPENING_TYPE_LABELS[trigger]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="text-xs text-white/40 mt-1">
                              A reactive meeting jumps ahead of the normal draw when its trigger happened this week.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* requires / reactive_trigger badges (view mode) */}
                    {!editMode && ((action.requires && action.requires.length > 0) || action.reactive_trigger) && (
                      <div className="flex flex-wrap gap-2">
                        {(action.requires ?? []).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                            {RELEVANCE_TAG_LABELS[tag as RelevanceTag] ?? tag}
                          </Badge>
                        ))}
                        {action.reactive_trigger && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                            Reactive: {HAPPENING_TYPE_LABELS[action.reactive_trigger as HappeningType] ?? action.reactive_trigger}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Choices */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-white/80">
                          Choices ({action.choices.length}):
                        </div>
                        {editMode && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => addChoice(action.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Choice
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {action.choices.map((choice, idx) => {
                          const expanded = isChoiceExpanded(action.id, choice.id);
                          return (
                            <div
                              key={choice.id}
                              className="bg-black/30 rounded-lg border border-white/10"
                            >
                              {/* Choice Header - Always Visible */}
                              <div className="p-3 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleChoiceExpanded(action.id, choice.id)}
                                >
                                  {expanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  #{idx + 1}
                                </Badge>
                                <div className="flex-1">
                                  {editMode && expanded ? (
                                    <Input
                                      value={choice.label}
                                      onChange={(e) => {
                                        updateChoice(action.id, choice.id, { label: e.target.value });
                                      }}
                                      className="h-7 text-sm bg-black/30 border-white/10"
                                      placeholder="Choice label"
                                    />
                                  ) : (
                                    <div className="font-medium text-white text-sm">
                                      {choice.label}
                                    </div>
                                  )}
                                </div>
                                {editMode && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => deleteChoice(action.id, choice.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              {/* Choice Details - Expanded */}
                              {expanded && (
                                <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                                  {/* Choice ID */}
                                  <div>
                                    <label className="text-xs text-white/60 mb-1 block">Choice ID:</label>
                                    {editMode ? (
                                      <Input
                                        value={choice.id}
                                        onChange={(e) => {
                                          updateChoice(action.id, choice.id, { id: e.target.value });
                                        }}
                                        className="h-7 text-xs bg-black/30 border-white/10"
                                        placeholder="choice_id"
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
                                          onClick={() => addEffect(action.id, choice.id, 'immediate')}
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
                                                  onValueChange={newKey => {
                                                    renameEffect(action.id, choice.id, 'immediate', key, newKey);
                                                  }}
                                                >
                                                  <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {getCanonicalEffectOptions().map(opt => (
                                                      <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                                                        {opt.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <Input
                                                  type="number"
                                                  value={value}
                                                  onChange={(e) => {
                                                    updateEffect(action.id, choice.id, 'immediate', key, Number(e.target.value));
                                                  }}
                                                  className="h-7 text-xs bg-black/30 border-white/10 w-24"
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                  onClick={() => deleteEffect(action.id, choice.id, 'immediate', key)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                  !isEffectConnected(key)
                                                    ? 'bg-gray-500/10 text-gray-400 border-gray-500/30 opacity-50'
                                                    : typeof value === 'number' && value > 0
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                    : typeof value === 'number' && value < 0
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                }`}
                                                title={!isEffectConnected(key) ? 'Not implemented in game logic' : undefined}
                                              >
                                                {key}: {value} {!isEffectConnected(key) && '○'}
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
                                          onClick={() => addEffect(action.id, choice.id, 'delayed')}
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
                                                  onValueChange={newKey => {
                                                    renameEffect(action.id, choice.id, 'delayed', key, newKey);
                                                  }}
                                                >
                                                  <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {getCanonicalEffectOptions().map(opt => (
                                                      <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                                                        {opt.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <Input
                                                  type="number"
                                                  value={value}
                                                  onChange={(e) => {
                                                    updateEffect(action.id, choice.id, 'delayed', key, Number(e.target.value));
                                                  }}
                                                  className="h-7 text-xs bg-black/30 border-white/10 w-24"
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                  onClick={() => deleteEffect(action.id, choice.id, 'delayed', key)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                  !isEffectConnected(key)
                                                    ? 'bg-gray-500/10 text-gray-400 border-gray-500/30 opacity-50'
                                                    : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                                }`}
                                                title={!isEffectConnected(key) ? 'Not implemented in game logic' : undefined}
                                              >
                                                {key}: {value} {!isEffectConnected(key) && '○'}
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

                    {/* Raw JSON (collapsible) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80">
                        View Raw JSON
                      </summary>
                      <pre className="mt-2 p-3 bg-black/50 rounded text-xs overflow-auto">
                        {JSON.stringify(action, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {filteredActions.length === 0 && (
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-8 text-center text-white/50">
              No actions match your filters. Try adjusting your search or filter criteria.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes to actions.json?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save {modifiedActions.size + newActions.length + deletedActionIds.size} change{modifiedActions.size + newActions.length + deletedActionIds.size !== 1 ? 's' : ''} to the actions.json file.
              A backup will be created automatically before saving.
              <br /><br />
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
              You have {modifiedActions.size + newActions.length + deletedActionIds.size} unsaved change{modifiedActions.size + newActions.length + deletedActionIds.size !== 1 ? 's' : ''}. Exiting edit mode will discard them.
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

      {/* Delete Action Confirmation Dialog */}
      <AlertDialog open={deleteConfirmActionId !== null} onOpenChange={(open) => !open && setDeleteConfirmActionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmActionId && (() => {
                const actionToDelete = getCurrentAction(deleteConfirmActionId);
                const isNew = newActions.some(a => a.id === deleteConfirmActionId);
                return (
                  <>
                    Are you sure you want to delete <strong className="text-white">{actionToDelete?.name}</strong>?
                    <br /><br />
                    {isNew ? (
                      <span className="text-yellow-400">
                        This action will be removed from the new actions list (not yet saved to file).
                      </span>
                    ) : (
                      <span className="text-red-400 font-medium">
                        This action will be marked for deletion and removed when you save changes.
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
                if (deleteConfirmActionId) {
                  deleteAction(deleteConfirmActionId);
                  setDeleteConfirmActionId(null);
                  toast({
                    title: "Action Deleted",
                    description: "The action has been marked for deletion. Save changes to apply.",
                    variant: "default",
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Action Dialog (slice 4, playtest feedback): replaces the old
          instant-append pattern. Create adds the action at the TOP of the display
          list (see filteredActions ordering above); Cancel creates nothing. */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Action</DialogTitle>
            <DialogDescription>
              Fill in the basics below. You can edit choices, effects, and other metadata after creating.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="create-action-name">Name *</Label>
              <Input
                id="create-action-name"
                value={createName}
                onChange={(e) => handleCreateNameChange(e.target.value)}
                className="bg-black/30 border-white/10 mt-1"
                placeholder="e.g. CMO: Viral Push"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="create-action-description">Description</Label>
              <Textarea
                id="create-action-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="bg-black/30 border-white/10 mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger className="bg-black/30 border-white/10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger className="bg-black/30 border-white/10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions().map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <FontAwesomeIcon icon={parseIconClass(opt.icon)} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Target Scope</Label>
              <Select value={createScope} onValueChange={(value) => setCreateScope(value as 'global' | 'predetermined' | 'user_selected')}>
                <SelectTrigger className="bg-black/30 border-white/10 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTargetScopeOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-white/40 mt-1">
                {getTargetScopeOptions().find(opt => opt.value === createScope)?.description}
              </div>
            </div>

            <div>
              <Label>Icon</Label>
              <div className="flex gap-3 items-start mt-1">
                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-brand-gold/20 to-brand-burgundy/20 rounded-lg border-2 border-brand-gold/40">
                  <FontAwesomeIcon icon={parseIconClass(createIcon)} className="text-brand-gold text-2xl" />
                </div>
                <div className="flex-1">
                  <Select value={createIcon} onValueChange={setCreateIcon}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getIconOptions().map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={parseIconClass(opt.iconClass)} className="text-brand-gold w-4" />
                            <span className="capitalize">{opt.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="create-action-id">ID</Label>
              <Input
                id="create-action-id"
                value={createId}
                onChange={(e) => handleCreateIdChange(e.target.value)}
                className="bg-black/30 border-white/10 mt-1 font-mono text-sm"
              />
              {createIdTaken && (
                <div className="text-xs text-red-400 mt-1">This id is already taken.</div>
              )}
              {createId.length === 0 && (
                <div className="text-xs text-white/40 mt-1">Auto-generated from the name; you can edit it.</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={createAction}
              disabled={!canCreateAction}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
