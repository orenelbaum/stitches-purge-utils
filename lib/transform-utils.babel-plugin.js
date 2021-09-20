const exportNamedDeclarationVisitor = (path, { opts }) => {
    const { CSSPropertySet } = opts

    const exportDeclaration = path.node.declaration
    if (!exportDeclaration) return
    if (!exportDeclaration.declarations) return
    for (declarator of exportDeclaration.declarations) {
        if (declarator.id.type !== "Identifier") continue
        if (declarator.id.name !== "utilList") continue
        if (!declarator.init) continue
        if (declarator.init.type !== "ObjectExpression") continue

        const properties = declarator.init.properties
        declarator.init.properties = properties.filter(property => CSSPropertySet.has(property.key.name))
    }
}

module.exports = () => ({
    visitor: { ExportNamedDeclaration: exportNamedDeclarationVisitor }
})
