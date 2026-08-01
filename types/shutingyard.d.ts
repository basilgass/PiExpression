import { ShutingyardMode, ShutingyardType, type Token, type tokenType } from "./piexpression.types";
export declare class ShutingYard {
    #private;
    constructor(mode?: ShutingyardMode);
    get rpn(): Token[];
    get rpnToken(): string[];
    tokenConfigInitialization(): tokenType;
    NextToken(expr: string, start: number): [string, number, ShutingyardType];
    parse(expr: string, uniformize?: boolean): this;
}
//# sourceMappingURL=shutingyard.d.ts.map