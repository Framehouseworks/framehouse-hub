import * as migration_20260409_085938_baseline from './20260409_085938_baseline'
import * as migration_20260409_124730_add_pricing_global from './20260409_124730_add_pricing_global'
import * as migration_20260409_131121_add_enterprise_fields from './20260409_131121_add_enterprise_fields'
import * as migration_20260409_132044_add_pricing_seo_fields from './20260409_132044_add_pricing_seo_fields'
import * as migration_20260409_223806_add_hub_pillars from './20260409_223806_add_hub_pillars'
import * as migration_20260410_084427_add_editorial_fields from './20260410_084427_add_editorial_fields'
import * as migration_20260410_130206_add_about_gallery_fields from './20260410_130206_add_about_gallery_fields'
import * as migration_20260422_223620_add_about3_block from './20260422_223620_add_about3_block'
import * as migration_20260513_201300_add_media_archival_fields from './20260513_201300_add_media_archival_fields'
import * as migration_20260514_170000_add_media_title from './20260514_170000_add_media_title'
import * as migration_20260514_202800_archival_accession_system from './20260514_202800_archival_accession_system'
import * as migration_20260514_210800_add_archival_sequence from './20260514_210800_add_archival_sequence'
import * as migration_20260514_221500_add_media_shoot_name from './20260514_221500_add_media_shoot_name'
import * as migration_20260514_230000_intelligence_and_scale from './20260514_230000_intelligence_and_scale'
import * as migration_20260518_143700_add_smart_collections_lock_relation from './20260518_143700_add_smart_collections_lock_relation'

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
    name: '20260409_132044_add_pricing_seo_fields',
  },
  {
    up: migration_20260409_223806_add_hub_pillars.up,
    down: migration_20260409_223806_add_hub_pillars.down,
    name: '20260409_223806_add_hub_pillars',
  },
  {
    up: migration_20260410_084427_add_editorial_fields.up,
    down: migration_20260410_084427_add_editorial_fields.down,
    name: '20260410_084427_add_editorial_fields',
  },
  {
    up: migration_20260410_130206_add_about_gallery_fields.up,
    down: migration_20260410_130206_add_about_gallery_fields.down,
    name: '20260410_130206_add_about_gallery_fields',
  },
  {
    up: migration_20260422_223620_add_about3_block.up,
    down: migration_20260422_223620_add_about3_block.down,
    name: '20260422_223620_add_about3_block',
  },
  {
    up: migration_20260513_201300_add_media_archival_fields.up,
    down: migration_20260513_201300_add_media_archival_fields.down,
    name: '20260513_201300_add_media_archival_fields',
  },
  {
    up: migration_20260514_170000_add_media_title.up,
    down: migration_20260514_170000_add_media_title.down,
    name: '20260514_170000_add_media_title',
  },
  {
    up: migration_20260514_202800_archival_accession_system.up,
    down: migration_20260514_202800_archival_accession_system.down,
    name: '20260514_202800_archival_accession_system',
  },
  {
    up: migration_20260514_210800_add_archival_sequence.up,
    down: migration_20260514_210800_add_archival_sequence.down,
    name: '20260514_210800_add_archival_sequence',
  },
  {
    up: migration_20260514_221500_add_media_shoot_name.up,
    down: migration_20260514_221500_add_media_shoot_name.down,
    name: '20260514_221500_add_media_shoot_name',
  },
  {
    up: migration_20260514_230000_intelligence_and_scale.up,
    down: migration_20260514_230000_intelligence_and_scale.down,
    name: '20260514_230000_intelligence_and_scale',
  },
  {
    up: migration_20260518_143700_add_smart_collections_lock_relation.up,
    down: migration_20260518_143700_add_smart_collections_lock_relation.down,
    name: '20260518_143700_add_smart_collections_lock_relation',
  },
]
