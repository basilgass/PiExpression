import { ShutingYard } from "./shutingyard"
import { ShutingyardMode, ShutingyardType, tokenConstant } from "./types"

export class NumExp {
    private _rpn: { token: string, tokenType: ShutingyardType }[] | null
    private _expression: string
    private _isValid: boolean | undefined

    constructor(value: string, uniformize?: boolean) {
        this._expression = value
        try {
            this._rpn = new ShutingYard(ShutingyardMode.NUMERIC)
                .parse(value, uniformize)
                .rpn

        } catch {
            this._rpn = null
            this._isValid = false
            throw new Error(`There was a problem parsing: ${value}`)
        }
    }

    get rpn(): { token: string; tokenType: string }[] {
        return this._rpn ?? []
    }

    get isValid(): boolean {
        if (this._isValid === undefined) {
            // Check if the expression is valid
            try {
                this.evaluate({ x: 2 })
            } catch (e: unknown) {
                if (e instanceof Error) {
                    // console.log(e.message)
                }
                this._isValid = false
            }
        }
        return this._isValid ?? false
    }

    set isValid(value: boolean) {
        this._isValid = value
    }

    get expression(): string {
        return this._expression
    }

    evaluate(values?: Record<string, number>): number {
        const stack: number[] = []

        if (this._rpn === null) {
            this._isValid = false
            return 0
        }

        this._isValid = true

        for (const element of this._rpn) {
            if (element.tokenType === ShutingyardType.COEFFICIENT) {
                // May be a numeric value or a Fraction.
                if (!isNaN(+element.token)) {
                    stack.push(+element.token)
                } else {
                    // It's a Fraction: a/b
                    const fraction = element.token.split('/')
                    if (fraction.length !== 2) {
                        this._isValid = false
                        throw new Error('This coefficient is not a fraction')
                    }
                    stack.push(+fraction[0] / +fraction[1])
                    // stack.push( new Fraction(element.token).value)
                }
            } else if (element.tokenType === ShutingyardType.VARIABLE && values !== undefined) {
                if (Object.hasOwn(values, element.token)) {
                    stack.push(+values[element.token])
                }
            } else if (element.tokenType === ShutingyardType.CONSTANT) {
                stack.push(tokenConstant[element.token])
            } else if (element.tokenType === ShutingyardType.OPERATION) {
                if (element.token === '*') {
                    const b = stack.pop(),
                        a = stack.pop()
                    if (a === undefined || b === undefined) {
                        this._isValid = false
                        throw new Error(`The multiplication factors ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a * b)
                } else if (element.token === '/') {
                    const b = stack.pop(),
                        a = stack.pop()
                    if (a === undefined || b === undefined) {
                        this._isValid = false
                        throw new Error(`The division values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a / b)
                } else if (element.token === '+') {
                    const b = stack.pop(),
                        a = stack.pop()
                    if (a === undefined || b === undefined) {
                        this._isValid = false
                        throw new Error(`The addition values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push((+a) + (+b))
                } else if (element.token === '-') {
                    const b = stack.pop(),
                        a = stack.pop() ?? 0
                    if (b === undefined) {
                        this._isValid = false
                        throw new Error(`The subtraction value b is  not defined`)
                    }
                    stack.push(a - b)
                } else if (element.token === '^') {
                    const b = stack.pop(),
                        a = stack.pop()
                    if (a === undefined || b === undefined) {
                        this._isValid = false
                        throw new Error(`The base value ${a ?? 'a'} or exponent ${b ?? 'b'} are not defined`)
                    }
                    stack.push(Math.pow(a, b))
                }
            } else if (element.tokenType === ShutingyardType.FUNCTION) {
                const a = stack.pop()
                if (a === undefined) {
                    this._isValid = false
                    throw new Error(`The parameters for ${element.token} is not defined`)
                }
                if (element.token === 'sin') {
                    stack.push(Math.sin(a))
                } else if (element.token === 'cos') {
                    stack.push(Math.cos(a))
                } else if (element.token === 'tan') {
                    stack.push(Math.tan(a))
                } else if (element.token === 'sqrt') {
                    stack.push(Math.sqrt(a))
                } else if (element.token === 'nthrt') {
                    const b = stack.pop()

                    if (b === undefined) {
                        this._isValid = false
                        throw new Error(`The nthrt function requires two parameters`)
                    }
                    if (a % 2 === 0 && b < 0) {
                        stack.push(NaN)
                    } else {
                        stack.push((b < 0 ? -1 : 1) * Math.pow(Math.abs(b), 1 / a))
                    }
                } else if (element.token === 'ln') {
                    stack.push(Math.log(a))
                } else if (element.token === 'log') {
                    stack.push(Math.log10(a))
                }
            }
        }

        if (stack.length === 1) {
            return this._numberCorrection(stack[0])
        } else {
            throw new Error(`There was a problem parsing: ${this._expression}`)
        }
    }

    private _numberCorrection(value: number, number_of_digits = 8): number {
        return +value.toFixed(number_of_digits)
    }
}
