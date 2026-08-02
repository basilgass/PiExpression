import { describe, expect, it } from "vitest"
import { EvaluationError, NumExp, VariableError } from "../src"

describe('NumExp.variables (Étape 2, C2)', () => {
    it('lists the free variables in order of appearance', () => {
        expect(new NumExp('a*b+c').variables).toEqual(['a', 'b', 'c'])
    })

    it('deduplicates repeated variables', () => {
        expect(new NumExp('x*x+x').variables).toEqual(['x'])
    })

    it('does not treat constants (pi, e) as variables', () => {
        expect(new NumExp('2*pi').variables).toEqual([])
    })

    it('is empty for a purely numeric expression', () => {
        expect(new NumExp('3+5').variables).toEqual([])
    })
})

describe('NumExp.isValid (Étape 2, C2 — structural + coverage)', () => {
    it('is true for a well-formed numeric expression', () => {
        expect(new NumExp('3+5').isValid()).toBe(true)
    })

    it('is false when the RPN does not reduce to one value', () => {
        expect(new NumExp('+').isValid()).toBe(false)
    })

    it('is true when every variable is covered, regardless of names', () => {
        expect(new NumExp('3sin').isValid({ s: 1, i: 2, n: 3 })).toBe(true)
    })

    it('is false when a variable is missing from the values', () => {
        expect(new NumExp('3sin').isValid({ s: 1, x: 2, n: 3 })).toBe(false)
    })

    it('does not depend on the variable being named x', () => {
        expect(new NumExp('a+1').isValid({ a: 1 })).toBe(true)
    })

    it('is false when variables are required but none are provided', () => {
        expect(new NumExp('a+1').isValid()).toBe(false)
    })

    it('is pure: calling it does not affect a later evaluate', () => {
        const e = new NumExp('a+1')
        e.isValid()
        expect(e.evaluate({ a: 4 })).toEqual(5)
    })
})

describe('NumExp.evaluate — VariableError (Étape 2)', () => {
    it('throws VariableError naming the missing variable', () => {
        let caught: unknown
        try {
            new NumExp('a+1').evaluate({ b: 2 })
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(VariableError)
        expect((caught as Error).message).toContain('a')
    })

    it('VariableError is a kind of EvaluationError', () => {
        expect(new VariableError('x')).toBeInstanceOf(EvaluationError)
    })
})
