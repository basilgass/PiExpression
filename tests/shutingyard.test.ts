import { describe, expect, it } from "vitest"
import { ShutingYard } from "../lib"
import { ShutingyardMode } from "../lib/types"

describe('Shuting yard', () => { // the tests container
    it('RPN for polynom', () => {
        const SY0: ShutingYard = new ShutingYard().parse('3+x+5')
        expect(SY0.rpn.map(x => x.token)).to.have.all.members(['3', 'x', '+', '5', '+'])

        const SY1: ShutingYard = new ShutingYard().parse('3x+5')
        expect(SY1.rpn.map(x => x.token)).to.have.all.members(['3', 'x', '*', '5', '+'])

        const SY2: ShutingYard = new ShutingYard().parse('3.2x+5')
        expect(SY2.rpn.map(x => x.token)).to.have.all.members(['3.2', 'x', '*', '5', '+'])

        const SY3: ShutingYard = new ShutingYard().parse('3/2x+5')
        expect(SY3.rpn.map(x => x.token)).to.have.all.members(['3', '2', '/', 'x', '*', '5', '+'])

        const SY4: ShutingYard = new ShutingYard().parse('3/2x^2-5xy-12')
        expect(SY4.rpn.map(x => x.token)).to.have.all.members(['3', '2', '/', 'x', '2', '^', '*', '5', 'x', '*', 'y', '*', '-', '12', '-'])

        const SY3b: ShutingYard = new ShutingYard().parse('3/2(x+5)')
        expect(SY3b.rpn.map(x => x.token)).to.have.all.members(['3', '2', '/', 'x', '5', '+', '*'])

        const SY5: ShutingYard = new ShutingYard().parse('3/2x^(-3)-5xy-12')
        expect(SY5.rpn.map(x => x.token)).to.have.all.members(['3', '2', '/', 'x', '0', '3', '-', '^', '*', '5', 'x', '*', 'y', '*', '-', '12', '-'])

        const SY6: ShutingYard = new ShutingYard().parse('x^3y^2z')
        expect(SY6.rpn.map(x => x.token)).to.have.all.members(['x', '3', '^', 'y', '2', '^', '*', 'z', '*'])
    })

    it('RPN for multi variable polynom', () => {
        const SY: ShutingYard = new ShutingYard().parse('ax+by+c')
        expect(SY.rpn.map(x => x.token)).to.have.all.members(["a", "x", "*", "b", "y", "*", "+", "c", "+"])
    })

    it('Custom RPN', () => {
        const SY1: ShutingYard = new ShutingYard(ShutingyardMode.SET).parse('(A|B)&C')
        const SY2: ShutingYard = new ShutingYard(ShutingyardMode.SET).parse('(A-B)&!C')
        expect(SY1.rpn.map(x => x.token)).to.have.all.members(['A', 'B', '|', 'C', '&'])
        expect(SY2.rpn.map(x => x.token)).to.have.all.members(['A', 'B', '-', 'C', '!', '&'])
    })

    it('Should detect function arguments', () => {
        const expr = "nthrt(3,2)"
        const SY = new ShutingYard(ShutingyardMode.EXPRESSION).parse(expr)
        expect(SY.rpn.map(x => x.token)).to.have.all.members(['3', '2', 'nthrt'])
    })
})
