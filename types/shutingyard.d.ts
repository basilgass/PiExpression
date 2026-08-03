import { ShutingyardMode, ShutingyardType, type Token, type tokenType } from "./piexpression.types";
export interface NextTokenResult {
    token: string;
    nextPos: number;
    type: ShutingyardType;
}
export declare class ShutingYard {
    #private;
    constructor(mode?: ShutingyardMode);
    get rpn(): Token[];
    get rpnToken(): string[];
    tokenConfigInitialization(): tokenType;
    NextToken(expr: string, start: number): NextTokenResult;
    parse(expr: string, uniformize?: boolean): this;
}
//# sourceMappingURL=shutingyard.d.ts.map