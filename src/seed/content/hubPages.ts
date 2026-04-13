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
      description: 'To help the world’s most successful brands manage, transform, and deliver engaging visual experiences with clinical precision.',
      mainImage: null as any,
      secondaryImage: null as any,
      breakout: {
        title: 'Architecting 30PB+ of Visual Data',
        description: 'Providing enterprises with the high-prestige tools needed to organize, edit, and deliver the future of media.',
        buttonText: 'Join the Revolution',
        buttonUrl: '/pricing',
        logo: null as any,
      },
      companies: [
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
        { logo: null as any },
      ],
      achievementsTitle: 'Clinical Impact',
      achievementsDescription: 'Our architecture is built for extreme scale and museum-grade precision.',
      achievements: [
        { label: 'Storage Grade', value: '30PB+' },
        { label: 'Uptime Score', value: '99.9%' },
        { label: 'Media Nodes', value: '45K+' },
        { label: 'Transcoded', value: '1.2B+' },
      ],
      contentSections: [
        {
          title: 'THE ARCHITECTURE',
          content: 'Built on a globally distributed edge network, Framehouse Hub ensures your assets are always close to your audience, delivered with sub-millisecond latency.',
        },
        {
          title: 'THE PRECISION',
          content: 'Every asset is subjected to patented clinical AI optimization, ensuring visual fidelity while minimizing payload overhead across all devices.',
        },
        {
          title: 'THE SCALE',
          content: 'From boutique creative agencies to global production houses, our infrastructure scales dynamically to meet the most demanding workloads.',
        },
        {
          title: 'THE FUTURE',
          content: 'We are pioneering the integration of generative archival technologies, allowing brands to not just manage history, but create the future.',
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
      layoutStyle: 'side_by_side',
      backgroundColor: 'surface_low',
      columns: [
        {
          size: 'oneThird',
          media: 'https://picsum.photos/seed/vision/1200/800',
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
                      text: "We envision a world where every digital asset is not just stored, but curated. Our platform bridges the gap between massive technical complexity and editorial elegance, ensuring your brand's DNA is preserved with the highest fidelity.",
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
      blockType: 'content',
      layoutStyle: 'side_by_side',
      backgroundColor: 'white',
      columns: [
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
                      text: "Founded in 2026, Framehouse Hub was born from a simple realization: the digital world is cluttered, but your brand's assets shouldn't be. We encountered the same tedious management challenges every creative team faces, and we built the museum-grade solution we needed to solve them once and for all.",
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
        {
          size: 'oneThird',
          media: 'https://picsum.photos/seed/story/1200/800',
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [{ text: 'OUR STORY', type: 'text', version: 1 }],
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
      populateBy: 'selection',
      selectedDocs: [
        { relationTo: 'media', value: null as any },
        { relationTo: 'media', value: null as any },
        { relationTo: 'media', value: null as any },
        { relationTo: 'media', value: null as any },
        { relationTo: 'media', value: null as any },
        { relationTo: 'media', value: null as any },
      ],
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
