export type Seed = string;

export type EntityId = string;

export type EntityKind = 'player' | 'location' | 'prop';

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface BudgetConsulted {
  name: string;
  value: number;
  exhausted: boolean;
}

export type RejectionReason =
  | 'unknown-command'
  | 'missing-argument'
  | 'invalid-argument'
  | 'no-exit';

export type Event =
  | {
      type: 'looked';
      locationId: EntityId;
    }
  | {
      type: 'moved';
      direction: Direction;
      fromLocationId: EntityId;
      toLocationId: EntityId;
    }
  | {
      type: 'rejected';
      reason: RejectionReason;
      message: string;
      input: string;
      seed: Seed;
      budgetsConsulted: BudgetConsulted[];
    };

export interface StepResult {
  output: string;
  didAdvanceTurn: boolean;
  events: Event[];
}

export interface PlayerView {
  seed: Seed;
  turn: number;
  location: {
    id: EntityId;
    name: string;
    description: string;
  };
  exits: Array<{
    direction: Direction;
    toLocationId: EntityId;
    toLocationName: string;
  }>;
  visibleEntities: Array<{
    id: EntityId;
    name: string;
    kind: EntityKind;
  }>;
}
