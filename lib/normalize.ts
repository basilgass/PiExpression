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

    const numericRegExp = new RegExp(`^\\d+`)


    // Reading the string from left to right.
    // We will add the multiplication sign if needed.
    let normalizedExpr = "",
        prevTokenType: ShutingyardType|undefined,
        crtTokenType: ShutingyardType|undefined,
        crtToken: string|undefined

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
            if(fnRegExp.exec(expr)) {
                const token = fnToken.find(token => expr.startsWith(token))
                if(token) {
                    // Set the token
                    crtToken = token + '('

                    // Remove the token from the expression
                    expr = expr.slice(token.length + 1)
                    
                    // Set the token type
                    crtTokenType = ShutingyardType.FUNCTION
                    
                }
            }else  if(kRegExp.exec(expr)) {
                // Check if we have a constant token.
                const token = kToken.find(token => expr.startsWith(token))
                if(token) {
                    // Set the token
                    crtToken = token

                    // Remove the token from the expression
                    expr = expr.slice(token.length)

                    // Set the token type
                    crtTokenType = ShutingyardType.CONSTANT
                }
            } else if (numericRegExp.exec(expr)){
                // Match a number
                const token = numericRegExp.exec(expr)
                if(token) {
                    // Set the token
                    crtToken = token[0]

                    // Remove the token from the expression
                    expr = expr.slice(token[0].length)

                    // Set the token type
                    crtTokenType = ShutingyardType.COEFFICIENT
                }
            }else{
                // Get the first character of the expression
                crtToken = expr[0]

                // Remove the token from the expression
                expr = expr.slice(1)

                // Set the token type
                switch(crtToken) {
                    case '(':
                        crtTokenType = ShutingyardType.LEFT_PARENTHESIS
                        break
                    case ')':
                        crtTokenType = ShutingyardType.RIGHT_PARENTHESIS
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

            if(crtToken === undefined || crtTokenType === undefined) {
                throw new Error('The token is undefined')
            }

            // Add the multiplication sign if needed.
            normalizedExpr += addMultiplicationSign(prevTokenType, crtTokenType)
            // Add the current token to the normalized expression
            normalizedExpr += crtToken
        }

        return normalizedExpr
}

function addMultiplicationSign(prevTokenType: ShutingyardType|undefined, crtTokenType: ShutingyardType): string {
    if (prevTokenType === undefined) { return '' }

    // Determine the cas where we do not need to add the multiplication sign
    if(prevTokenType===ShutingyardType.OPERATION){ return ""}
    if(crtTokenType===ShutingyardType.OPERATION){ return ""}
    if(prevTokenType===ShutingyardType.LEFT_PARENTHESIS){ return ""}
    if(prevTokenType===ShutingyardType.FUNCTION){ return ""}

    if(crtTokenType===ShutingyardType.RIGHT_PARENTHESIS){ return ""}

    return "*"
}



    // let normalizedExpr = "",
    //     i = 0,
    //     crtToken,
    //     nextToken

    // while (i < expr.length - 1) {
    //     crtToken = undefined
    //     nextToken = undefined
    //     // Check if we have a function token.
    //     // The function MUST have an open parentheses
    //     let tokenIdx = 0
    //     while (tokenIdx < fnToken.length) {
    //         const token = fnToken[tokenIdx]
    //         if (expr.slice(i, i + token.length + 1) === token + '(') {
    //             normalizedExpr += token + '('
    //             i += token.length + 1

    //             // Restart the scan for the function token
    //             tokenIdx = 0
    //         } else {
    //             // scan for a next function token
    //             tokenIdx++
    //         }
    //     }

    //     // Check for a constant
    //     tokenIdx = 0
    //     while (tokenIdx < kToken.length) {
    //         const token = kToken[tokenIdx]
    //         if (expr.slice(i, i + token.length) === token) {
    //             // We have found a constant.
    //             // add it, but with remove the last letter
    //             normalizedExpr += token
    //             i += token.length
    //             crtToken = token
    //             break
    //         }
    //         tokenIdx++
    //     }

    //     // Maybe we reached the end of the expression. Exit the loop.
    //     if (i >= expr.length) { break }

    //     if (crtToken !== undefined) {
    //         // If the next token is not + - * / ^, add the multiplication sign.
    //         if (!expr[i].match(/[+\-*/^)]/g)) {
    //             normalizedExpr += '*'
    //         }
    //         // continue
    //     }


    //     // The function token are solved.
    //     crtToken = expr[i]
    //     normalizedExpr += crtToken
    //     nextToken = expr[i + 1]

    //     // Next token is undefined. Exit the loop.
    //     if (!nextToken) { break }

    //     // Depending on the crtToken and the next token, we might need to add a multiplication sign.
    //     if (crtToken.match(/[a-zA-Z]/g)) {
    //         // Current element is a letter.
    //         // if the next element is a letter, a number or an opening parentheses, add the multiplication sign.
    //         if (/[a-zA-Z\d(]/.exec(nextToken)) {
    //             normalizedExpr += '*'
    //         }
    //     } else if (/\d/.exec(crtToken)) {
    //         // Current element is a number.
    //         // if the next element is a letter or a parentheses, add the multiplication sign.
    //         if (/[a-zA-Z(]/.exec(nextToken)) {
    //             normalizedExpr += '*'
    //         }
    //     } else if (crtToken === ')') {
    //         // Current element is a closing parentheses.
    //         // if the next element is a letter, a number or an opening parentheses, add the multiplication sign
    //         if (/[a-zA-Z\d(]/.exec(nextToken)) {
    //             normalizedExpr += '*'
    //         }
    //     }

    //     // Go to next token
    //     i++
    // }
    

    // add the last token
    // return normalizedExpr + (nextToken === undefined ? '' : nextToken)