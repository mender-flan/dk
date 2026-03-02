import type { WorldState } from './state.js';

export function assertValidWorldState(state: WorldState): void {
  const errors: string[] = [];

  const locationIds = Object.keys(state.locations);
  if (locationIds.length < 2) {
    errors.push(`Expected at least 2 locations; found ${locationIds.length}.`);
  }

  if (!state.locations[state.playerLocationId]) {
    errors.push(`Player location does not exist: ${state.playerLocationId}.`);
  }

  for (const locationId of locationIds) {
    const location = state.locations[locationId];
    if (!location) continue;

    for (const [direction, toLocationId] of Object.entries(location.exits)) {
      if (!toLocationId) continue;
      if (!state.locations[toLocationId]) {
        errors.push(
          `Exit from ${locationId} via ${direction} points to missing location: ${toLocationId}.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid world state (seed=${state.seed}): ${errors.join(' ')}`);
  }
}
