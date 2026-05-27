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
import * as migration_20260519_161500_add_media_search_gin_index from './20260519_161500_add_media_search_gin_index'
import * as migration_20260520_120000_add_storage_path_processing_step from './20260520_120000_add_storage_path_processing_step'
import * as migration_20260520_180000_fix_portfolio_media_cascade from './20260520_180000_fix_portfolio_media_cascade'
import * as migration_20260520_190000_fix_pricing_logo_cascade from './20260520_190000_fix_pricing_logo_cascade'
import * as migration_20260520_210000_relax_media_block_fks from './20260520_210000_relax_media_block_fks'
import * as migration_20260521_120000_add_media_original_filename from './20260521_120000_add_media_original_filename'
import * as migration_20260521_130000_extend_media_search_gin from './20260521_130000_extend_media_search_gin'
import * as migration_20260521_140000_add_upload_batches from './20260521_140000_add_upload_batches'
import * as migration_20260521_190000_add_waitlist from './20260521_190000_add_waitlist'
import * as migration_20260522_100000_add_media_full_search_idx from './20260522_100000_add_media_full_search_idx'
import * as migration_20260527_120000_smart_collections_v2 from './20260527_120000_smart_collections_v2'
import * as migration_20260527_160000_add_camera_make from './20260527_160000_add_camera_make'
import * as migration_20260527_210000_add_sessions_collection from './20260527_210000_add_sessions_collection'
import * as migration_20260527_240000_add_collection_generated_from_camera_date from './20260527_240000_add_collection_generated_from_camera_date'

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
  {
    up: migration_20260519_161500_add_media_search_gin_index.up,
    down: migration_20260519_161500_add_media_search_gin_index.down,
    name: '20260519_161500_add_media_search_gin_index',
  },
  {
    up: migration_20260520_120000_add_storage_path_processing_step.up,
    down: migration_20260520_120000_add_storage_path_processing_step.down,
    name: '20260520_120000_add_storage_path_processing_step',
  },
  {
    up: migration_20260520_180000_fix_portfolio_media_cascade.up,
    down: migration_20260520_180000_fix_portfolio_media_cascade.down,
    name: '20260520_180000_fix_portfolio_media_cascade',
  },
  {
    up: migration_20260520_190000_fix_pricing_logo_cascade.up,
    down: migration_20260520_190000_fix_pricing_logo_cascade.down,
    name: '20260520_190000_fix_pricing_logo_cascade',
  },
  {
    up: migration_20260520_210000_relax_media_block_fks.up,
    down: migration_20260520_210000_relax_media_block_fks.down,
    name: '20260520_210000_relax_media_block_fks',
  },
  {
    up: migration_20260521_120000_add_media_original_filename.up,
    down: migration_20260521_120000_add_media_original_filename.down,
    name: '20260521_120000_add_media_original_filename',
  },
  {
    up: migration_20260521_130000_extend_media_search_gin.up,
    down: migration_20260521_130000_extend_media_search_gin.down,
    name: '20260521_130000_extend_media_search_gin',
  },
  {
    up: migration_20260521_140000_add_upload_batches.up,
    down: migration_20260521_140000_add_upload_batches.down,
    name: '20260521_140000_add_upload_batches',
  },
  {
    up: migration_20260521_190000_add_waitlist.up,
    down: migration_20260521_190000_add_waitlist.down,
    name: '20260521_190000_add_waitlist',
  },
  {
    up: migration_20260522_100000_add_media_full_search_idx.up,
    down: migration_20260522_100000_add_media_full_search_idx.down,
    name: '20260522_100000_add_media_full_search_idx',
  },
  {
    up: migration_20260527_120000_smart_collections_v2.up,
    down: migration_20260527_120000_smart_collections_v2.down,
    name: '20260527_120000_smart_collections_v2',
  },
  {
    up: migration_20260527_160000_add_camera_make.up,
    down: migration_20260527_160000_add_camera_make.down,
    name: '20260527_160000_add_camera_make',
  },
  {
    up: migration_20260527_210000_add_sessions_collection.up,
    down: migration_20260527_210000_add_sessions_collection.down,
    name: '20260527_210000_add_sessions_collection',
  },
  {
    up: migration_20260527_240000_add_collection_generated_from_camera_date.up,
    down: migration_20260527_240000_add_collection_generated_from_camera_date.down,
    name: '20260527_240000_add_collection_generated_from_camera_date',
  },
]
