import { describe, expect, it } from "vitest"
import { NumExp, ShutingYard, ShutingyardMode, ShutingyardType } from "../src"
import { TokenConfigNumeric } from "../src/TokenConfig/TokenConfigNumeric"

describe('Robustness — long expressions (P1)', () => {
    it('parses a long sum without silent truncation', () => {
        // 40 terms: 1+1+...+1 -> must equal 40, not a truncated value.
        const expr = Array(40).fill('1').join('+')
        expect(new NumExp(expr).evaluate()).toEqual(40)
    })

    it('parses a very long product without silent truncation', () => {
        // 60 factors of 1 -> 1
        const expr = Array(60).fill('1').join('*')
        expect(new NumExp(expr).evaluate()).toEqual(1)
    })
})

describe('Robustness — modulo operator (P4)', () => {
    it('evaluates the modulo of two integers', () => {
        expect(new NumExp('5%3').evaluate()).toEqual(2)
        expect(new NumExp('9%2').evaluate()).toEqual(1)
        expect(new NumExp('8%4').evaluate()).toEqual(0)
    })

    it('binds modulo with the same precedence as multiplication/division', () => {
        // 2 + 5%3 must be 2 + (5%3) = 4, not (2+5)%3 = 1
        expect(new NumExp('2+5%3').evaluate()).toEqual(4)
    })
})

describe('Robustness — mismatched parentheses & separators (P2/P3)', () => {
    it('throws a clear error on a closing parenthesis without an opening one', () => {
        expect(() => new ShutingYard(ShutingyardMode.EXPRESSION).parse(')3'))
            .toThrow(/parenthes/i)
    })

    it('throws a clear error on an unclosed opening parenthesis', () => {
        expect(() => new ShutingYard(ShutingyardMode.NUMERIC).parse('(3+2'))
            .toThrow(/parenthes/i)
    })

    it('throws a clear error on a misplaced argument separator', () => {
        expect(() => new ShutingYard(ShutingyardMode.EXPRESSION).parse(',3'))
            .toThrow(/separator/i)
    })

    it('does not throw a low-level TypeError on malformed input', () => {
        // Whatever happens, the error must be a meaningful parse error, never a
        // "Cannot read properties of undefined" crash.
        expect(() => new ShutingYard(ShutingyardMode.EXPRESSION).parse(')3'))
            .not.toThrow(/Cannot read properties/)
    })

    it('still parses balanced parentheses correctly', () => {
        const sy = new ShutingYard(ShutingyardMode.NUMERIC).parse('(3+2)*4')
        expect(sy.rpn.map(x => x.token)).to.deep.equal(['3', '2', '+', '4', '*'])
    })
})

describe('Robustness — whitespace (P5)', () => {
    it('ignores spaces around operators', () => {
        expect(new NumExp('3 + 5').evaluate()).toEqual(8)
    })

    it('ignores spaces inside a longer expression', () => {
        expect(new NumExp('2 * ( 3 + 4 )').evaluate()).toEqual(14)
    })

    it('ignores tabs and multiple spaces', () => {
        expect(new NumExp('7\t-  2').evaluate()).toEqual(5)
    })
})

describe('Config/evaluator consistency (P4 guard)', () => {
    // Guards against a token being declared in a TokenConfig but never handled
    // by the evaluator (the class of bug that affected '%'). If a new operator
    // is added to the numeric config, it must be evaluable here.
    it('evaluates every operator declared in the numeric config', () => {
        const operators = Object.entries(TokenConfigNumeric)
            .filter(([, cfg]) => cfg.type === ShutingyardType.OPERATION)
            .map(([token]) => token)

        expect(operators.length).toBeGreaterThan(0)
        for (const op of operators) {
            const result = new NumExp(`2${op}1`).evaluate()
            expect(Number.isFinite(result), `operator "${op}" -> ${result}`).toBe(true)
        }
    })
})
