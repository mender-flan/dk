import type { Direction, EntityId, Seed } from './types.js';

export interface LocationState {
  id: EntityId;
  name: string;
  description: string;
  /**
   * Exits are a directional mapping to other location IDs.
   *
   * Invariant: every referenced location ID must exist in `WorldState.locations`.
   */
  exits: Partial<Record<Direction, EntityId>>;
}

export interface WorldState {
  seed: Seed;
  turn: number;
  playerLocationId: EntityId;
  locations: Record<EntityId, LocationState>;
}

export function getLocation(state: WorldState, locationId: EntityId): LocationState {
  const location = state.locations[locationId];
  if (!location) throw new Error(`Unknown location: ${locationId}`);
  return location;
}
