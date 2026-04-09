import { Pricing } from '@/payload-types'

/**
 * PRICING_DEFAULTS
 * 
 * Robust fallback content for the Pricing Page when the CMS is empty or unreachable.
 * Follows the "Curated Gallery" ethos with high-end, editorial descriptions.
 */
export const PRICING_DEFAULTS: Partial<Pricing> = {
  plans: [
    {
      name: "Independent",
      priceMonthly: "0",
      priceAnnual: "0",
      description: "Perfect for individual creators and solo-archivists managing a curated collection.",
      ctaText: "Start Free",
      isRecommended: false,
      summaryFeatures: [
        { feature: "1 Administrator Seat" },
        { feature: "Core Metadata Management" },
        { feature: "Search & Advanced Filtering" },
        { feature: "Public Link Sharing" },
        { feature: "Community Support" }
      ],
    },
    {
      name: "Collective",
      priceMonthly: "49",
      priceAnnual: "490",
      description: "Built for creative studios and small collectives that require shared workflows.",
      ctaText: "Join the Collective",
      isRecommended: true,
      summaryFeatures: [
        { feature: "Up to 5 User Seats" },
        { feature: "Shared Workspaces" },
        { feature: "Approval Workflows" },
        { feature: "Custom Metadata Schemas" },
        { feature: "Brand Portals (Whitelabel)" },
        { feature: "30-Day Version History" }
      ],
    },
    {
      name: "Pro Studio",
      priceMonthly: "199",
      priceAnnual: "1990",
      description: "The definitive solution for high-volume production houses and enterprise teams.",
      ctaText: "Contact Sales",
      isRecommended: false,
      summaryFeatures: [
        { feature: "Unlimited User Seats" },
        { feature: "AI Auto-Tagging & Metadata" },
        { feature: "Full Audit Logs & SAML SSO" },
        { feature: "Advanced API & Webhooks" },
        { feature: "Priority Global Support" },
        { feature: "Custom Training" }
      ],
    },
  ],
  featureCategories: [
    {
      name: "ASSET ARCHITECTURE",
      features: [
        { name: "Global Metadata Schemas", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "Bulk Metadata Editing", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "Smart Smart Collections", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "AI Auto-Tagging (Standard)", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Custom Vocabulary Lists", plan1Value: "—", plan2Value: "—", plan3Value: "Included" },
      ]
    },
    {
      name: "DISTRIBUTION & DELIVERY",
      features: [
        { name: "Global Edge CDN", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "Public Link Sharing", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "Password-Protected Portals", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Whitelabel Brand Portals", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Custom Subdomains", plan1Value: "—", plan2Value: "—", plan3Value: "Included" },
      ]
    },
    {
      name: "CO-PRODUCTION & WORKFLOW",
      features: [
        { name: "Shared Workspaces", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Approval Workflows", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Direct Adobe CC Integration", plan1Value: "—", plan2Value: "—", plan3Value: "Included" },
        { name: "Version Stacking (∞)", plan1Value: "—", plan2Value: "—", plan3Value: "Included" },
      ]
    },
    {
      name: "SECURITY & GOVERNANCE",
      features: [
        { name: "Multi-Factor Authentication", plan1Value: "Included", plan2Value: "Included", plan3Value: "Included" },
        { name: "Role-Based Access Control", plan1Value: "—", plan2Value: "Included", plan3Value: "Included" },
        { name: "Full Audit Logs", plan1Value: "—", plan2: "—", plan3Value: "Included" },
        { name: "SAML SSO Integration", plan1Value: "—", plan2Value: "—", plan3Value: "Included" },
      ]
    }
  ],
  enterpriseHeading: "Looking for a custom solution?",
  enterpriseDescription: "For high-volume production houses and enterprise teams requiring custom integrations, advanced security, and dedicated support.",
  enterpriseCtaLabel: "Contact Sales",
  metaTitle: "Pricing | Framehouse Hub",
  metaDescription: "Simple, transparent pricing for creative teams.",
}
