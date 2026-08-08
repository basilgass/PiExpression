import { normalize } from "./normalize"
import { ParseError } from "./errors"
import { TokenConfigDefault } from "./TokenConfig/TokenConfigDefault"
import { TokenConfigExpression } from "./TokenConfig/TokenConfigExpression"
import { TokenConfigNumeric } from "./TokenConfig/TokenConfigNumeric"
import { TokenConfigSet } from "./TokenConfig/TokenConfigSet"
import { ShutingyardMode, ShutingyardType, type Token, tokenConstant, type tokenType } from "./piexpression.types"

/** Result of scanning one token: the token text, the cursor position right
 * after it, and its type. A named object (rather than a positional tuple) so
 * callers read fields by name and the shape can grow without breaking them. */
export interface NextTokenResult {
    token: string
    nextPos: number
    type: ShutingyardType
}

export class ShutingYard {
    readonly #mode: ShutingyardMode
    #rpn: Token[] = []
    #tokenConfig: tokenType = {}
    #tokenKeys: string[] = []
    #uniformize: boolean | undefined

    constructor(mode?: ShutingyardMode) {
        this.#mode = typeof mode === 'undefined' ? ShutingyardMode.POLYNOM : mode
        this.tokenConfigInitialization()
    }

    // Getter
    get rpn() {
        return this.#rpn
    }

    get rpnToken() {
        return this.#rpn.map(x => x.token)
    }


    tokenConfigInitialization(): tokenType {
        if (this.#mode === ShutingyardMode.SET) {
            this.#tokenConfig = TokenConfigSet
            this.#uniformize = false
        } else if (this.#mode === ShutingyardMode.NUMERIC) {
            this.#tokenConfig = TokenConfigNumeric
            this.#uniformize = true
        } else if (this.#mode === ShutingyardMode.EXPRESSION) {
            this.#tokenConfig = TokenConfigExpression
            this.#uniformize = true
        } else {
            this.#tokenConfig = TokenConfigDefault
            this.#uniformize = true
        }

        this.#tokenKeys = Object.keys(this.#tokenConfig).sort((a, b) => b.length - a.length)
        return this.#tokenConfig
    }

    /**
     * Get the next token to analyse.
     * @param expr (string) Expression to analyse
     * @param start (number) CUrrent position in the expr string.
     */
    NextToken(expr: string, start: number): NextTokenResult {
        let token: string; let tokenType: ShutingyardType | undefined
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
            for (const key of this.#tokenKeys) {
                if (expr.substring(start, start + key.length) === key) {
                    token += key
                    tokenType = this.#tokenConfig[key].type
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
                    // Unidentifiable character: fail fast rather than emit a
                    // MONOM token the evaluator cannot handle (silent dead-end).
                    throw new ParseError(`Unknown token "${expr[start]}" at position ${start} in "${expr}"`)
                }
            }
        }

        if (tokenType === undefined) {
            throw new ParseError(`Token type is undefined for token ${token}`)
        }
        return { token, nextPos: start + token.length, type: tokenType }
    }

    /**
     * Parse an expression using the shutting yard tree algorithms
     * @param expr (string) Expression to analyse
     * Returns a RPN list of items.
     * @param uniformize
     */
    parse(expr: string, uniformize?: boolean): this {
        const outQueue: { token: string, tokenType: ShutingyardType }[] = []    // Output queue
        const opStack: { token: string, tokenType: ShutingyardType }[] = []     // Operation queue

        let tokenPos = 0

        // Normalize the input if required.
        if (uniformize ?? this.#uniformize) {
            expr = normalize(expr, this.#tokenConfig)
        }

        while (tokenPos < expr.length) {
            // Safety invariant: every iteration MUST consume at least one
            // character. NextToken returns start + token.length, so a zero-length
            // token would stall the parser. Rather than an arbitrary iteration
            // cap (which silently truncated long expressions), we detect the lack
            // of progress and fail explicitly.
            const previousPos = tokenPos

            // Get the next token and the corresponding new (ending) position.
            const { token, nextPos, type: tokenType } = this.NextToken(expr, tokenPos)
            tokenPos = nextPos

            if (tokenPos <= previousPos) {
                throw new ParseError(`Parser stalled at position ${previousPos} in "${expr}"`)
            }

            switch (tokenType) {
                case ShutingyardType.COEFFICIENT:
                case ShutingyardType.VARIABLE:
                case ShutingyardType.CONSTANT:
                    outQueue.push({
                        token,
                        tokenType
                    })
                    break
                case ShutingyardType.OPERATION:
                    // Unary +/- at the very start of the expression ("-3", "-x",
                    // "-(3)"): there is no left operand, so inject a 0 and turn it
                    // into a binary subtraction — the same trick as the "(-x" case
                    // in LEFT_PARENTHESIS below. Keeps the RPN well-formed so
                    // _isStructurallyValid accepts it, instead of relying on
                    // evaluate()'s `?? 0` fallback.
                    if (outQueue.length === 0 && opStack.length === 0 && (token === '-' || token === '+')) {
                        outQueue.push({ token: '0', tokenType: ShutingyardType.COEFFICIENT })
                    }

                    //If the token is an operator, o1, then:
                    if (opStack.length > 0) {
                        let opTop = opStack[opStack.length - 1]

                        //while there is an operator token o2, at the top of the operator stack and
                        while (opTop.token in this.#tokenConfig && (
                            //either o1 is left-associative and its precedence is less than or equal to that of o2,
                            (this.#tokenConfig[token].associative === 'left' && this.#tokenConfig[token].precedence <= this.#tokenConfig[opTop.token].precedence)
                            ||
                            //or o1 is right associative, and has precedence less than that of o2,
                            (this.#tokenConfig[token].associative === 'right' && this.#tokenConfig[token].precedence < this.#tokenConfig[opTop.token].precedence)
                        )
                        ) {
                            // The loop is bounded: each iteration pops one operator
                            // off the stack, so it terminates when the stack empties.

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
                    // Length check comes first: reading opStack[-1] on an empty
                    // stack would crash with a TypeError.
                    while (opStack.length > 0 && opStack[opStack.length - 1].token !== '(') {
                        outQueue.push((opStack.pop()) ?? { token, tokenType })
                    }
                    // A separator only makes sense inside a function's parentheses.
                    // If we emptied the stack without finding a '(', it is misplaced.
                    if (opStack.length === 0) {
                        throw new ParseError(`Misplaced argument separator ',' in "${expr}"`)
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
                    //Until the token at the top of the stack is a left parenthesis, pop operators off the stack onto the output queue.
                    // Length check first to avoid reading opStack[-1] on an empty stack.
                    while (opStack.length > 0 && opStack[opStack.length - 1].token !== '(') {
                        outQueue.push((opStack.pop()) ?? { token, tokenType })
                    }

                    // If no matching '(' was found, the parentheses are unbalanced.
                    if (opStack.length === 0) {
                        throw new ParseError(`Mismatched parentheses (unexpected ')') in "${expr}"`)
                    }

                    //Pop the left parenthesis from the stack, but not onto the output queue.
                    opStack.pop()
                    break
                case ShutingyardType.FUNCTION:
                    opStack.push({ token, tokenType })
                    break
                default:
                    // In theory, everything should be handled.
                    throw new ParseError(`Token type ${token} is not handled`)
            }

            // Output
        }

        // Any '(' still on the operator stack was never closed.
        if (opStack.some(op => op.token === '(')) {
            throw new ParseError(`Mismatched parentheses (unclosed '(') in "${expr}"`)
        }

        this.#rpn = outQueue.concat(opStack.reverse())

        return this
    }


}
