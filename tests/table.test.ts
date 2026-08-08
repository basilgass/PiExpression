import { describe, expect, it } from "vitest"
import { NumExp } from "../src"

/**
 * Table-driven characterization tests (Étape 4).
 *
 * Each row pins down BOTH the parsed RPN (structure — the whole point of a
 * Shunting-Yard implementation) and the evaluated value (semantics). Written as
 * data so a new case is one line, and a regression names itself in the report.
 */

interface RpnCase {
    readonly expr: string
    readonly rpn: readonly string[]
    readonly note?: string
}

// input -> expected RPN token sequence (numeric mode, normalization on).
const RPN_TABLE: readonly RpnCase[] = [
    // Precedence: * / bind tighter than + -
    { expr: '2+3*4', rpn: ['2', '3', '4', '*', '+'], note: 'mul before add' },
    { expr: '2*3+4', rpn: ['2', '3', '*', '4', '+'] },
    { expr: '2+3-4', rpn: ['2', '3', '+', '4', '-'] },
    { expr: '2*3/4', rpn: ['2', '3', '*', '4', '/'] },

    // Associativity
    { expr: '2-3-4', rpn: ['2', '3', '-', '4', '-'], note: 'minus is left-assoc' },
    { expr: '2^3^2', rpn: ['2', '3', '2', '^', '^'], note: 'power is right-assoc' },

    // Parentheses override precedence
    { expr: '(2+3)*4', rpn: ['2', '3', '+', '4', '*'] },
    { expr: '2*(3+4)', rpn: ['2', '3', '4', '+', '*'] },
    { expr: '((1+2)*(3+4))', rpn: ['1', '2', '+', '3', '4', '+', '*'] },

    // Unary minus
    { expr: '-3+5', rpn: ['0', '3', '-', '5', '+'], note: 'leading minus injects a 0' },
    { expr: '(-3)', rpn: ['0', '3', '-'], note: 'minus after ( injects a 0' },

    // Implicit multiplication and powers
    { expr: '3x', rpn: ['3', 'x', '*'] },
    { expr: '2x^2', rpn: ['2', 'x', '2', '^', '*'] },
    { expr: '2(3)', rpn: ['2', '3', '*'] },

    // Fractions and constants
    { expr: '3/2', rpn: ['3', '2', '/'] },
    { expr: '2pi', rpn: ['2', 'pi', '*'] },

    // Functions
    { expr: 'sin(x)', rpn: ['x', 'sin'] },
    { expr: 'nthrt(8,3)', rpn: ['8', '3', 'nthrt'] },
]

describe('Table-driven — parse to RPN (Étape 4)', () => {
    it.each(RPN_TABLE)('$expr -> $rpn', ({ expr, rpn }) => {
        expect(new NumExp(expr).rpn.map(t => t.token)).toEqual([...rpn])
    })
})

interface EvalCase {
    readonly expr: string
    readonly values?: Record<string, number>
    readonly expected: number
    readonly note?: string
}

// input (+ variable values) -> expected numeric value.
const EVAL_TABLE: readonly EvalCase[] = [
    { expr: '2+3*4', expected: 14 },
    { expr: '2*3+4', expected: 10 },
    { expr: '2-3-4', expected: -5 },
    { expr: '2^3^2', expected: 512, note: 'right-assoc: 2^(3^2)' },
    { expr: '(2+3)*4', expected: 20 },
    { expr: '2*(3+4)', expected: 14 },
    { expr: '((1+2)*(3+4))', expected: 21 },
    { expr: '-3+5', expected: 2 },
    { expr: '(-3)', expected: -3 },
    { expr: '3x', values: { x: 5 }, expected: 15 },
    { expr: '2x^2', values: { x: 3 }, expected: 18 },
    { expr: '2(3)', expected: 6 },
    { expr: '3/2', expected: 1.5 },
    { expr: '10%3', expected: 1 },
    { expr: 'nthrt(8,3)', expected: 2 },
    { expr: 'sqrt(9)', expected: 3 },
]

describe('Table-driven — evaluate (Étape 4)', () => {
    it.each(EVAL_TABLE)('$expr -> $expected', ({ expr, values, expected }) => {
        expect(new NumExp(expr).evaluate(values)).toBeCloseTo(expected, 8)
    })
})
