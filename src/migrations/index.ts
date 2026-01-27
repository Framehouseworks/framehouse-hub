import * as migration_20260126_220236 from './20260126_220236';
import * as migration_20260127_093510 from './20260127_093510';

export const migrations = [
  {
    up: migration_20260126_220236.up,
    down: migration_20260126_220236.down,
    name: '20260126_220236',
  },
  {
    up: migration_20260127_093510.up,
    down: migration_20260127_093510.down,
    name: '20260127_093510'
  },
];
