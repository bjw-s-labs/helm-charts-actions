"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs-extra"));
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
async function run() {
    try {
        // const schemaFile = core.getInput("schemaFile", { required: true });
        const schemaFile = '/Users/bjw-s/Development/src/github.com/bjw-s/helm-charts/charts/library/common/values.schema.json';
        // const outputFile = core.getInput("outputFile", { required: true });;
        const outputFile = 'test.schema.json';
        if (!(await fs.pathExists(schemaFile))) {
            core.setFailed(`${schemaFile} does not exist!`);
            return;
        }
        let parser = new json_schema_ref_parser_1.default();
        let schema = await parser.dereference(schemaFile);
        await fs.writeFile(outputFile, JSON.stringify(schema, null, 2), 'utf8');
        core.info(`Dereferenced json-schema file to ${outputFile}.`);
    }
    catch (error) {
        core.setFailed(String(error));
    }
}
async function runWrapper() {
    try {
        await run();
    }
    catch (error) {
        core.setFailed(`dereference-json-schema action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=dereference-json-schema.js.map