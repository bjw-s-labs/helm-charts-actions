export declare const changelogEntrySchema: {
    type: string;
    properties: {
        kind: {
            type: string;
            enum: string[];
        };
        description: {
            type: string;
        };
        links: {
            type: string;
            items: {
                type: string;
                properties: {
                    name: {
                        type: string;
                    };
                    url: {
                        $ref: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
    definitions: {
        saneUrl: {
            type: string;
            format: string;
            pattern: string;
        };
    };
};
export declare function validateAgainstJsonSchema(object: any, schema: typeof changelogEntrySchema): {
    valid: any;
    errors: any;
};
