import { ShutingyardType, type tokenType } from "../piexpression.types"

/**
 * Single source of truth for every token the parser knows about, across all
 * modes. A token is defined exactly once here; each mode's config is then a
 * plain selection of keys via {@link pick}. This keeps every mode's supported
 * set explicit and greppable while making precedence/associativity divergences
 * between modes structurally impossible.
 */
interface TokenDefinition {
    precedence: number
    associative: 'left' | 'right'
    type: ShutingyardType
    /** Number of operands a FUNCTION consumes (e.g. sin = 1, nthrt = 2). */
    arity?: number
}

export const CATALOG = {
    // Arithmetic operators
    '^': { precedence: 4, associative: 'right', type: ShutingyardType.OPERATION },
    '*': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '/': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '+': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
    '-': { precedence: 2, associative: 'left', type: ShutingyardType.OPERATION },
    '%': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    // Set-algebra operators
    '&': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '|': { precedence: 3, associative: 'left', type: ShutingyardType.OPERATION },
    '!': { precedence: 4, associative: 'right', type: ShutingyardType.OPERATION },
    // Functions
    'sin': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'cos': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'tan': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'asin': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'acos': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'atan': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'sqrt': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'nthrt': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 2 },
    'ln': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'log': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 1 },
    'logn': { precedence: 4, associative: 'right', type: ShutingyardType.FUNCTION, arity: 2 },
} satisfies Record<string, TokenDefinition>

/** Builds a mode config from an explicit, complete list of catalog keys. */
export function pick(...keys: (keyof typeof CATALOG)[]): tokenType {
    const config: tokenType = {}
    for (const key of keys) {
        config[key] = CATALOG[key]
    }
    return config
}

/**
 * Arity of every FUNCTION token, derived from the catalog. Used by the
 * structural validity check (and available to the evaluator) so that "sin takes
 * one argument, nthrt takes two" lives in exactly one place.
 */
export const FUNCTION_ARITY: Record<string, number> = {}
for (const [name, def] of Object.entries(CATALOG) as [string, TokenDefinition][]) {
    if (def.type === ShutingyardType.FUNCTION) {
        FUNCTION_ARITY[name] = def.arity ?? 1
    }
}
