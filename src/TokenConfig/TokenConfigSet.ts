import { pick } from "./tokenCatalog"

// SET mode: set-algebra operators (union, intersection, complement, difference).
export const TokenConfigSet = pick('&', '|', '!', '-')
