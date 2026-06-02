import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

export const AdminActivityLogs: CollectionConfig = {
  slug: 'admin-activity-logs',
  admin: {
    group: 'Admin Oversight',
    useAsTitle: 'actionDescription',
    defaultColumns: ['adminUser', 'targetUser', 'actionType', 'actionDescription', 'createdAt'],
    description: 'Immutable audit trail of all administrative actions on creative accounts.',
  },
  access: {
    create: () => true, // server-side hooks only — runtime guard via overrideAccess
    read: adminOnly,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    {
      name: 'adminUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'The admin who performed the action.',
      },
    },
    {
      name: 'targetUser',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        description: 'The creative account that was acted upon.',
      },
    },
    {
      name: 'targetPortfolio',
      type: 'relationship',
      relationTo: 'portfolios',
      index: true,
      admin: {
        description: 'If the action targeted a specific portfolio.',
      },
    },
    {
      name: 'actionType',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Inspect Account', value: 'inspect_account' },
        { label: 'Launch Diagnostic Session', value: 'launch_diagnostic' },
        { label: 'Terminate Diagnostic Session', value: 'terminate_diagnostic' },
        { label: 'Diagnostic Session Expired', value: 'diagnostic_expired' },
        { label: 'Portfolio Password Reset', value: 'portfolio_password_reset' },
        { label: 'Portfolio Visibility Changed', value: 'portfolio_visibility_change' },
        { label: 'Field Override', value: 'field_override' },
        { label: 'Account Role Change', value: 'account_role_change' },
      ],
    },
    {
      name: 'actionDescription',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable summary of the action.',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Structured context for the action (field changes, session IDs, etc.).',
      },
    },
    {
      name: 'diagnosticSession',
      type: 'relationship',
      relationTo: 'admin-diagnostic-sessions',
      admin: {
        description: 'Link to the diagnostic session this action belongs to, if any.',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        description: 'Client IP address at time of action.',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'Browser user agent at time of action.',
      },
    },
  ],
}
