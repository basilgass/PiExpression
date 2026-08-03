import { ShutingyardType, type tokenType } from "../piexpression.types";
export declare const CATALOG: {
    '^': {
        precedence: number;
        associative: "right";
        type: ShutingyardType.OPERATION;
    };
    '*': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '/': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '+': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '-': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '%': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '&': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '|': {
        precedence: number;
        associative: "left";
        type: ShutingyardType.OPERATION;
    };
    '!': {
        precedence: number;
        associative: "right";
        type: ShutingyardType.OPERATION;
    };
    sin: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    cos: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    tan: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    asin: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    acos: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    atan: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    sqrt: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    nthrt: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    ln: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    log: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
    logn: {
        precedence: number;
        associative: "right";
        type: ShutingyardType.FUNCTION;
        arity: number;
    };
};
export declare function pick(...keys: (keyof typeof CATALOG)[]): tokenType;
export declare const FUNCTION_ARITY: Record<string, number>;
//# sourceMappingURL=tokenCatalog.d.ts.map