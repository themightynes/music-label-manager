/**
 * EventsConfigSchema contract tests (content-editor slice 1).
 *
 * Guards the one-source pattern: data/events.json must parse unchanged
 * against the admin-facing contract schema (mirrors the dataLoader's own
 * SideEventSchema), and the schema must reject non-canonical categories and
 * zero-choice events the same way the engine-side lint suites do.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EventsConfigSchema } from '@shared/api/contracts';

describe('EventsConfigSchema', () => {
  it('parses data/events.json unchanged', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'events.json'), 'utf8');
    const data = JSON.parse(raw);
    const result = EventsConfigSchema.parse(data);
    expect(result.events.length).toBe(data.events.length);
    expect(result.version).toBe(data.version);
  });

  it('rejects a non-canonical category', () => {
    const bad = {
      version: '0.1.0',
      generated: '2025-08-14',
      events: [
        {
          id: 'bad_event',
          role_hint: 'Test',
          category: 'not_a_real_category',
          prompt: 'A test event.',
          choices: [
            {
              id: 'choice_a',
              label: 'Do a thing',
              effects_immediate: {},
              effects_delayed: {},
            },
          ],
        },
      ],
    };
    expect(() => EventsConfigSchema.parse(bad)).toThrow();
  });

  it('rejects an event with zero choices', () => {
    const bad = {
      version: '0.1.0',
      generated: '2025-08-14',
      events: [
        {
          id: 'no_choices_event',
          role_hint: 'Test',
          category: 'sync_licensing',
          prompt: 'A test event.',
          choices: [],
        },
      ],
    };
    expect(() => EventsConfigSchema.parse(bad)).toThrow();
  });
});
