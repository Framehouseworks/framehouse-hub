import * as migration_20260409_085938_baseline from './20260409_085938_baseline';

export const migrations = [
  {
    up: migration_20260409_085938_baseline.up,
    down: migration_20260409_085938_baseline.down,
    name: '20260409_085938_baseline'
  },
];
