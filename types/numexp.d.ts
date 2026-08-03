import { type Token } from "./piexpression.types";
export declare class NumExp {
    private readonly _rpn;
    private readonly _expression;
    constructor(value: string, uniformize?: boolean);
    get rpn(): Token[];
    get expression(): string;
    get variables(): string[];
    isValid(values?: Record<string, number>): boolean;
    private _isStructurallyValid;
    evaluate(values?: Record<string, number>): number;
    private _numberCorrection;
}
//# sourceMappingURL=numexp.d.ts.map