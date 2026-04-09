import * as migration_20260409_085938_baseline from './20260409_085938_baseline';
import * as migration_20260409_124730_add_pricing_global from './20260409_124730_add_pricing_global';
import * as migration_20260409_131121_add_enterprise_fields from './20260409_131121_add_enterprise_fields';
import * as migration_20260409_132044_add_pricing_seo_fields from './20260409_132044_add_pricing_seo_fields';

export const migrations = [
  {
    up: migration_20260409_085938_baseline.up,
    down: migration_20260409_085938_baseline.down,
    name: '20260409_085938_baseline',
  },
  {
    up: migration_20260409_124730_add_pricing_global.up,
    down: migration_20260409_124730_add_pricing_global.down,
    name: '20260409_124730_add_pricing_global',
  },
  {
    up: migration_20260409_131121_add_enterprise_fields.up,
    down: migration_20260409_131121_add_enterprise_fields.down,
    name: '20260409_131121_add_enterprise_fields',
  },
  {
    up: migration_20260409_132044_add_pricing_seo_fields.up,
    down: migration_20260409_132044_add_pricing_seo_fields.down,
    name: '20260409_132044_add_pricing_seo_fields'
  },
];
