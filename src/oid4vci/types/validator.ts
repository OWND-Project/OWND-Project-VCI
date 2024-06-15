import { createRequire } from "node:module";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import Ajv from "ajv";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];
const schemaDir = path.join(__dirname, "src/oid4vci/types/protocolSchema/");

export const schemaValidator = <T>(
  fileName: string,
  payload: unknown,
): payload is T => {
  try {
    const fullPath = path.join(schemaDir, `${fileName}.json`);
    const schema = require(fullPath);

    const ajv = new Ajv();
    const valid = ajv.validate(schema, payload);

    if (!valid) {
      console.log(ajv.errorsText());
      return false;
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
