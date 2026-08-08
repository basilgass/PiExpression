import { ShutingYard } from "./shutingyard"
import { EvaluationError, ParseError, VariableError } from "./errors"
import { FUNCTION_ARITY } from "./TokenConfig/tokenCatalog"
import { ShutingyardMode, ShutingyardType, type Token, tokenConstant } from "./piexpression.types"

/**
 * A numeric expression: parses a string into RPN at construction and evaluates
 * it against variable values.
 *
 * Conventions and limitations (deliberate — see analyse-src.md §C5):
 * - **Out-of-domain results are not thrown, they are values.** Division by zero
 *   yields `Infinity`, `0/0`, `sqrt(-1)`, `asin(2)`, `logn(8, 1)`… yield `NaN`.
 *   This is the module-wide convention; {@link DomainError} is reserved for a
 *   future opt-in strict mode and is not raised today.
 * - **Missing variable values are thrown** ({@link VariableError}), unlike
 *   out-of-domain values — a missing input is a caller error, `NaN` is a result.
 * - **Results are rounded to 8 decimal places** (see `_numberCorrection`), which
 *   also absorbs floating-point noise but loses precision on very large numbers.
 * - **Variables are single characters**: a multi-letter run is an implicit
 *   product (`ab` → `a*b`). `e` is always Euler's constant, never a variable.
 * - **Function names require parentheses**: `sin(x)` is valid, a bare `sin` (or
 *   `sinx`) raises a {@link ParseError}.
 */
export class NumExp {
    // Never null: the constructor either assigns a valid RPN or throws, so any
    // NumExp that exists has been fully parsed. This lets evaluate/variables
    // iterate _rpn without a null guard.
    private readonly _rpn: Token[]
    private readonly _expression: string

    constructor(value: string, uniformize?: boolean) {
        this._expression = value
        try {
            this._rpn = new ShutingYard(ShutingyardMode.NUMERIC)
                .parse(value, uniformize)
                .rpn

        } catch (e) {
            // Preserve the underlying ParseError as the cause instead of
            // swallowing it in a console.warn and rethrowing a bare Error.
            // Throwing here means no partially-built NumExp is ever returned.
            throw new ParseError(`There was a problem parsing: ${value}`, { cause: e })
        }
    }

    get rpn(): Token[] {
        return this._rpn
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
        for (const element of this._rpn) {
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
                    // Arity sourced from the token catalog — single source of
                    // truth shared with the parser (and the evaluator).
                    const arity = FUNCTION_ARITY[element.token] ?? 1
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

        for (const element of this._rpn) {
            if (element.tokenType === ShutingyardType.COEFFICIENT) {
                // A coefficient token is always numeric: the tokenizer only ever
                // emits digits and a dot, and '/' is a separate operator (never
                // part of a coefficient). A malformed one would push NaN, which
                // propagates as a value — consistent with the module's
                // NaN-as-out-of-domain convention (see class JSDoc / C5).
                stack.push(+element.token)
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
                    const a = stack.pop()
                    if (a === undefined || b === undefined) {
                        throw new EvaluationError(`The subtraction values ${a ?? 'a'} or ${b ?? 'b'} are not defined`)
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
                } else if (element.token === 'asin') {
                    // Math.asin returns NaN outside [-1, 1].
                    stack.push(Math.asin(a))
                } else if (element.token === 'acos') {
                    // Math.acos returns NaN outside [-1, 1].
                    stack.push(Math.acos(a))
                } else if (element.token === 'atan') {
                    stack.push(Math.atan(a))
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
