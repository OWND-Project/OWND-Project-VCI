import {
  hexToBinary,
  positiveSerialNumber,
  sha1Binary,
} from "../../src/crypto/util.js";
import { assert } from "chai";

describe("util.ts", () => {
  describe("positiveSerialNumber", () => {
    it("should return a positive serial number", () => {
      const serialNumber = positiveSerialNumber();
      assert.isTrue(BigInt(`0x${serialNumber}`) > 0);
    });
  });

  describe("hexToBinary", () => {
    it("should convert hex string to binary buffer", () => {
      const hex = "48656c6c6f";
      const binary = hexToBinary(hex);
      assert.isTrue(binary.toString() === "Hello");
    });
  });

  describe("sha1Binary", () => {
    it("should return the SHA-1 hash of the binary data", () => {
      const binary = Buffer.from("Hello world!", "utf8");
      const hash = sha1Binary(binary);
      assert.isTrue(hash === "d3486ae9136e7856bc42212385ea797094475802");
    });
  });
});
