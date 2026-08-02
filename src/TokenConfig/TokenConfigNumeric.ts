import { pick } from "./tokenCatalog"

// NUMERIC mode: arithmetic operators, modulo and the supported functions.
export const TokenConfigNumeric = pick(
    '^', '*', '/', '+', '-', '%',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sqrt', 'nthrt', 'ln', 'log', 'logn',
)
