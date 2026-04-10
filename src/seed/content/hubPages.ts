export const aboutPageData = {
  title: 'About us',
  slug: 'about',
  _status: 'published',
  isProtected: true,
  hero: {
    type: 'highImpact',
    media: null as any, // Injected during seed
    richText: {
      root: {
        type: 'root',
        children: [
          {
            type: 'heading',
            tag: 'h1',
            version: 1,
            children: [{ text: 'WE ARCHITECT THE FRAMEWORKS OF TOMORROW.', type: 'text', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    },
  },
  layout: [
    {
      blockType: 'about3',
      title: 'WE ARCHITECT THE FRAMEWORKS OF TOMORROW.',
      description: 'To help the world’s most successful brands manage, transform, and deliver engaging visual experiences at scale.',
      mainImage: null as any,
      secondaryImage: null as any,
      breakout: {
        title: 'Hundreds of visual components at Framehouse Hub',
        description: 'Providing businesses with effective tools to improve workflows, boost efficiency, and encourage growth.',
        buttonText: 'Join the Revolution',
        buttonUrl: '/pricing',
      },
      companies: [
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
      ],
      achievementsTitle: 'Impact in Numbers',
      achievementsDescription: 'Our platform processes millions of assets daily with clinical precision.',
      achievements: [
        { label: 'Asset Capacity', value: '30PB+' },
        { label: 'Global Creators', value: '45K+' },
        { label: 'Uptime Precision', value: '99.9%' },
        { label: 'Media Transcoded', value: '1.2B+' },
      ],
      contentSections: [
        {
          title: 'THE VISION',
          content: 'We envision a world where every visual asset is accessible, optimized, and ready for high-prestige delivery. Our platform bridges the gap between massive technical complexity and editorial elegance.',
        },
        {
          title: 'THE DNA',
          content: 'Founded in 2026, Framehouse Hub was born from a simple realization: the digital world is cluttered, but your brand’s assets shouldn’t be. We built the museum-grade solution we needed.',
        },
      ],
    },
    {
      blockType: 'sprocketDivider',
      backgroundColor: 'white',
      speed: 'slow',
    },
    {
      blockType: 'content',
      layoutStyle: 'asymmetric',
      backgroundColor: 'surface_low',
      columns: [
        {
          size: 'oneThird',
          media: null as any, // Injected during seed
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [{ text: 'THE VISION', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
        {
          size: 'twoThirds',
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'We envision a world where every visual asset is accessible, optimized, and ready for high-prestige delivery. Our platform bridges the gap between massive technical complexity and editorial elegance.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
      ],
    },
    {
      blockType: 'sprocketDivider',
      backgroundColor: 'surface_low',
      speed: 'medium',
    },
    {
      blockType: 'threeItemGrid',
      style: 'pillars',
      backgroundColor: 'white',
      items: [
        {
          title: 'Precision AI',
          description: 'Using advanced patented image and video processing to deliver flawless visual experiences.',
          media: null as any,
        },
        {
          title: 'Hybrid Scale',
          description: 'Reimagining the solutions needed to solve today’s visual media management challenges.',
          media: null as any,
        },
        {
          title: 'Editorial DNA',
          description: 'Passionate, collaborative, and hard working people spans the globe but constantly connected.',
          media: null as any,
        },
      ],
    },
    {
      blockType: 'sprocketDivider',
      backgroundColor: 'white',
      speed: 'fast',
    },
    {
      blockType: 'content',
      layoutStyle: 'asymmetric',
      backgroundColor: 'surface_low',
      columns: [
        {
          size: 'oneThird',
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [{ text: 'OUR CUSTOMERS', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
        {
          size: 'twoThirds',
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: "The world's most popular brands run on Framehouse Hub. We empower them to manage and deliver their core visual identity with clinical precision.",
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
      ],
    },
    {
      blockType: 'carousel',
      style: 'logoWall',
      populateBy: 'collection',
    },
  ],
  meta: {
    title: 'About Us | Framehouse Hub',
    description: 'The mission and architecture behind Framehouse Hub.',
  },
}

export const hubPageData = {
  title: 'Hub',
  slug: 'hub',
  _status: 'published',
  isProtected: true,
  hero: {
    type: 'highImpact',
    media: null as any, // Injected during seed
    richText: {
      root: {
        type: 'root',
        children: [
          {
            type: 'heading',
            tag: 'h1',
            version: 1,
            children: [
              {
                text: 'THE CENTRAL OS FOR CREATIVE ASSETS.',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    },
  },
  layout: [
    {
      blockType: 'threeItemGrid',
      style: 'pillars',
      items: [
        {
          title: 'Admin Studio',
          description: 'A powerful, headless command center for your entire digital ecosystem. Effortless asset management at scale.',
          media: null as any, // Injected during seed
        },
        {
          title: 'Portfolio Generator',
          description: 'Transform raw data into high-prestige clinical portfolios. Tailored for precision and editorial impact.',
          media: null as any, // Injected during seed
        },
        {
          title: 'Global Delivery',
          description: 'Lightning-fast delivery of your curated assets to any endpoint, anywhere in the world.',
          media: null as any, // Injected during seed
        },
      ],
    },
  ],
  meta: {
    title: 'The Hub | Platform Architecture',
    description: 'A breakdown of the core pillars that power the Framehouse Hub.',
  },
}
