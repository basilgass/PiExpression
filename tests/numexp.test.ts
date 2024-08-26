import { describe, expect, it } from "vitest"
import { NumExp } from "../lib"

describe('Numerical expression', () => { // the tests container
    it('RPN for numerical expression', () => {
        const RPN = new NumExp('3*x+5').rpn
        expect(RPN.map(x => x.token)).to.have.all.members(['3', 'x', '*', '5', '+'])

        const RPN2 = new NumExp('-3*x^2-5').rpn
        expect(RPN2.map(x => x.token)).to.have.all.members(['3', 'x', '2', '^', '*', '-', '5', '-'])
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

    it('should work with constant but without variables', function () {

        const k = new NumExp('2*pi')
        expect(+k.evaluate().toFixed(6))
            .toEqual(6.283185)
    })

    it('should parse with ln or log', function () {
        const k = new NumExp('ln(3)')
        expect(+k.evaluate().toFixed(6)).toEqual(1.098612)
    })

    it('should parse with sqrt and root', () => {
        const expr1 = new NumExp('sqrt(9)')
        expect(expr1.evaluate()).toEqual(3)

        const expr2 = new NumExp('nthrt(8,3)')
        expect(expr2.evaluate()).toEqual(2)
    })
})
