export declare const formats: {
    int32: {
        validate: (i: any) => boolean;
        type: string;
    };
    int64: {
        validate: (i: any) => boolean;
        type: string;
    };
    float: {
        validate: (i: any) => boolean;
        type: string;
    };
    double: {
        validate: (i: any) => boolean;
        type: string;
    };
    byte: (b: any) => boolean;
    binary: () => boolean;
    password: () => boolean;
};
