import parser from "@apidevtools/swagger-parser";
import { fileURLToPath } from "node:url";
await parser.validate(fileURLToPath(new URL("../../docs/openapi.json", import.meta.url)));
console.log("OpenAPI contract validated");
