import { describe, expect, it } from "vitest"
import { normalize } from "../src/normalize"
import { TokenConfigNumeric } from "../src/TokenConfig/TokenConfigNumeric"


describe('Normalize expression', () => {
    it('should normalize simple expression', () => {
        const expr = '3x+5'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*x+5')
    })

    it('should normalize expression with parentheses', () => {
        const expr = '3(x+5)'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*(x+5)')
    })

    it('should normalize expression with functions', () => {
        const expr = '3sin(x)'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*sin(x)')
    })

    it('should normalize expression with functions and parentheses', () => {
        const expr = '3sin(x+5)'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*sin(x+5)')
    })

    it('should normalize expression with number and constants', () => {
        const expr = '3pi'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*pi')
    })

    it('should normalize expression already normalized', () => {
        const expr = '3*x+5'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3*x+5')
    })

    it('should normalize complex expression', () => {
        const n1 = normalize('3x(x-5)^(2(x+7))', TokenConfigNumeric)
        expect(n1).to.be.equal("3*x*(x-5)^(2*(x+7))")

        const n2 = normalize('sin(cos(3pi-5))+sqrt(e-sin(3pi/2))', TokenConfigNumeric)
        expect(n2).to.be.equal("sin(cos(3*pi-5))+sqrt(e-sin(3*pi/2))")

        const n3 = normalize('sin(cos(3picos(3pi)-5))+sqrt(e-sin(3pi/2))', TokenConfigNumeric)
        expect(n3).to.be.equal("sin(cos(3*pi*cos(3*pi)-5))+sqrt(e-sin(3*pi/2))")
    })

    it('should normalize a function with multiple arguments', () => {
        const n1 = normalize('nthrt(3,2)', TokenConfigNumeric)
        expect(n1).to.be.equal("nthrt(3,2)")

        const n2 = normalize('nthrt(3,2,3)', TokenConfigNumeric)
        expect(n2).to.be.equal("nthrt(3,2,3)")
    })

    it('should normalize an expression with fraction', () => {
        const expr = '3/2(x+5)'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('3/2*(x+5)')
    })

    it('should normalize an expression with decimal number', () => {
        const expr = '0.5(x+5)'
        const normalized = normalize(expr, TokenConfigNumeric)

        expect(normalized).toEqual('0.5*(x+5)')
    })
})