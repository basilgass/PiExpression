export type tokenType = Record<string, {
    precedence: number,
    associative: string,
    type: ShutingyardType
}>;

export const tokenConstant: Record<string, number> = {
    pi: Math.PI,
    e: Math.exp(1)
}

export enum ShutingyardType {
    VARIABLE = 'variable',
    COEFFICIENT = 'coefficient',
    OPERATION = 'operation',
    CONSTANT = 'constant',
    FUNCTION = 'function',
    FUNCTION_ARGUMENT = 'function-argument',
    MONOM = 'monom',
    LEFT_PARENTHESIS = "(",
    RIGHT_PARENTHESIS = ")"
}

export enum ShutingyardMode {
    EXPRESSION = 'expression',
    POLYNOM = 'polynom',
    SET = 'set',
    NUMERIC = 'numeric'
}

export interface Token { token: string, tokenType: ShutingyardType }
