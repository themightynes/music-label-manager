import { useState, useMemo } from 'react';
import GameLayout from '@/layouts/GameLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Zap, Clock, Edit, Save, X, AlertCircle, Pencil, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import actionsData from '@/../../data/actions.json';

type Effect = {
  [key: string]: number | string;
};

type Choice = {
  id: string;
  label: string;
  effects_immediate: Effect;
  effects_delayed: Effect;
};

type Action = {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  role_id: string;
  meeting_id: string;
  category: string;
  target_scope: 'global' | 'predetermined' | 'user_selected';
  prompt_before_selection?: string;
  prompt: string;
  choices: Choice[];
};

type ActionsData = {
  version: string;
  generated: string;
  description: string;
  weekly_actions: Action[];
  action_categories: {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
  }[];
};

const data = actionsData as ActionsData;

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

export default function ActionsViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [modifiedActions, setModifiedActions] = useState<Map<string, Action>>(new Map());
  const [editingPrompt, setEditingPrompt] = useState<{actionId: string; field: 'prompt' | 'prompt_before_selection'} | null>(null);
  const [expandedChoices, setExpandedChoices] = useState<Map<string, Set<string>>>(new Map()); // actionId -> Set of choiceIds
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast} = useToast();

  // Get unique roles from actions
  const uniqueRoles = useMemo(() => {
    const roles = new Set(data.weekly_actions.map(action => action.role_id));
    return Array.from(roles).sort();
  }, []);

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
      { value: 'global', label: 'Global', description: 'Affects all artists' },
      { value: 'predetermined', label: 'Predetermined', description: 'Affects specific artists' },
      { value: 'user_selected', label: 'User Selected', description: 'Player chooses artist' }
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

  // Filter actions based on search and filters
  const filteredActions = useMemo(() => {
    return data.weekly_actions.filter(action => {
      const matchesSearch = searchTerm === '' ||
        action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesScope = !selectedScope || action.target_scope === selectedScope;
      const matchesRole = !selectedRole || action.role_id === selectedRole;

      return matchesSearch && matchesScope && matchesRole;
    });
  }, [searchTerm, selectedScope, selectedRole]);

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

  // Get the current action (modified or original)
  const getCurrentAction = (actionId: string): Action => {
    return modifiedActions.get(actionId) || data.weekly_actions.find(a => a.id === actionId)!;
  };

  // Update an action field
  const updateAction = (actionId: string, updates: Partial<Action>) => {
    const current = getCurrentAction(actionId);
    const updated = { ...current, ...updates };
    setModifiedActions(new Map(modifiedActions).set(actionId, updated));
  };

  // Get all unique effect names from all actions
  const getAllEffectNames = useMemo(() => {
    const effectNames = new Set<string>();
    data.weekly_actions.forEach(action => {
      action.choices.forEach(choice => {
        Object.keys(choice.effects_immediate).forEach(key => effectNames.add(key));
        Object.keys(choice.effects_delayed).forEach(key => effectNames.add(key));
      });
    });
    return Array.from(effectNames).sort();
  }, []);

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
  const updateEffect = (actionId: string, choiceId: string, effectType: 'immediate' | 'delayed', effectKey: string, value: number) => {
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

    // Find first unused effect name
    let newEffectKey = 'money';
    if (existingKeys.includes(newEffectKey)) {
      newEffectKey = getAllEffectNames.find(name => !existingKeys.includes(name)) || 'new_effect';
    }

    updateEffect(actionId, choiceId, effectType, newEffectKey, 0);
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setModifiedActions(new Map());
    toast({
      title: "Changes Discarded",
      description: "All unsaved changes have been discarded.",
    });
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode && modifiedActions.size > 0) {
      // Warn about unsaved changes
      if (confirm(`You have ${modifiedActions.size} unsaved change(s). Discard them?`)) {
        setEditMode(false);
        setModifiedActions(new Map());
      }
    } else {
      setEditMode(!editMode);
    }
  };

  // Save all changes to the backend
  const handleSaveChanges = async () => {
    if (modifiedActions.size === 0) {
      toast({
        title: "No Changes",
        description: "There are no modifications to save.",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Create a new copy of the data with modified actions merged in
      const updatedActions = data.weekly_actions.map(action => {
        const modified = modifiedActions.get(action.id);
        return modified || action;
      });

      const updatedConfig = {
        ...data,
        weekly_actions: updatedActions,
        generated: new Date().toISOString()
      };

      // Call the backend API
      const response = await apiRequest('POST', '/api/admin/actions-config', { config: updatedConfig });

      const result = await response.json();

      toast({
        title: "✓ Changes Saved",
        description: `Successfully saved ${modifiedActions.size} action(s) to actions.json. ${result.backupCreated ? 'Backup created.' : ''}`,
        variant: "default",
      });

      // Clear modified actions and reload the page to reflect changes
      setModifiedActions(new Map());

      // Reload the page after a short delay to let user see the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);

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

  return (
    <GameLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Actions JSON Viewer</h1>
            <p className="text-white/70">
              Version {data.version} • Generated {data.generated} • {data.weekly_actions.length} actions
            </p>
            <p className="text-sm text-white/50">{data.description}</p>
          </div>

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

                  {/* Modified Counter */}
                  {editMode && modifiedActions.size > 0 && (
                    <div className="flex items-center gap-2 text-orange-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {modifiedActions.size} action{modifiedActions.size !== 1 ? 's' : ''} modified
                      </span>
                    </div>
                  )}
                </div>

                {/* Save/Discard Buttons */}
                {editMode && modifiedActions.size > 0 && (
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
                    // Don't toggle if clicking on editable content
                    if ((e.target as HTMLElement).contentEditable === 'true') return;
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
                                updateAction(action.id, { target_scope: value as 'global' | 'predetermined' | 'user_selected' });
                              }}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto min-w-[120px] border-white/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getTargetScopeOptions().map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
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
                                  return (
                                    <Badge
                                      key={effect}
                                      variant="outline"
                                      className={`text-xs ${
                                        hasPositive && hasNegative
                                          ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                                          : hasPositive
                                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                                      }`}
                                    >
                                      {effect.replace(/_/g, ' ')}
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
                                Object.entries(allDelayed).map(([effect, values]) => (
                                  <Badge
                                    key={effect}
                                    variant="outline"
                                    className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30"
                                  >
                                    {effect.replace(/_/g, ' ')}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-white/30">None</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost">
                      {isExpanded ? '▼' : '▶'}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 border-t border-white/10 pt-4">
                    {/* Prompts */}
                    <div>
                      {action.prompt_before_selection && (
                        <div className={`mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 ${editMode ? 'hover:bg-blue-500/20 cursor-pointer' : ''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-blue-300">
                              Pre-Selection Prompt:
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
                          <div className="text-xs font-semibold text-brand-gold">
                            Main Prompt:
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
                        </div>
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
                                                  onValueChange={(newKey) => {
                                                    // Delete old key, add new key with same value
                                                    deleteEffect(action.id, choice.id, 'immediate', key);
                                                    updateEffect(action.id, choice.id, 'immediate', newKey, Number(value));
                                                  }}
                                                >
                                                  <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {getAllEffectNames.map(effectName => (
                                                      <SelectItem key={effectName} value={effectName}>
                                                        {effectName.replace(/_/g, ' ')}
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
                                                  onValueChange={(newKey) => {
                                                    // Delete old key, add new key with same value
                                                    deleteEffect(action.id, choice.id, 'delayed', key);
                                                    updateEffect(action.id, choice.id, 'delayed', newKey, Number(value));
                                                  }}
                                                >
                                                  <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 flex-1">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {getAllEffectNames.map(effectName => (
                                                      <SelectItem key={effectName} value={effectName}>
                                                        {effectName.replace(/_/g, ' ')}
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
                                                className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30"
                                              >
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes to actions.json?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save {modifiedActions.size} modified action{modifiedActions.size !== 1 ? 's' : ''} to the actions.json file.
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
    </GameLayout>
  );
}
