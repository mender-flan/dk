import { getLocation, type WorldState } from '../state.js';
import type { Direction, Event } from '../types.js';

function describeLocation(state: WorldState, locationId: string): string {
  const location = getLocation(state, locationId);
  const exitDirections = Object.keys(location.exits) as Direction[];

  const lines: string[] = [];
  lines.push(location.name);
  lines.push(location.description);

  if (exitDirections.length === 0) {
    lines.push('Exits: none.');
  } else {
    lines.push(`Exits: ${exitDirections.sort().join(', ')}.`);
  }

  return lines.join('\n');
}

function renderEvent(state: WorldState, event: Event): string {
  switch (event.type) {
    case 'looked':
      return describeLocation(state, event.locationId);
    case 'moved':
      return `You go ${event.direction}.\n\n${describeLocation(state, event.toLocationId)}`;
    case 'rejected':
      return event.message;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function narrateStep(state: WorldState, events: Event[]): string {
  return events.map((event) => renderEvent(state, event)).join('\n');
}
