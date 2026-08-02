import { TokenConfigNumeric } from "./TokenConfigNumeric"

// EXPRESSION currently offers nothing NUMERIC does not: argument separators are
// handled directly in NextToken, so this is a deliberate alias. Kept as a named
// export (and mode) for backward compatibility; give it its own `pick(...)` list
// the day the two modes must genuinely diverge.
export const TokenConfigExpression = TokenConfigNumeric
