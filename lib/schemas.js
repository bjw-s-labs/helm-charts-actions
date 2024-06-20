"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changelogEntrySchema = void 0;
exports.validateAgainstJsonSchema = validateAgainstJsonSchema;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
exports.changelogEntrySchema = {
    type: "object",
    properties: {
        kind: {
            type: "string",
            enum: ["added", "changed", "deprecated", "removed", "fixed", "security"],
        },
        description: { type: "string" },
        links: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    url: { $ref: "#/definitions/saneUrl" },
                },
                required: ["name", "url"],
                additionalProperties: false,
            },
        },
    },
    required: ["kind", "description"],
    additionalProperties: false,
    definitions: {
        saneUrl: {
            type: "string",
            format: "uri",
            pattern: "^https?://",
        },
    },
};
function validateAgainstJsonSchema(object, schema) {
    const ajv = new ajv_1.default();
    (0, ajv_formats_1.default)(ajv);
    const validator = ajv.compile(schema);
    return {
        valid: validator(object),
        errors: validator.errors,
    };
}
//# sourceMappingURL=schemas.js.map