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
            children: [
              {
                text: 'WE ARCHITECT THE FRAMEWORKS OF TOMORROW.',
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
      blockType: 'content',
      style: 'mission',
      backgroundColor: 'surface_low',
      columns: [
        {
          size: 'full',
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'To help the world’s most successful brands manage, transform, and deliver engaging visual experiences at scale.',
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
      layoutStyle: 'asymmetric',
      backgroundColor: 'white',
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
                      text: 'Founded in 2026, Framehouse Hub was born from a simple realization: the digital world is cluttered, but your brand’s assets shouldn’t be. We encountered the same tedious management challenges every creative team faces, and we built the museum-grade solution we needed.',
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
      blockType: 'threeItemGrid',
      style: 'pillars',
      backgroundColor: 'surface_low',
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
      blockType: 'content',
      layoutStyle: 'asymmetric',
      backgroundColor: 'white',
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
                      text: "The world's most popular brands run on Framehouse Hub.",
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
    {
      blockType: 'content',
      layoutStyle: 'asymmetric',
      backgroundColor: 'white',
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
                  children: [{ text: 'OUR PARTNERS', type: 'text', version: 1 }],
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
                      text: 'Partnering with Framehouse means business. We bridge the gap between technical complexity and creative excellence.',
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
