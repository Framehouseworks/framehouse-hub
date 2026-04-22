interface LexicalNode {
    root?: LexicalNode
    text?: string
    children?: LexicalNode[]
    [key: string]: unknown
}

export const lexicalToText = (node: LexicalNode | null | undefined): string => {
    if (!node) return ''

    // If it's the root object
    if (node.root) {
        return lexicalToText(node.root)
    }

    // If it's a text node
    if (node.text) {
        return node.text
    }

    // If it has children
    if (node.children && Array.isArray(node.children)) {
        return node.children.map(lexicalToText).join('')
    }

    return ''
}
