import { ShutingyardType } from "../piexpression.types"

export const TokenConfigDefault = {
    '^': { precedence: 4, associative: 'right', type: ShutingyardType.OPERATION },
    '*': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '/': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '+': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
    '-': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
}