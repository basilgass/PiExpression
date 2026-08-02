import { describe, expect, it } from "vitest"
import { NumExp, ShutingyardType } from "../src"
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
