import { describe, expect, it } from "vitest"
import { NumExp, ParseError, ShutingyardType } from "../src"
import { TokenConfigNumeric } from "../src/TokenConfig/TokenConfigNumeric"
import { FUNCTION_ARITY } from "../src/TokenConfig/tokenCatalog"

describe('Inverse trigonometric functions (Étape 3)', () => {
    it('evaluates asin', () => {
        expect(new NumExp('asin(1)').evaluate()).toBeCloseTo(Math.PI / 2, 6)
        expect(new NumExp('asin(0)').evaluate()).toBe(0)
    })

    it('evaluates acos', () => {
        expect(new NumExp('acos(1)').evaluate()).toBe(0)
        expect(new NumExp('acos(0)').evaluate()).toBeCloseTo(Math.PI / 2, 6)
    })

    it('evaluates atan', () => {
        expect(new NumExp('atan(1)').evaluate()).toBeCloseTo(Math.PI / 4, 6)
        expect(new NumExp('atan(0)').evaluate()).toBe(0)
    })

    it('returns NaN for asin/acos out of domain', () => {
        expect(new NumExp('asin(2)').evaluate()).toBeNaN()
        expect(new NumExp('acos(2)').evaluate()).toBeNaN()
    })
})

describe('Bare function name without parentheses (Étape 3, C6)', () => {
    it('throws ParseError for a function name not followed by "("', () => {
        expect(() => new NumExp('3*sin')).toThrow(ParseError)
    })

    it('throws for a function immediately followed by a variable', () => {
        expect(() => new NumExp('sinx')).toThrow(ParseError)
    })

    it('still accepts a proper function call', () => {
        expect(new NumExp('sin(0)').evaluate()).toBe(0)
    })

    it('still auto-wraps a bare numeric argument', () => {
        expect(+new NumExp('2sqrt2').evaluate().toFixed(3)).toEqual(2.828)
    })

    it('does not mistake a longer function name for a shorter one (logn vs log)', () => {
        expect(new NumExp('logn(8,2)').evaluate()).toEqual(3)
    })
})

describe('Config/evaluator consistency — functions (Étape 3 guard)', () => {
    // Mirrors the operator guard: any FUNCTION declared in the numeric config
    // must be handled by the evaluator, so a token can never be parseable yet
    // silently unevaluable.
    it('evaluates every function declared in the numeric config', () => {
        const functions = Object.entries(TokenConfigNumeric)
            .filter(([, cfg]) => cfg.type === ShutingyardType.FUNCTION)
            .map(([token]) => token)

        expect(functions.length).toBeGreaterThan(0)
        for (const fn of functions) {
            const args = (FUNCTION_ARITY[fn] ?? 1) === 2 ? '2,3' : '2'
            const result = new NumExp(`${fn}(${args})`).evaluate()
            expect(
                Number.isNaN(result) || Number.isFinite(result),
                `function "${fn}" -> ${result}`,
            ).toBe(true)
        }
    })
})
