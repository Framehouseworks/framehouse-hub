export const lexicalToText = (node: any): string => {
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
