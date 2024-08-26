import { TokenConfigDefault } from "./TokenConfig/TokenConfigDefault"
import { TokenConfigExpression } from "./TokenConfig/TokenConfigExpression"
import { TokenConfigNumeric } from "./TokenConfig/TokenConfigNumeric"
import { TokenConfigSet } from "./TokenConfig/TokenConfigSet"
import { ShutingyardMode, ShutingyardType, Token, tokenConstant, tokenType } from "./types"

export class ShutingYard {
    readonly _mode: ShutingyardMode
    private _rpn: Token[] = []
    private _tokenConfig: tokenType = {}
    private _tokenKeys: string[] = []
    private _uniformize: boolean | undefined

    constructor(mode?: ShutingyardMode) {
        this._mode = typeof mode === 'undefined' ? ShutingyardMode.POLYNOM : mode
        this.tokenConfigInitialization()
    }

    // Getter
    get rpn() {
        return this._rpn
    }

    get rpnToken() {
        return this._rpn.map(x => x.token)
    }

    /**
     * Determine if the token is a defined operation
     * Defined operations: + - * / ^ sin cos tan
     * @param token
     */
    // isOperation(token: string): boolean {
    //     if (token[0].match(/[+\-*/^]/g)) {
    //         return true;
    //     }
    //     //
    //     // if (token.match(/^sin|cos|tan/g)) {
    //     //     return true;
    //     // }
    //
    //     return false;
    // }

    tokenConfigInitialization(): tokenType {
        if (this._mode === ShutingyardMode.SET) {
            this._tokenConfig = TokenConfigSet
            this._uniformize = false
        } else if (this._mode === ShutingyardMode.NUMERIC) {
            this._tokenConfig = TokenConfigNumeric
            this._uniformize = true
        } else if (this._mode === ShutingyardMode.EXPRESSION) {
            this._tokenConfig = TokenConfigExpression
            this._uniformize = true
        } else {
            this._tokenConfig = TokenConfigDefault
            this._uniformize = true
        }

        this._tokenKeys = Object.keys(this._tokenConfig).sort((a, b) => b.length - a.length)
        return this._tokenConfig
    }

    /**
     * Get the next token to analyse.
     * @param expr (string) Expression to analyse
     * @param start (number) CUrrent position in the expr string.
     */
    NextToken(expr: string, start: number): [string, number, ShutingyardType] {
        let token: string, tokenType: ShutingyardType | undefined
        token = ''
        tokenType = undefined
        // Case of parenthesis or comma (generic items)
        if (expr[start] === '(') {
            token = '('
            tokenType = ShutingyardType.LEFT_PARENTHESIS
        }
        // It's a closing parenthesis
        else if (expr[start] === ')') {
            token = ')'
            tokenType = ShutingyardType.RIGHT_PARENTHESIS
        }
        // It's an argument separator for a function
        else if (expr[start] === ',') {
            token = ','
            tokenType = ShutingyardType.FUNCTION_ARGUMENT
        } else {
            // Extract operation and function tokens
            for (const key of this._tokenKeys) {
                if (expr.substring(start, start + key.length) === key) {
                    token += key
                    tokenType = this._tokenConfig[key].type
                    break
                }
            }

            // Extract constant
            for (const key in tokenConstant) {
                if (expr.substring(start, start + key.length) === key) {
                    token += key
                    tokenType = ShutingyardType.CONSTANT
                    break
                }
            }

            if (token === '') {
                // No function found ! Might be a coefficient !
                if (/[0-9.]/.exec(expr[start])) {
                    const match = (/^([0-9.]+)/.exec(expr.substring(start)))
                    token = match ? match[0] : ''
                    tokenType = ShutingyardType.COEFFICIENT
                } else if (/[a-zA-Z]/.exec(expr[start])) {
                    const match = (/^([a-zA-Z])/.exec(expr.substring(start)))
                    token = match ? match[0] : ''
                    tokenType = ShutingyardType.VARIABLE
                } else {
                    console.log('Unidentified token', expr[start], expr, start)
                    token = expr[start]
                    tokenType = ShutingyardType.MONOM
                }
            }
        }

        if (tokenType === undefined) {
            throw new Error(`Token type is undefined for token ${token}`)
        }
        return [token, start + token.length, tokenType]
    }

    normalize(expr: string): string {
        if (expr.length === 1) { return expr }

        // Get the list of function token.
        const fnToken: string[] = [],
            kToken: string[] = []

        for (const token in this._tokenConfig) {
            if (this._tokenConfig[token].type === ShutingyardType.FUNCTION) {
                fnToken.push(token)
            }
        }

        // sort if from the lengthy to the smallest function
        fnToken.sort((a, b) => b.length - a.length)

        for (const token in tokenConstant) {
            kToken.push(token)
        }
        // sort if from the lengthy to the smallest function
        kToken.sort((a, b) => b.length - a.length)

        let normalizedExpr = "",
            i = 0,
            crtToken,
            nextToken

        while (i < expr.length - 1) {
            crtToken = undefined
            nextToken = undefined
            // Check if we have a function token.
            // The function MUST have an open parentheses
            let tokenIdx = 0
            while (tokenIdx < fnToken.length) {
                const token = fnToken[tokenIdx]
                if (expr.slice(i, i + token.length + 1) === token + '(') {
                    normalizedExpr += token + '('
                    i += token.length + 1

                    // Restart the scan for the function token
                    tokenIdx = 0
                } else {
                    // scan for a next function token
                    tokenIdx++
                }
            }

            // Check for a constant
            tokenIdx = 0
            while (tokenIdx < kToken.length) {
                const token = kToken[tokenIdx]
                if (expr.slice(i, i + token.length) === token) {
                    // We have found a constant.
                    // add it, but with remove the last letter
                    normalizedExpr += token
                    i += token.length
                    crtToken = token
                    break
                }
                tokenIdx++
            }

            // Maybe we reached the end of the expression. Exit the loop.
            if (i >= expr.length) { break }

            if (crtToken !== undefined) {
                // If the next token is not + - * / ^, add the multiplication sign.
                if (!expr[i].match(/[+\-*/^)]/g)) {
                    normalizedExpr += '*'
                }
                // continue
            }


            // The function token are solved.
            crtToken = expr[i]
            normalizedExpr += crtToken
            nextToken = expr[i + 1]

            // Next token is undefined. Exit the loop.
            if (!nextToken) { break }

            // Depending on the crtToken and the next token, we might need to add a multiplication sign.
            if (crtToken.match(/[a-zA-Z]/g)) {
                // Current element is a letter.
                // if the next element is a letter, a number or an opening parentheses, add the multiplication sign.
                if (/[a-zA-Z\d(]/.exec(nextToken)) {
                    normalizedExpr += '*'
                }
            } else if (/\d/.exec(crtToken)) {
                // Current element is a number.
                // if the next element is a letter or a parentheses, add the multiplication sign.
                if (/[a-zA-Z(]/.exec(nextToken)) {
                    normalizedExpr += '*'
                }
            } else if (crtToken === ')') {
                // Current element is a closing parentheses.
                // if the next element is a letter, a number or an opening parentheses, add the multiplication sign
                if (/[a-zA-Z\d(]/.exec(nextToken)) {
                    normalizedExpr += '*'
                }
            }

            // Go to next token
            i++
        }

        // add the last token
        return normalizedExpr + (nextToken ?? '')
    }

    /**
     * Parse an expression using the shutting yard tree algorithms
     * @param expr (string) Expression to analyse
     * Returns a RPN list of items.
     * @param uniformize
     */
    parse(expr: string, uniformize?: boolean): this {
        const outQueue: { token: string, tokenType: ShutingyardType }[] = [],    // Output queue
            opStack: { token: string, tokenType: ShutingyardType }[] = []     // Operation queue
        let token = '',
            tokenPos = 0,
            tokenType: ShutingyardType

        // Normalize the input if required.
        if (uniformize ?? this._uniformize) { expr = this.normalize(expr) }

        const securityLoopLvl2_default = 50
        let securityLoopLvl1 = 50,
            securityLoopLvl2

        while (tokenPos < expr.length) {
            securityLoopLvl1--
            if (securityLoopLvl1 === 0) {
                console.log('SECURITY LEVEL 1 EXIT')
                break
            }

            // Get the next token and the corresponding new (ending) position
            [token, tokenPos, tokenType] = this.NextToken(expr, tokenPos)

            switch (tokenType) {
                case ShutingyardType.MONOM:
                case ShutingyardType.COEFFICIENT:
                case ShutingyardType.VARIABLE:
                case ShutingyardType.CONSTANT:
                    outQueue.push({
                        token,
                        tokenType
                    })
                    break
                case ShutingyardType.OPERATION:
                    //If the token is an operator, o1, then:
                    if (opStack.length > 0) {
                        let opTop = opStack[opStack.length - 1]

                        securityLoopLvl2 = +securityLoopLvl2_default

                        //while there is an operator token o2, at the top of the operator stack and
                        while (opTop.token in this._tokenConfig && (
                            //either o1 is left-associative and its precedence is less than or equal to that of o2,
                            (this._tokenConfig[token].associative === 'left' && this._tokenConfig[token].precedence <= this._tokenConfig[opTop.token].precedence)
                            ||
                            //or o1 is right associative, and has precedence less than that of o2,
                            (this._tokenConfig[token].associative === 'right' && this._tokenConfig[token].precedence < this._tokenConfig[opTop.token].precedence)
                        )
                        ) {

                            /* Security exit ! */
                            securityLoopLvl2--
                            if (securityLoopLvl2 === 0) {
                                console.log('SECURITY LEVEL 2 OPERATION EXIT')
                                break
                            }

                            // Add the operation to the queue
                            outQueue.push((opStack.pop()) ?? { token: '', tokenType: ShutingyardType.OPERATION })

                            // Get the next operation on top of the Stack.
                            if (opStack.length === 0) {
                                break
                            }
                            opTop = opStack[opStack.length - 1]
                        }
                    }
                    //at the end of iteration push o1 onto the operator stack
                    opStack.push({ token, tokenType })
                    break
                case ShutingyardType.FUNCTION_ARGUMENT:
                    securityLoopLvl2 = +securityLoopLvl2_default
                    while (opStack[opStack.length - 1].token !== '(' && opStack.length > 0) {
                        securityLoopLvl2--
                        if (securityLoopLvl2 === 0) {
                            console.log('SECURITY LEVEL 2 FUNCTION ARGUMENT EXIT')
                            break
                        }

                        outQueue.push((opStack.pop()) ?? { token, tokenType })
                    }
                    break
                case ShutingyardType.LEFT_PARENTHESIS:
                    opStack.push({ token, tokenType })
                    // Add an empty value if next element is negative.
                    if (expr[tokenPos] === '-') {
                        outQueue.push({ token: '0', tokenType: ShutingyardType.COEFFICIENT })
                    }
                    break
                case ShutingyardType.RIGHT_PARENTHESIS:
                    securityLoopLvl2 = +securityLoopLvl2_default
                    //Until the token at the top of the stack is a left parenthesis, pop operators off the stack onto the output queue.
                    while (opStack[opStack.length - 1].token !== '(' && opStack.length > 1 /*Maybe zero !? */) {
                        securityLoopLvl2--
                        if (securityLoopLvl2 === 0) {
                            console.log('SECURITY LEVEL 2 CLOSING PARENTHESIS EXIT')
                            break
                        }

                        outQueue.push((opStack.pop()) ?? { token, tokenType })
                    }

                    //Pop the left parenthesis from the stack, but not onto the output queue.
                    opStack.pop()
                    break
                case ShutingyardType.FUNCTION:
                    opStack.push({ token, tokenType })
                    break
                default:
                    // In theory, everything should be handled.
                    throw new Error(`Token type ${token} is not handled`)
            }

            // Output
        }

        this._rpn = outQueue.concat(opStack.reverse())

        return this
    }


}
