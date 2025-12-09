import { ShutingyardMode, ShutingyardType, Token, tokenType } from './piexpression.types';
export declare class ShutingYard {
    #private;
    constructor(mode?: ShutingyardMode);
    get rpn(): Token[];
    get rpnToken(): string[];
    tokenConfigInitialization(): tokenType;
    /**
     * Get the next token to analyse.
     * @param expr (string) Expression to analyse
     * @param start (number) CUrrent position in the expr string.
     */
    NextToken(expr: string, start: number): [string, number, ShutingyardType];
    /**
     * Parse an expression using the shutting yard tree algorithms
     * @param expr (string) Expression to analyse
     * Returns a RPN list of items.
     * @param uniformize
     */
    parse(expr: string, uniformize?: boolean): this;
}
