import { ShutingyardType, tokenConstant, tokenType } from "./types"


export function normalize(expr: string, tokenConfig: tokenType): string {
    // If the expression is already normalized, return it.
    if (expr.length <= 1) { return expr }

    // Get the list of function token.
    const fnToken: string[] = Object.keys(tokenConfig)
        .filter(key => tokenConfig[key].type === ShutingyardType.FUNCTION)
        .map(key => key)
    // sort if from the lengthy to the smallest function
    fnToken.sort((a, b) => b.length - a.length)
    const fnRegExp = new RegExp(`^(${fnToken.join('|')})\\(`)

    // Get the list of constant token.
    const kToken: string[] = Object.keys(tokenConstant)
    // sort if from the lengthy to the smallest function
    kToken.sort((a, b) => b.length - a.length)
    const kRegExp = new RegExp(`^(${kToken.join('|')})`)

    // Numeric regular expression. Detect a number with or without decimal point.
    const numericRegExp = /^(\d+(\.\d+)?)/


    // Reading the string from left to right.
    // We will add the multiplication sign if needed.
    let normalizedExpr = "",
        prevTokenType: ShutingyardType | undefined,
        crtTokenType: ShutingyardType | undefined,
        crtToken: string | undefined

    while (expr.length > 0) {
        // Determine the current token. It can be:
        // - a number
        // - a function
        // - a constant
        // - a variable
        // - an operation
        // - a parentheses
        prevTokenType = crtTokenType
        crtToken = undefined

        // Check if we have a function token.
        // The function MUST have an open parentheses
        if (fnToken.length > 0 && fnRegExp.exec(expr)) {
            const token = fnToken.find(token => expr.startsWith(token))
            if (token) {
                // Set the token
                crtToken = token + '('

                // Remove the token from the expression
                expr = expr.slice(token.length + 1)

                // Set the token type
                crtTokenType = ShutingyardType.FUNCTION

            }
        } else if (kToken.length > 0 && kRegExp.exec(expr)) {
            // Check if we have a constant token.
            const token = kToken.find(token => expr.startsWith(token))
            if (token) {
                // Set the token
                crtToken = token

                // Remove the token from the expression
                expr = expr.slice(token.length)

                // Set the token type
                crtTokenType = ShutingyardType.CONSTANT
            }
        } else if (numericRegExp.exec(expr)) {
            // Match a number
            const token = numericRegExp.exec(expr)
            if (token) {
                // Set the token
                crtToken = token[0]

                // Remove the token from the expression
                expr = expr.slice(token[0].length)

                // Set the token type
                crtTokenType = ShutingyardType.COEFFICIENT
            }
        } else {
            // Get the first character of the expression
            crtToken = expr[0]

            // Remove the token from the expression
            expr = expr.slice(1)

            // Set the token type
            switch (crtToken) {
                case '(':
                    crtTokenType = ShutingyardType.LEFT_PARENTHESIS
                    break
                case ')':
                    crtTokenType = ShutingyardType.RIGHT_PARENTHESIS
                    break
                case ',':
                    crtTokenType = ShutingyardType.FUNCTION_ARGUMENT
                    break
                case '+':
                case '-':
                case '*':
                case '/':
                case '^':
                    crtTokenType = ShutingyardType.OPERATION
                    break
                default:
                    crtTokenType = ShutingyardType.VARIABLE
            }
        }

        if (crtToken === undefined || crtTokenType === undefined) {
            throw new Error('The token is undefined')
        }

        // Add the multiplication sign if needed.
        normalizedExpr += addMultiplicationSign(prevTokenType, crtTokenType)
        // Add the current token to the normalized expression
        normalizedExpr += crtToken
    }

    return normalizedExpr
}

function addMultiplicationSign(prevTokenType: ShutingyardType | undefined, crtTokenType: ShutingyardType): string {
    if (prevTokenType === undefined) { return '' }

    // Determine the cas where we do not need to add the multiplication sign
    if (prevTokenType === ShutingyardType.OPERATION) { return "" }
    if (crtTokenType === ShutingyardType.OPERATION) { return "" }
    if (prevTokenType === ShutingyardType.LEFT_PARENTHESIS) { return "" }
    if (prevTokenType === ShutingyardType.FUNCTION) { return "" }
    if (prevTokenType === ShutingyardType.FUNCTION_ARGUMENT) { return "" }

    if (crtTokenType === ShutingyardType.RIGHT_PARENTHESIS) { return "" }
    if (crtTokenType === ShutingyardType.FUNCTION_ARGUMENT) { return "" }

    return "*"
}