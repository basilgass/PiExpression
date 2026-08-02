import { describe, expect, it } from "vitest"
import { NumExp } from "../src"

describe('Numerical expression', () => { // the tests container
    it('RPN for constant expression', ()=>{
        const RPN = new NumExp('3').rpn
        expect(RPN.map(x => x.token)).to.deep.equal(['3'])
    })
    it('RPN for polynomial expression', () => {
        const RPN = new NumExp('3*x+5').rpn
        expect(RPN.map(x => x.token)).to.deep.equal(['3', 'x', '*', '5', '+'])

        const RPN2 = new NumExp('-3*x^2-5').rpn
        expect(RPN2.map(x => x.token)).to.deep.equal(['3', 'x', '2', '^', '*', '-', '5', '-'])
    })

    it('Evaluate for numerical expression', () => {
        const expr = new NumExp('3*x+5')
        expect(expr.evaluate({ x: 5 })).toEqual(20)

        const expr2 = new NumExp('-3*x^2-5')
        expect(expr2.evaluate({ x: -2 })).toEqual(-17)
    })

    it('Evaluation simple mathematical functions', () => {
        const expr = new NumExp('sqrt(x)')
        expect(expr.evaluate({ x: 9 })).toEqual(3)
    })

    it('should detect invalid rpn parsing', function () {
        const exprValid = new NumExp('3*sin(x)'),
            exprInvalid = new NumExp('3*sin')

        expect(exprValid.isValid).toBeTruthy()
        expect(exprInvalid.isValid).toBeFalsy()
    })

    it('souled detect invalid expression without crashing', function () {
        const failedExpression = new NumExp('3xsi'),
            correctExpression = new NumExp('3xsin(x)')

        expect(failedExpression.isValid).toBeFalsy()
        expect(correctExpression.isValid).toBeTruthy()
    })

    it('should parse without multiplication sign', function () {
        const expr = new NumExp('3x-5', true)
        expect(expr.isValid).toBeTruthy()
        expect(expr.evaluate({ x: 2 })).toEqual(1)

        const expr2 = new NumExp('3*x-5', true)
        expect(expr2.isValid).toBeTruthy()
        expect(expr2.evaluate({ x: 2 })).toEqual(1)
    })

    it('should calculate sqrt from exp', function () {
        const k = new NumExp('nthrt(x,3)')
        expect(k.evaluate({ x: -8 })).toEqual(-2)
        expect(k.evaluate({ x: 27 })).toEqual(3)

        const p = new NumExp('nthrt(x,4)')
        expect(p.evaluate({ x: 16 })).toEqual(2)
        expect(p.evaluate({ x: -16 })).toBeNaN()
    })

    it('should work with constant', function () {
        const k = new NumExp('2pix')

        expect(+k.evaluate({ x: 1 })
            .toFixed(6))
            .toEqual(6.283185)
    })

    it('should work with trivial constant but without variables', function () {

        const k = new NumExp('2')
        expect(+k.evaluate().toFixed(6))
            .toEqual(2)
    })
    it('should work with constant but without variables', function () {

        const k = new NumExp('2*pi')
        expect(+k.evaluate().toFixed(6))
            .toEqual(6.283185)
    })

    it('should parse with ln or log', function () {
        const k = new NumExp('ln(3)')
        expect(+k.evaluate().toFixed(6)).toEqual(1.098612)
    })

    it('should parse with logn (logarithm in base n)', () => {
        // logn(x, n) = log base n of x
        const a = new NumExp('logn(8,2)')
        expect(a.evaluate()).toEqual(3)

        const b = new NumExp('logn(1000,10)')
        expect(b.evaluate()).toEqual(3)

        // Should behave like log10 when base is 10
        const c = new NumExp('logn(x,10)')
        expect(c.evaluate({ x: 100 })).toEqual(2)

        // Should behave like ln when base is e
        const d = new NumExp('logn(e,e)')
        expect(d.evaluate()).toEqual(1)
    })

    it('should return NaN for logn out of domain', () => {
        // Base must be > 0 and != 1 (negative base passed through a variable,
        // as a negative literal after a comma is not supported by the parser).
        expect(new NumExp('logn(8,1)').evaluate()).toBeNaN()
        expect(new NumExp('logn(8,0)').evaluate()).toBeNaN()
        expect(new NumExp('logn(8,n)').evaluate({ n: -2 })).toBeNaN()
        // Argument must be > 0
        expect(new NumExp('logn(0,2)').evaluate()).toBeNaN()
        expect(new NumExp('logn(x,2)').evaluate({ x: -8 })).toBeNaN()
    })

    it('should parse with sqrt and root', () => {
        const expr1 = new NumExp('sqrt(9)')
        expect(expr1.evaluate()).toEqual(3)

        const expr2 = new NumExp('nthrt(8,3)')
        expect(expr2.evaluate()).toEqual(2)
    })

    it('should parse with sqrt without parenthses', ()=>{
        const a = new NumExp('2sqrt(2)')
        expect(+a.evaluate().toFixed(3)).toEqual(2.828)
        const b = new NumExp('2sqrt2')
        expect(+b.evaluate().toFixed(3)).toEqual(2.828)
        const c = new NumExp('2sqrt2.5')
        expect(+c.evaluate().toFixed(3)).toEqual(3.162)

    })
})
