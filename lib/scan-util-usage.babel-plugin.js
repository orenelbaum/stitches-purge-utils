// Scans a style object without without the "variants" and the "compoundVariants" fields
const scanLevel2StyleProperty = (CSSPropertySet, styleProperty) => {
    const keyType = styleProperty.key.type
        if (
            !keyType === "Identifier"
            && !keyType === "StringLiteral"
        )
            return
        
        const propertyName =
            keyType === "Identifier"
                ? styleProperty.key.name
                : styleProperty.key.value

        if (propertyName[0] === "$") return

        if (['&', '@', '.'].includes(propertyName[0])) {
            if (styleProperty.value.type !== "ObjectExpression") return


            for (const property of styleProperty.value.properties) {
                const keyType = property.key.type

                if (
                    !keyType === "Identifier"
                    && !keyType === "StringLiteral"
                )
                    continue
                
                const propertyName =
                    keyType === "Identifier"
                        ? property.key.name
                        : property.key.value
                
                
                CSSPropertySet.add(propertyName)
            }

            return
        }

        CSSPropertySet.add(propertyName)
}


const scanStyleObject = (CSSPropertySet, styleObject) => {
    if (styleObject.type !== "ObjectExpression") return

    for (const property of styleObject.properties) {
        const keyType = property.key.type
        if (
            !keyType === "Identifier"
            && !keyType === "StringLiteral"
        )
            continue
        
        const propertyName =
            keyType === "Identifier"
                ? property.key.name
                : property.key.value

        if (propertyName === "variants") {
            if (property.value.type !== "ObjectExpression") continue

            for (const variantCategoryProperty of property.value.properties) {
                if (variantCategoryProperty.value.type !== "ObjectExpression") continue

                for (const variantProperty of variantCategoryProperty.value.properties) {
                    if (variantProperty.value.type !== "ObjectExpression") continue

                    for (const property of variantProperty.value.properties)
                        scanLevel2StyleProperty(CSSPropertySet, property)
                }    
            }

            continue
        }

        if (propertyName === "compoundVariants") {
            if (property.value.type !== "ArrayExpression") continue

            for (const compoundVariantObject of property.value.elements) {
                if (compoundVariantObject.type !== "ObjectExpression") continue

                const cssProperty = compoundVariantObject.properties
                    .find(property => 
                        (
                            property.key.type === "Identifier"
                            && property.key.name === "css"
                        )
                        || (
                            property.key.type === "StringLiteral"
                            && property.key.value === "css"
                        )
                    )
                
                if (cssProperty)
                    for (const property of cssProperty.value.properties)
                        scanLevel2StyleProperty(CSSPropertySet, property)
            }

            continue
        }

        if (propertyName === "defaultVariants") continue

        scanLevel2StyleProperty(CSSPropertySet, property)
    }
}


const importDeclarationVisitor = (path, { opts }) => {
    const importSource = path.node.source.value
    
    if (importSource !== opts.configuredStitchesPath) return
    
  	for (const specifier of path.node.specifiers) {
        const specifierName = specifier.imported.name

        if (specifierName === "globalCss") {
            for (const referencePath of path.scope.bindings[specifierName].referencePaths) {
                const callExpression = referencePath.parent
                if (callExpression.type !== "CallExpression") continue
    
                for (const globalCSSObject of callExpression.arguments) {
                    if (globalCSSObject.type !== "ObjectExpression") continue

                    for (const property of globalCSSObject.properties) {
                        const keyType = property.key.type
                        if (
                            !keyType === "Identifier"
                            && !keyType === "StringLiteral"
                        )
                            continue
                        
                        const propertyName =
                            keyType === "Identifier"
                                ? property.key.name
                                : property.key.value
                        
                        if (propertyName[0] === "@") {
                            if (!propertyName.startsWith("@supports ")) continue

                            if (property.value.type !== "ObjectExpression") continue
                            
                            for (selectorProperty of property.value.properties)
                                scanStyleObject(opts.CSSPropertySet, selectorProperty.value)
                            
                            continue
                        }

                        scanStyleObject(opts.CSSPropertySet, property.value)
                    }
                }
            }
        }

        if (
           specifierName !== "css"
           && specifierName !== "styled"
        )
            continue
      
        for (const referencePath of path.scope.bindings[specifierName].referencePaths) {
            const callExpression = referencePath.parent
            if (callExpression.type !== "CallExpression") continue

            for (const argument of callExpression.arguments) scanStyleObject(opts.CSSPropertySet, argument)
        }
    }
}


module.exports = function () {	
	const visitor = { ImportDeclaration: importDeclarationVisitor }

	return {
		name: "babel-plugin-stitches-purge-utils",
        visitor,
    }
}