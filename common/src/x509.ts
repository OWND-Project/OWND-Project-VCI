import * as jsrsasign from "jsrsasign";

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

export const checkEcdsaKeyEquality = (pem1: string, pem2: string) => {
  const kidPublicKey = jsrsasign.KEYUTIL.getKey(pem1);
  const certPublicKey = jsrsasign.KEYUTIL.getKey(pem2);
  if (
    !(kidPublicKey instanceof jsrsasign.KJUR.crypto.ECDSA) ||
    !(certPublicKey instanceof jsrsasign.KJUR.crypto.ECDSA)
  ) {
    throw new Error("The key type is assumed to be ECDSA");
  }
  const kidXY = kidPublicKey.getPublicKeyXYHex();
  const certXY = certPublicKey.getPublicKeyXYHex();
  return kidXY.x === certXY.x && kidXY.y === certXY.y;
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

function getCurrentUTCDate(): Date {
  return new Date(); // UTCで現在の日時を取得
}

function addSeconds(date: Date, secondsToAdd: number): Date {
  const newDate = new Date(date);
  newDate.setUTCSeconds(date.getUTCSeconds() + secondsToAdd);
  return newDate;
}

function formatDateTimeForDisplay(date: Date): string {
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  const hours = ("0" + date.getUTCHours()).slice(-2);
  const minutes = ("0" + date.getUTCMinutes()).slice(-2);
  const seconds = ("0" + date.getUTCSeconds()).slice(-2);

  return year + month + day + hours + minutes + seconds + "Z";
}

const positiveSerialNumber = () => {
  let hexValue: string;
  do {
    hexValue = jsrsasign.KJUR.crypto.Util.getRandomHexOfNbytes(20);
  } while (
    BigInt("0x" + hexValue) >> BigInt(hexValue.length * 4 - 1) ===
    BigInt(1)
  );
  return hexValue;
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
