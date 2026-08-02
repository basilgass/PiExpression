/**
 * Error hierarchy for PiExpression.
 *
 * All errors thrown by the module derive from {@link PiExpressionError}, so a
 * caller can catch every module-specific failure with a single `instanceof`
 * check while still discriminating the precise cause when needed.
 */
export class PiExpressionError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = new.target.name
    }
}

/** Raised when an expression cannot be parsed into a valid RPN. */
export class ParseError extends PiExpressionError {}

/** Raised when a structurally valid RPN cannot be evaluated. */
export class EvaluationError extends PiExpressionError {}

/** Raised when evaluating an expression whose variable has no provided value. */
export class VariableError extends EvaluationError {}

/** Raised when an operation is mathematically undefined for its inputs. */
export class DomainError extends PiExpressionError {}
