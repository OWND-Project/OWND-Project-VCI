import path, { dirname } from "path";
import Ajv from "ajv";
import fs from "fs/promises";
import {
  IssuerMetadata,
  IssuerMetadataDataIntegrityVcWithJsonLd,
  IssuerMetadataJwtVcWithJsonLd,
  IssuerMetadataJwtVcWithoutJsonLd,
  IssuerMetadataSelectiveDisclosureJwtVc,
} from "../oid4vci/protocol.types.js";
import { fileURLToPath } from "url";


export const readLocalJsonResource = async (
  dirname: string,
  filename: string,
) => {
  const metadataPath = path.join(dirname, filename);
  const fileContents = await fs.readFile(metadataPath, "utf-8");
  return JSON.parse(fileContents);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

export const readLocalIssuerMetadata = async (
  dirname: string,
  filename: string,
): Promise<IssuerMetadata> => {
  const rawMetadata = await readLocalJsonResource(dirname, filename);
  const ajv = new Ajv();

  const schemaFiles = [
    "IssuerMetadataJwtVcWithoutJsonLd.json",
    "IssuerMetadataDataIntegrityVcWithJsonLd.json",
    "IssuerMetadataJwtVcWithJsonLd.json",
    "IssuerMetadataSelectiveDisclosureJwtVc.json",
  ];

  const schemas = await Promise.all(
    schemaFiles.map((file) =>
      fs.readFile(
        path.join(path.join(__dirname, "../oid4vci/protocolSchema"), file),
        "utf-8",
      ),
    ),
  );

  const validators = schemas.map((schema) => ajv.compile(JSON.parse(schema)));

  if (validators[0](rawMetadata)) {
    return rawMetadata as IssuerMetadataJwtVcWithoutJsonLd;
  } else if (validators[1](rawMetadata)) {
    return rawMetadata as IssuerMetadataDataIntegrityVcWithJsonLd;
  } else if (validators[2](rawMetadata)) {
    return rawMetadata as IssuerMetadataJwtVcWithJsonLd;
  } else if (validators[3](rawMetadata)) {
    return rawMetadata as IssuerMetadataSelectiveDisclosureJwtVc;
  } else {
    throw new Error("Invalid metadata");
  }
};

let cachedIssuerMetadata: IssuerMetadata | undefined;

export const getIssuerMetadata = async (
  dirname: string,
  filename: string,
): Promise<IssuerMetadata> => {
  if (!cachedIssuerMetadata) {
    cachedIssuerMetadata = await readLocalIssuerMetadata(dirname, filename);
  }
  return cachedIssuerMetadata;
};
