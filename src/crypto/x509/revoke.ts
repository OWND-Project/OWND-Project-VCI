import * as jsrsasign from "jsrsasign";
import {
  formatDateToCustomCompactForm,
  getCurrentUTCDate,
} from "../../utils/datetime.js";

export interface RevokedCertificate {
  serialNumber: string;
  revocationDate: Date;
  reason: number | undefined; // Reason must not be listed in mDL CRL
}

export const generateCrl = (
  revokedCertificates: RevokedCertificate[],
  issuerName: string,
  crlNumber: number,
  nextUpdate: Date,
  signatureAlgorithm: string,
  keyIdentifierHex: string, // Same value as the subject key identifier of the IACA certificate.
  issuerPrivateKeyPEM: string,
): string => {
  const tbsobj = new jsrsasign.KJUR.asn1.x509.TBSCertList();
  const certEntries = revokedCertificates.map((cert) => {
    return {
      sn: { hex: cert.serialNumber },
      date: formatDateToCustomCompactForm(cert.revocationDate),
      ext:
        cert.reason !== undefined
          ? [{ extname: "cRLReason", code: cert.reason }]
          : [],
    };
  });
  const param = {
    sigalg: signatureAlgorithm,
    issuer: { str: issuerName },
    thisupdate: formatDateToCustomCompactForm(getCurrentUTCDate()),
    nextupdate: formatDateToCustomCompactForm(nextUpdate),
    revcert: certEntries,
    ext: [
      { extname: "cRLNumber", num: { int: crlNumber } },
      { extname: "authorityKeyIdentifier", kid: { hex: keyIdentifierHex } },
    ],
  };

  // @ts-ignore
  tbsobj.setByParam(param);

  const crl = new jsrsasign.KJUR.asn1.x509.CRL({
    tbsobj: tbsobj,
    // @ts-ignore
    sigalg: signatureAlgorithm,
    // @ts-ignore
    cakey: jsrsasign.KEYUTIL.getKey(issuerPrivateKeyPEM),
  });
  crl.sign();
  return crl.getPEM();
};
