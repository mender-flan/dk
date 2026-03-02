export interface Rng {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = mulberry32(fnv1a32(seed));

  return {
    nextFloat(): number {
      return next();
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        throw new Error(`Invalid maxExclusive: ${String(maxExclusive)}`);
      }

      return Math.floor(next() * maxExclusive);
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from empty list');
      return items[this.nextInt(items.length)];
    },
  };
}
