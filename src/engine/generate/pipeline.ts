import { createRng } from '../rng.js';
import type { WorldState } from '../state.js';
import type { Seed } from '../types.js';

const LOCATION_NAMES = [
  'Mossy Clearing',
  'Stone Archway',
  'Quiet Hollow',
  'Windy Path',
  'Ruined Courtyard',
] as const;

const LOCATION_DESCRIPTIONS = [
  'Air hangs still, as if the world is waiting for a first step.',
  'The ground is packed hard with old footprints you cannot quite read.',
  'Somewhere nearby, water drips with stubborn patience.',
  'The light feels filtered, like it has traveled a long way to reach you.',
] as const;

export function generateInitialState(seed: Seed): WorldState {
  const rng = createRng(seed);

  const startName = rng.pick(LOCATION_NAMES);
  const otherName = rng.pick(LOCATION_NAMES);
  const startDesc = rng.pick(LOCATION_DESCRIPTIONS);
  const otherDesc = rng.pick(LOCATION_DESCRIPTIONS);

  const startId = 'loc:start';
  const otherId = 'loc:other';

  return {
    seed,
    turn: 0,
    playerLocationId: startId,
    locations: {
      [startId]: {
        id: startId,
        name: startName,
        description: startDesc,
        exits: { north: otherId },
      },
      [otherId]: {
        id: otherId,
        name: otherName,
        description: otherDesc,
        exits: { south: startId },
      },
    },
  };
}
