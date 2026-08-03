export declare class PiExpressionError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare class ParseError extends PiExpressionError {
}
export declare class EvaluationError extends PiExpressionError {
}
export declare class VariableError extends EvaluationError {
}
export declare class DomainError extends PiExpressionError {
}
//# sourceMappingURL=errors.d.ts.map