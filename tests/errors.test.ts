import { describe, expect, it } from "vitest"
import {
    EvaluationError,
    NumExp,
    ParseError,
    PiExpressionError,
    ShutingYard,
    ShutingyardMode,
} from "../src"

describe('Typed errors — hierarchy (Étape 2)', () => {
    it('exposes a common base class for all module errors', () => {
        expect(new ParseError('x')).toBeInstanceOf(PiExpressionError)
        expect(new EvaluationError('x')).toBeInstanceOf(PiExpressionError)
        // The base class is itself an Error, so existing `catch (e: Error)`
        // callers keep working.
        expect(new PiExpressionError('x')).toBeInstanceOf(Error)
    })
})

describe('Typed errors — ParseError (Étape 2)', () => {
    it('throws ParseError on an unclosed parenthesis', () => {
        let caught: unknown
        try {
            new ShutingYard(ShutingyardMode.NUMERIC).parse('(3+2')
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(ParseError)
    })

    it('throws ParseError on an unexpected closing parenthesis', () => {
        let caught: unknown
        try {
            new ShutingYard(ShutingyardMode.EXPRESSION).parse(')3')
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(ParseError)
    })

    it('throws ParseError on a misplaced argument separator', () => {
        let caught: unknown
        try {
            new ShutingYard(ShutingyardMode.EXPRESSION).parse(',3')
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(ParseError)
    })
})

describe('Typed errors — NumExp construction (Étape 2)', () => {
    it('wraps a parse failure and keeps the original cause', () => {
        let caught: unknown
        try {
            new NumExp('(3+2')
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(PiExpressionError)
        // The underlying ParseError must be preserved, not swallowed by a bare
        // `console.warn` + generic rethrow.
        expect((caught as Error).cause).toBeInstanceOf(ParseError)
    })
})

describe('Typed errors — EvaluationError (Étape 2)', () => {
    it('throws EvaluationError when an operand is missing at evaluation', () => {
        // Parses fine, but evaluating without a value for `x` leaves the stack
        // short: an evaluation-time failure, not a parse-time one.
        let caught: unknown
        try {
            new NumExp('x+1').evaluate()
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(EvaluationError)
    })
})

describe('Typed errors — unknown token (Étape 3, ex-MONOM)', () => {
    it('throws ParseError on an unidentifiable character', () => {
        // '@' is neither an operator, a function, a constant, a digit nor a
        // letter: it must fail fast at parse time, not produce a dead-end token.
        let caught: unknown
        try {
            new ShutingYard(ShutingyardMode.NUMERIC).parse('@', false)
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(ParseError)
    })

    it('surfaces the unknown token through NumExp construction', () => {
        expect(() => new NumExp('3@')).toThrow(ParseError)
    })
})
