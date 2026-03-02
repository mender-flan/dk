import { getLocation, type WorldState } from './state.js';
import type { Direction, PlayerView } from './types.js';

export function buildPlayerView(state: WorldState): PlayerView {
  const location = getLocation(state, state.playerLocationId);
  const exits = (Object.entries(location.exits) as Array<[Direction, string]>).map(
    ([direction, toLocationId]) => {
      const toLocation = getLocation(state, toLocationId);
      return {
        direction,
        toLocationId,
        toLocationName: toLocation.name,
      };
    },
  );

  exits.sort((a, b) => a.direction.localeCompare(b.direction));

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
