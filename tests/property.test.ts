import { describe, expect, it } from "vitest"
import { NumExp } from "../src"

/**
 * Property / fuzz tests (Étape 4).
 *
 * Instead of hand-picking cases, we generate hundreds of random expressions and
 * assert invariants. A deterministic PRNG (seeded) makes any failure
 * reproducible rather than a heisenbug.
 *
 * Property A — parse+evaluate agrees with JavaScript's own evaluation on
 *   expressions built from the operators JS shares with the module (+ - * /,
 *   parentheses). This pins precedence, associativity and nesting.
 * Property B — implicit multiplication (`3x`, `2(...)`) is value-preserving:
 *   dropping the `*` never changes the result.
 */

// --- Deterministic PRNG (mulberry32) ---------------------------------------
function mulberry32(seed: number): () => number {
    let a = seed
    return () => {
        a |= 0
        a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// --- Random expression generator -------------------------------------------
// Renders two strings from the same AST: `module` (may drop '*' for implicit
// multiplication) and `oracle` (always explicit, JS-evaluable).
interface Rendered {
    module: string
    oracle: string
}

function makeGenerator(rand: () => number) {
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))

    function factor(depth: number): Rendered {
        // At depth 0 only leaves, to bound the size.
        const roll = depth <= 0 ? int(0, 1) : int(0, 3)
        if (roll === 0) {
            const n = String(int(1, 9))
            return { module: n, oracle: n }
        }
        if (roll === 1) {
            return { module: 'x', oracle: 'x' }
        }
        // Parenthesised sub-expression.
        const inner = expr(depth - 1)
        return { module: `(${inner.module})`, oracle: `(${inner.oracle})` }
    }

    function term(depth: number): Rendered {
        let left = factor(depth)
        const count = int(0, 2)
        for (let i = 0; i < count; i++) {
            // Divide only by a nonzero literal to stay finite and match JS.
            if (rand() < 0.5) {
                const d = String(int(1, 9))
                left = { module: `${left.module}/${d}`, oracle: `${left.oracle}/${d}` }
                continue
            }
            const right = factor(depth)
            // Implicit multiplication is only legal (and unambiguous) when the
            // left side ends in a digit or ')' and the right starts with 'x' or
            // '('. Otherwise fall back to an explicit '*'.
            const leftEnds = left.module[left.module.length - 1]
            const rightStarts = right.module[0]
            const implicitOk =
                (/[0-9)]/.test(leftEnds)) && (rightStarts === 'x' || rightStarts === '(')
            const sep = implicitOk && rand() < 0.5 ? '' : '*'
            left = { module: `${left.module}${sep}${right.module}`, oracle: `${left.oracle}*${right.oracle}` }
        }
        return left
    }

    function expr(depth: number): Rendered {
        let left = term(depth)
        const count = int(0, 2)
        for (let i = 0; i < count; i++) {
            const op = rand() < 0.5 ? '+' : '-'
            const right = term(depth)
            left = { module: `${left.module}${op}${right.module}`, oracle: `${left.oracle}${op}${right.oracle}` }
        }
        return left
    }

    return () => expr(3)
}

const round8 = (v: number): number => +v.toFixed(8)

describe('Property A — evaluate agrees with JavaScript (Étape 4)', () => {
    it('matches a native JS evaluation on 400 random expressions', () => {
        const rand = mulberry32(0x50D1CE)
        const gen = makeGenerator(rand)

        for (let i = 0; i < 400; i++) {
            const { module, oracle } = gen()
            const xValue = 1 + Math.floor(rand() * 9) // 1..9, never 0

            // Oracle: let JS evaluate the explicit-operator form. The Function
            // constructor is the whole point here — an independent evaluator to
            // check ours against — so the implied-eval rule is waived locally.
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const jsFn = new Function('x', `return (${oracle})`) as (x: number) => number
            const expected = round8(jsFn(xValue))

            let actual: number
            try {
                actual = round8(new NumExp(module).evaluate({ x: xValue }))
            } catch (e) {
                throw new Error(`evaluate threw on "${module}" (oracle "${oracle}", x=${xValue})`, { cause: e })
            }

            expect(actual, `expr "${module}" (oracle "${oracle}", x=${xValue})`).toBe(expected)
        }
    })
})

describe('Property B — implicit multiplication is value-preserving (Étape 4)', () => {
    it('module string equals its explicit-* form on 400 random expressions', () => {
        const rand = mulberry32(0xC0FFEE)
        const gen = makeGenerator(rand)

        for (let i = 0; i < 400; i++) {
            const { module, oracle } = gen()
            const xValue = 1 + Math.floor(rand() * 9)

            // `oracle` is the same AST with every '*' explicit. Both must agree.
            const implicit = round8(new NumExp(module).evaluate({ x: xValue }))
            const explicit = round8(new NumExp(oracle).evaluate({ x: xValue }))

            expect(implicit, `"${module}" vs explicit "${oracle}" (x=${xValue})`).toBe(explicit)
        }
    })
})
