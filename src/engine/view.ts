import { getLocation, type WorldState } from './state.js';
import { DIRECTIONS } from './directions.js';
import type { PlayerView } from './types.js';

export function buildPlayerView(state: WorldState): PlayerView {
  const location = getLocation(state, state.playerLocationId);
  const exits: PlayerView['exits'] = [];
  for (const direction of DIRECTIONS) {
    const toLocationId = location.exits[direction];
    if (!toLocationId) continue;

    // Assumes world referential integrity was validated during engine creation.
    const toLocation = getLocation(state, toLocationId);
    exits.push({
      direction,
      toLocationId,
      toLocationName: toLocation.name,
    });
  }

  return {
    seed: state.seed,
    turn: state.turn,
    location: {
      id: location.id,
      name: location.name,
      description: location.description,
    },
    exits,
    visibleEntities: [],
  };
}
