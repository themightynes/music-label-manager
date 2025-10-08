import { describe, it, expect, afterEach } from 'vitest';
import { createActor } from 'xstate';
import { arOfficeMachine } from '../../client/src/machines/arOfficeMachine';

describe('A&R Office State Machine', () => {
  let actor: ReturnType<typeof createActor<typeof arOfficeMachine>>;

  afterEach(() => {
    if (actor) {
      actor.stop();
    }
  });

  it('should transition to sourcingActive when starting sourcing', () => {
    actor = createActor(arOfficeMachine, {
      input: {
        gameId: 'test-game',
      },
    });

    actor.start();

    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'START_SOURCING', sourcingType: 'active' });

    expect(actor.getSnapshot().matches('sourcingActive')).toBe(true);
  });

  it('should return to idle after completing sourcing', () => {
    actor = createActor(arOfficeMachine, {
      input: {
        gameId: 'test-game',
      },
    });

    actor.start();

    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'START_SOURCING', sourcingType: 'active' });
    actor.send({ type: 'SYNC_STATUS', slotUsed: false, sourcingType: 'active' });
    actor.send({ type: 'COMPLETE_SOURCING' });

    expect(actor.getSnapshot().matches('idle')).toBe(true);
  });

  it('should handle passive sourcing type', () => {
    actor = createActor(arOfficeMachine, {
      input: {
        gameId: 'test-game',
      },
    });

    actor.start();

    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'START_SOURCING', sourcingType: 'passive' });

    expect(actor.getSnapshot().matches('sourcingActive')).toBe(true);
  });

  it('should handle specialized sourcing type', () => {
    actor = createActor(arOfficeMachine, {
      input: {
        gameId: 'test-game',
      },
    });

    actor.start();

    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'START_SOURCING', sourcingType: 'specialized' });

    expect(actor.getSnapshot().matches('sourcingActive')).toBe(true);
  });
});
