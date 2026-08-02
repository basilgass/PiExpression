import { describe, expect, it } from "vitest"
import { EvaluationError, NumExp } from "../src"

/**
 * Exhaustive evaluation-error tests (Étape 4).
 *
 * Every operator and function has a stack-underflow branch in `evaluate`
 * (operands missing) and there is a final "stack did not reduce to one value"
 * branch. These were the uncovered branches dragging numexp.ts down to ~70%.
 * Each expression below parses fine but is structurally short, so it must throw
 * an {@link EvaluationError} at evaluation time — never crash, never return a
 * wrong number silently.
 */

describe('Exhaustive evaluate errors — operator underflow (Étape 4)', () => {
    // A lone operator: nothing on the stack to consume -> EvaluationError.
    const lonely = ['*', '/', '+', '-', '%', '^'] as const

    it.each(lonely)('a lone "%s" throws EvaluationError', (op) => {
        expect(() => new NumExp(op).evaluate()).toThrow(EvaluationError)
    })
})

describe('Exhaustive evaluate errors — function underflow (Étape 4)', () => {
    it('a unary function with no argument throws', () => {
        // sin() parses to the single token [sin]; popping its argument underflows.
        expect(() => new NumExp('sin()').evaluate()).toThrow(EvaluationError)
    })

    it('nthrt with a single argument throws (needs two)', () => {
        expect(() => new NumExp('nthrt(5)').evaluate()).toThrow(/two parameters/)
    })

    it('logn with a single argument throws (needs two)', () => {
        expect(() => new NumExp('logn(5)').evaluate()).toThrow(/two parameters/)
    })
})

describe('Exhaustive evaluate errors — leftover stack (Étape 4)', () => {
    it('throws when the RPN does not reduce to exactly one value', () => {
        // nthrt has arity 2; passing three arguments leaves an extra value on
        // the stack after evaluation -> the final guard fires.
        expect(() => new NumExp('nthrt(3,2,3)').evaluate()).toThrow(EvaluationError)
    })
})

describe('Exhaustive evaluate errors — the structural guard agrees (Étape 4)', () => {
    // isValid must reject exactly the expressions evaluate refuses to run, so a
    // caller can pre-check without a try/catch.
    it.each(['*', '/', '+', '-', '%', '^', 'sin()', 'nthrt(5)', 'nthrt(3,2,3)'])(
        '"%s" is reported structurally invalid',
        (expr) => {
            expect(new NumExp(expr).isValid()).toBe(false)
        },
    )
})
