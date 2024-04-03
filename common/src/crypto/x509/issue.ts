import * as jsrsasign from "jsrsasign";
import {
  addSeconds,
  formatDateTimeForDisplay,
  getCurrentUTCDate,
} from "../../utils/datetime";
import { positiveSerialNumber } from "../util";

export const CSR_PEM_PREAMBLE = "-----BEGIN CERTIFICATE REQUEST-----";
export const CSR_PEM_POSTAMBLE = "-----END CERTIFICATE REQUEST-----";
export const CERT_PEM_PREAMBLE = "-----BEGIN CERTIFICATE-----";
export const CERT_PEM_POSTAMBLE = "-----END CERTIFICATE-----";

const trimmer = (str: string): string => {
  return str
    .replace(new RegExp(CSR_PEM_PREAMBLE, "g"), "")
    .replace(new RegExp(CSR_PEM_POSTAMBLE, "g"), "")
    .replace(new RegExp(CERT_PEM_PREAMBLE, "g"), "")
    .replace(new RegExp(CERT_PEM_POSTAMBLE, "g"), "")
    .replace(/\r?\n|\r/g, "");
};

export const createEcdsaCsr = (
  subject: string,
  publicKeyPem: string,
  privateKeyPem: string,
) => {
  const regularCsr = jsrsasign.KJUR.asn1.csr.CSRUtil.newCSRPEM({
    subject: { str: subject },
    sbjpubkey: publicKeyPem,
    sigalg: "SHA256withECDSA",
    sbjprvkey: privateKeyPem,
  });
  return trimmer(regularCsr);
};

export const createEcdsaSelfCertificate = (
  csr: string,
  privateKeyPEM: string,
): string => {
  const privateKey = jsrsasign.KEYUTIL.getKey(privateKeyPEM);

  const csrWithMarker =
    CSR_PEM_PREAMBLE + "\n" + csr + "\n" + CSR_PEM_POSTAMBLE;
  const parameter = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csrWithMarker);

  const notBefore = getCurrentUTCDate();
  const notAfter = addSeconds(notBefore, 86400 * 365);
  const serialNumber = positiveSerialNumber();

  const cert = new jsrsasign.KJUR.asn1.x509.Certificate({
    version: 3,
    cakey: privateKey,
    issuer: parameter.subject,
    subject: parameter.subject,
    sbjpubkey: parameter.sbjpubkey,
    sigalg: "SHA256withECDSA",
    serial: { hex: serialNumber },
    notbefore: formatDateTimeForDisplay(notBefore),
    notafter: formatDateTimeForDisplay(notAfter),
    ext: [],
  });

  return trimmer(cert.getPEM());
};
