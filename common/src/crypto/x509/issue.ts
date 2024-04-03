import * as jsrsasign from "jsrsasign";
import {
  addSeconds,
  formatDateTimeForDisplay,
  getCurrentUTCDate,
} from "../../utils/datetime";
import { positiveSerialNumber } from "../util";
import {
  CERT_PEM_POSTAMBLE,
  CERT_PEM_PREAMBLE,
  CSR_PEM_POSTAMBLE,
  CSR_PEM_PREAMBLE,
} from "./constant";

export const trimmer = (str: string): string => {
  return str
    .replace(new RegExp(CSR_PEM_PREAMBLE, "g"), "")
    .replace(new RegExp(CSR_PEM_POSTAMBLE, "g"), "")
    .replace(new RegExp(CERT_PEM_PREAMBLE, "g"), "")
    .replace(new RegExp(CERT_PEM_POSTAMBLE, "g"), "")
    .replace(/\r?\n|\r/g, "");
};

export const generateCsr = (
  subject: string,
  subjectPublicKeyPem: string,
  subjectPrivateKeyPem: string,
  csrSigningAlgorithm: string,
  extension: any[],
): string => {
  const csr = new jsrsasign.KJUR.asn1.csr.CertificationRequest({
    subject: { str: subject },
    sbjpubkey: subjectPublicKeyPem,
    sbjprvkey: subjectPrivateKeyPem,
    sigalg: csrSigningAlgorithm,
    extreq: extension,
  });
  return csr.getPEM();
};

export const generateRootCertificate = (
  csr: string,
  notBefore: Date,
  notAfter: Date,
  signatureAlgorithm: string,
  issuerPrivateKeyPEM: string,
): string => {
  const csrWithLabel =
    CSR_PEM_PREAMBLE + "\n" + trimmer(csr) + "\n" + CSR_PEM_POSTAMBLE;
  const parameter = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csrWithLabel);
  return generateCertificate(
    csr,
    parameter.subject.str,
    notBefore,
    notAfter,
    signatureAlgorithm,
    issuerPrivateKeyPEM,
  );
};

export const generateCertificate = (
  csr: string,
  issuerName: string,
  notBefore: Date,
  notAfter: Date,
  signatureAlgorithm: string,
  issuerPrivateKeyPEM: string,
): string => {
  // const signatureAlgorithm = ""
  // const notBefore = getCurrentUTCDate();
  // const notAfter = addSeconds(notBefore, 86400 * 365);

  const csrWithLabel =
    CSR_PEM_PREAMBLE + "\n" + trimmer(csr) + "\n" + CSR_PEM_POSTAMBLE;

  const parameter = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csrWithLabel);
  const extension = parameter.extreq === undefined ? [] : parameter.extreq;

  const cert = new jsrsasign.KJUR.asn1.x509.Certificate({
    version: 3,
    cakey: jsrsasign.KEYUTIL.getKey(issuerPrivateKeyPEM),
    issuer: { str: issuerName },
    subject: parameter.subject,
    sbjpubkey: parameter.sbjpubkey,
    sigalg: signatureAlgorithm,
    serial: { hex: positiveSerialNumber() },
    notbefore: formatDateTimeForDisplay(notBefore),
    notafter: formatDateTimeForDisplay(notAfter),
    ext: extension,
  });

  return cert.getPEM();
};
