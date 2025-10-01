import { createActor } from 'xstate';
import { arOfficeMachine } from '../../client/src/machines/arOfficeMachine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function testArOfficeMachine() {
  console.log('🧪 Testing legacy arOfficeMachine lifecycle');

  const actor = createActor(arOfficeMachine, {
    input: {
      gameId: 'test-game',
    },
  });

  actor.start();

  actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
  actor.send({ type: 'START_SOURCING', sourcingType: 'active' });

  assert(actor.getSnapshot().matches('sourcingActive'), 'Expected sourcingActive after START_SOURCING');

  // Simulate server indicating completion
  actor.send({ type: 'SYNC_STATUS', slotUsed: false, sourcingType: 'active' });
  actor.send({ type: 'COMPLETE_SOURCING' });

  assert(actor.getSnapshot().matches('idle'), 'Expected idle after completion');

  actor.stop();

  console.log('✅ arOfficeMachine lifecycle test passed');
}

try {
  testArOfficeMachine();
} catch (error) {
  console.error('❌ arOfficeMachine test failed', error);
  process.exitCode = 1;
}
