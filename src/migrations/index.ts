import * as migration_20260126_220236 from './20260126_220236';
import * as migration_20260127_093510 from './20260127_093510';
import * as migration_20260127_101529_portfolio_v4_refinement from './20260127_101529_portfolio_v4_refinement';
import * as migration_20260127_132433_remove_id_unique_constraint from './20260127_132433_remove_id_unique_constraint';

export const migrations = [
  {
    up: migration_20260126_220236.up,
    down: migration_20260126_220236.down,
    name: '20260126_220236',
  },
  {
    up: migration_20260127_093510.up,
    down: migration_20260127_093510.down,
    name: '20260127_093510',
  },
  {
    up: migration_20260127_101529_portfolio_v4_refinement.up,
    down: migration_20260127_101529_portfolio_v4_refinement.down,
    name: '20260127_101529_portfolio_v4_refinement',
  },
  {
    up: migration_20260127_132433_remove_id_unique_constraint.up,
    down: migration_20260127_132433_remove_id_unique_constraint.down,
    name: '20260127_132433_remove_id_unique_constraint'
  },
];
