import { normalize } from "./normalize"
import { TokenConfigDefault } from "./TokenConfig/TokenConfigDefault"
import { TokenConfigExpression } from "./TokenConfig/TokenConfigExpression"
import { TokenConfigNumeric } from "./TokenConfig/TokenConfigNumeric"
import { TokenConfigSet } from "./TokenConfig/TokenConfigSet"
import { ShutingyardMode, ShutingyardType, type Token, tokenConstant, type tokenType } from "./piexpression.types"

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
        if (uniformize ?? this.#uniformize) {
            expr = normalize(expr, this.#tokenConfig)
        }

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
                        while (opTop.token in this.#tokenConfig && (
                            //either o1 is left-associative and its precedence is less than or equal to that of o2,
                            (this.#tokenConfig[token].associative === 'left' && this.#tokenConfig[token].precedence <= this.#tokenConfig[opTop.token].precedence)
                            ||
                            //or o1 is right associative, and has precedence less than that of o2,
                            (this.#tokenConfig[token].associative === 'right' && this.#tokenConfig[token].precedence < this.#tokenConfig[opTop.token].precedence)
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

        this.#rpn = outQueue.concat(opStack.reverse())

        return this
    }


}
