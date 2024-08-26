import { ShutingyardType } from "../types"

export const TokenConfigNumeric = {
    '^': { precedence: 4, associative: 'right', type: ShutingyardType.OPERATION },
    '*': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '/': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '+': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
    '-': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
    '%': { precedence: 3, associative: 'right', type: ShutingyardType.OPERATION },
    'sin': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'cos': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'tan': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'sqrt': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'nthrt': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'ln': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },
    'log': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION },

}