import { getLocation, type WorldState } from '../state.js';
import { DIRECTIONS } from '../directions.js';
import type { Event } from '../types.js';

function describeLocation(state: WorldState, locationId: string): string {
  const location = getLocation(state, locationId);
  const exitDirections = DIRECTIONS.filter((direction) => location.exits[direction]);

  const lines: string[] = [];
  lines.push(location.name);
  lines.push(location.description);

  if (exitDirections.length === 0) {
    lines.push('Exits: none.');
  } else {
    lines.push(`Exits: ${exitDirections.join(', ')}.`);
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
      throw new Error(
        `Unhandled event type in renderEvent: ${(event as { type?: unknown }).type}`,
      );
    }
  }
}

export function narrateStep(state: WorldState, events: Event[]): string {
  return events.map((event) => renderEvent(state, event)).join('\n');
}
