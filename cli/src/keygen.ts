import { promises as fs } from "fs";
import { join, dirname } from "path";

import { Command } from "@commander-js/extra-typings";

import { CRV, publicJwkFromPrivate, newPrivateJwk } from "elliptic-jwk";

/**
 * Save the given JWK as a JSON file to the specified path.
 * @param {string} filePath - The path to save the JWK to.
 * @param {Object} jwk - The JWK to save.
 */
async function saveJwkToFile(filePath: string, jwk: object) {
  try {
    if (await fileExists(filePath)) {
      throw new Error(`File already exists: ${filePath}`);
    }
    // Ensure the directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });

    // Write the JWK to the file
    await fs.writeFile(filePath, JSON.stringify(jwk, null, 4), "utf8");
    console.log(`JWK saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving JWK to ${filePath}:`, error);
  }
}

/**
 * Check if a file exists.
 * @param {string} filePath - Path of the file to check.
 * @returns {boolean} True if file exists, false otherwise.
 */
async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const validateValue = (value: string): CRV => {
  switch (value) {
    case "secp256k1":
      return value;
    case "Ed25519":
      return value;
    default:
      throw new Error(
        `Invalid value: ${value}. Allowed values are: secp256k1, Ed25519`,
      );
  }
};

export const command = new Command("key:new")
  .description("Generate key pair formatted jwk")
  .argument("<key id>", "key id")
  .option("-o, --out <path>", "output path of generated key pair jwk")
  .option(
    "-c, --curve <curve>",
    "secp256k1 or Ed25519",
    validateValue,
    "secp256k1" as CRV,
  )
  .action(async (keyId, options) => {
    const outPath = options.out || "./";
    const curve = options.curve;

    const privateJwk = newPrivateJwk(curve);
    const publicJwk = publicJwkFromPrivate(privateJwk);

    // Save both JWKs as JSON files
    await saveJwkToFile(join(outPath, `${keyId}-private.jwk`), {
      kid: keyId,
      ...privateJwk,
    });
    await saveJwkToFile(join(outPath, `${keyId}-public.jwk`), {
      kid: keyId,
      ...publicJwk,
    });
  });
