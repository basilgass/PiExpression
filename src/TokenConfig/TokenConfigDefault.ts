import { pick } from "./tokenCatalog"

// POLYNOM mode: bare arithmetic operators, no functions.
export const TokenConfigDefault = pick('^', '*', '/', '+', '-')
