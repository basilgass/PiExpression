export type tokenType = Record<string, {
    precedence: number;
    associative: string;
    type: ShutingyardType;
}>;
export declare const tokenConstant: Record<string, number>;
export declare enum ShutingyardType {
    VARIABLE = "variable",
    COEFFICIENT = "coefficient",
    OPERATION = "operation",
    CONSTANT = "constant",
    FUNCTION = "function",
    FUNCTION_ARGUMENT = "function-argument",
    MONOM = "monom",
    LEFT_PARENTHESIS = "(",
    RIGHT_PARENTHESIS = ")"
}
export declare enum ShutingyardMode {
    EXPRESSION = "expression",
    POLYNOM = "polynom",
    SET = "set",
    NUMERIC = "numeric"
}
export interface Token {
    token: string;
    tokenType: ShutingyardType;
}
