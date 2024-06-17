import { createRequire } from "node:module";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import Ajv from "ajv";
import {
  CredentialRequest,
  CredentialRequestJwtVcJson,
  CredentialRequestVcSdJwt,
  IssuerMetadata,
} from "./protocol.types.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];
const schemaDir = path.join(__dirname, "src/oid4vci/types/protocolSchema/");

export const schemaValidator = <T>(
  schemaName: string,
  rawData: unknown,
): rawData is T => {
  try {
    const fullPath = path.join(schemaDir, `${schemaName}.json`);
    const schema = require(fullPath);

    const ajv = new Ajv();
    const valid = ajv.validate(schema, rawData);

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

type ValidatorFunction<T> = (
  schemaName: string, // eslint-disable-line no-unused-vars
  rawData: unknown,
) => rawData is T;

function validateWithSchemas<T>(
  rawData: unknown,
  schemas: string[],
  schemaValidator: ValidatorFunction<T>,
): T {
  for (const schemaName of schemas) {
    if (schemaValidator(schemaName, rawData)) {
      return rawData;
    }
  }
  throw new Error("Invalid Data");
}

export const issuerMetadataValidator = (rawData: unknown): IssuerMetadata => {
  const schemas = [
    "IssuerMetadataJwtVcJsonLd",
    "IssuerMetadataJwtVcJson",
    "IssuerMetadataLdpVc",
    "IssuerMetadataVcSdJwt",
  ];

  return validateWithSchemas<IssuerMetadata>(rawData, schemas, schemaValidator);
};

export const credentialRequestValidator = (
  rawData: unknown,
): CredentialRequest => {
  const schemas = ["CredentialRequestVcSdJwt", "CredentialRequestJwtVcJson"];

  return validateWithSchemas<CredentialRequest>(
    rawData,
    schemas,
    schemaValidator,
  );
};

export const credentialRequestJwtVcJsonValidator = (
  rawData: unknown,
): CredentialRequestJwtVcJson => {
  return validateWithSchemas<CredentialRequestJwtVcJson>(
    rawData,
    ["CredentialRequestJwtVcJson"],
    schemaValidator,
  );
};

export const credentialRequestVcSdJwtValidator = (
  rawData: unknown,
): CredentialRequestJwtVcJson => {
  return validateWithSchemas<CredentialRequestVcSdJwt>(
    rawData,
    ["CredentialRequestVcSdJwt"],
    schemaValidator,
  );
};
