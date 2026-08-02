import { ShutingYard } from "./shutingyard"
import { EvaluationError, ParseError, VariableError } from "./errors"
import { ShutingyardMode, ShutingyardType, tokenConstant } from "./piexpression.types"

export class NumExp {
    private _rpn: { token: string, tokenType: ShutingyardType }[] | null
    private _expression: string

    constructor(value: string, uniformize?: boolean) {
        this._expression = value
        try {
            this._rpn = new ShutingYard(ShutingyardMode.NUMERIC)
                .parse(value, uniformize)
                .rpn

        } catch (e) {
            this._rpn = null
            // Preserve the underlying ParseError as the cause instead of
            // swallowing it in a console.warn and rethrowing a bare Error.
            throw new ParseError(`There was a problem parsing: ${value}`, { cause: e })
        }
    }

    get rpn(): { token: string; tokenType: string }[] {
        return this._rpn ?? []
    }

    get expression(): string {
        return this._expression
    }

    /**
     * The free variables of the expression, in order of first appearance and
     * deduplicated. Constants (pi, e) are not variables. Determined purely from
     * the RPN, without evaluating.
     */
    get variables(): string[] {
        const seen = new Set<string>()
        for (const element of this._rpn ?? []) {
            if (element.tokenType === ShutingyardType.VARIABLE) {
                seen.add(element.token)
            }
        }
        return [...seen]
    }

    /**
     * Pure predicate — no evaluation, no side effect. Returns true iff the
     * expression is structurally well-formed (its RPN reduces to exactly one
     * value) AND every free variable is covered by `values`. Works for any
     * variable name, unlike the former heuristic that probed at `x = 2`.
     *
     * Coverage semantics (not exact match):
     * - No variables: `values` is optional. `isValid()` and `isValid({})` both
     *   return true for a well-formed expression (e.g. `3+5`).
     * - Extra values are tolerated: only the free variables are checked, so
     *   `new NumExp('3x+2y').isValid({ x, y, z })` is true — the unused `z` is
     *   ignored, exactly as it would be by {@link evaluate}.
     * - A missing value makes it false: `new NumExp('3x+2y').isValid({ x })` is
     *   false because `y` is not provided.
     *
     * Consequently `isValid(values) === true` guarantees that
     * `evaluate(values)` will not throw a {@link VariableError}.
     *
     * @param values Values for the free variables. Extra keys are ignored;
     *   may be omitted or `{}` when the expression has no variable.
     */
    isValid(values?: Record<string, number>): boolean {
        if (!this._isStructurallyValid()) {
            return false
        }
        return this.variables.every(name =>
            values !== undefined && Object.hasOwn(values, name)
        )
    }

    /**
     * Simulates the stack effect of the RPN using operator/function arities,
     * without needing any variable value. The expression is well-formed when no
     * step underflows the stack and exactly one value remains at the end.
     */
    private _isStructurallyValid(): boolean {
        if (this._rpn === null) { return false }

        let depth = 0
        for (const element of this._rpn) {
            switch (element.tokenType) {
                case ShutingyardType.COEFFICIENT:
                case ShutingyardType.VARIABLE:
                case ShutingyardType.CONSTANT:
                    depth += 1
                    break
                case ShutingyardType.OPERATION:
                    if (depth < 2) { return false }
                    depth -= 1
                    break
                case ShutingyardType.FUNCTION: {
                    const arity = element.token === 'nthrt' || element.token === 'logn' ? 2 : 1
                    if (depth < arity) { return false }
                    depth += 1 - arity
                    break
                }
                default:
                    // MONOM or anything the evaluator cannot handle.
                    return false
            }
        }
        return depth === 1
    }

    evaluate(values?: Record<string, number>): number {
        const stack: number[] = []

        if (this._rpn === null) {
            throw new EvaluationError(`There is no RPN to evaluate for: ${this._expression}`)
        }

        for (const element of this._rpn) {
            if (element.tokenType === ShutingyardType.COEFFICIENT) {
                // May be a numeric value or a Fraction.
                if (!isNaN(+element.token)) {
                    stack.push(+element.token)
                } else {
                    // It's a Fraction: a/b
                    const fraction = element.token.split('/')
                    if (fraction.length !== 2) {
                        throw new EvaluationError('This coefficient is not a fraction')
                    }
                    stack.push(+fraction[0] / +fraction[1])
                    // stack.push( new Fraction(element.token).value)
                }
            } else if (element.tokenType === ShutingyardType.VARIABLE) {
                // Fail fast: a missing value is a precise, catchable error rather
                // than a silently short stack surfacing as a misleading message.
                if (values === undefined || !Object.hasOwn(values, element.token)) {
                    throw new VariableError(`Missing value for variable "${element.token}"`)
                }
                stack.push(values[element.token])
            } else if (element.tokenType === ShutingyardType.CONSTANT) {
                stack.push(tokenConstant[element.token])
            } else if (element.tokenType === ShutingyardType.OPERATION) {
                if (element.token === '*') {
                    const b = stack.pop()
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The multiplication factors ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a * b)
                } else if (element.token === '/') {
                    const b = stack.pop()
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The division values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a / b)
                } else if (element.token === '+') {
                    const b = stack.pop()
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The addition values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a + b)
                } else if (element.token === '-') {
                    const b = stack.pop()
                    const a = stack.pop() ?? 0
                    if (b === undefined) {
                        throw new EvaluationError(`The subtraction value b is  not defined`)
                    }
                    stack.push(a - b)
                } else if (element.token === '%') {
                    const b = stack.pop()
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The modulo values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
                    }
                    stack.push(a % b)
                } else if (element.token === '^') {
                    const b = stack.pop()
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The base value ${a ?? 'a'} or exponent ${b ?? 'b'} are not defined`)
                    }
                    stack.push(Math.pow(a, b))
                }
            } else if (element.tokenType === ShutingyardType.FUNCTION) {
                const a = stack.pop()
                if (a === undefined) {
                    throw new EvaluationError(`The parameters for ${element.token} is not defined`)
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
                        throw new EvaluationError(`The nthrt function requires two parameters`)
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
                } else if (element.token === 'logn') {
                    // logn(x, n) = log base n of x = ln(x) / ln(n)
                    // a is the base n (last argument), b is the argument x.
                    const b = stack.pop()

                    if (b === undefined) {
                        throw new EvaluationError(`The logn function requires two parameters`)
                    }
                    // Base must be > 0 and != 1, argument must be > 0.
                    if (a <= 0 || a === 1 || b <= 0) {
                        stack.push(NaN)
                    } else {
                        stack.push(Math.log(b) / Math.log(a))
                    }
                }
            }
        }

        if (stack.length === 1) {
            return this._numberCorrection(stack[0])
        } else {
            throw new EvaluationError(`There was a problem parsing: ${this._expression}`)
        }
    }

    private _numberCorrection(value: number, number_of_digits = 8): number {
        return +value.toFixed(number_of_digits)
    }
}
