export declare class NumExp {
    private _rpn;
    private _expression;
    private _isValid;
    constructor(value: string, uniformize?: boolean);
    get rpn(): {
        token: string;
        tokenType: string;
    }[];
    get isValid(): boolean;
    set isValid(value: boolean);
    get expression(): string;
    evaluate(values?: Record<string, number>): number;
    private _numberCorrection;
}
