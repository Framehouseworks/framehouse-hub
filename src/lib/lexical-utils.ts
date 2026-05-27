interface LexicalNode {
  children?: LexicalNode[]
  text?: string
}

export function getPlainTextFromLexical(lexicalJson: unknown): string {
  try {
    if (!lexicalJson || typeof lexicalJson !== 'object') return ''
    const root = (lexicalJson as { root?: LexicalNode }).root
    const firstChild = root?.children?.[0]
    const firstTextNode = firstChild?.children?.[0]
    return firstTextNode?.text || ''
  } catch {
    return ''
  }
}

export function convertTextToLexical(text: string) {
  return {
    root: {
      type: 'root',
      format: 'left' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: 'left' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            {
              type: 'text',
              text,
              format: 0,
              style: '',
              detail: 0,
              mode: 'normal' as const,
              version: 1,
            },
          ],
        },
      ],
    },
  }
}
