import { v4 as uuidv4 } from "uuid";
import { decodeJwt, importJWK, JWTHeaderParameters, SignJWT } from "jose";
import ellipticJwk, { PrivateJwk } from "elliptic-jwk";
import { assert } from "chai";
import request from "supertest";

import { OkResult } from "ownd-vci/dist/types";
import { getKeyAlgorithm } from "ownd-vci/dist/crypto/util";

import { generateCert } from "./testUtils";
import {
  INPUT_DESCRIPTOR_TICKET,
  TicketCredential,
  verifyVPResponse,
} from "../src/oid4vp/routesHandler";
import {
  getCertificatesInfo,
  verifyCertificateChain,
} from "../src/oid4vp/x509";

import { init, memorySession } from "../src/app";
import store from "../src/store";
import {
  defaultFixtureEvent,
  defaultFixtureTicket,
  fixtureEvent,
  fixtureTicket,
} from "./tickets.test";

import { camelToSnake } from "../src/oid4vp";

async function jwk2KeyLike(privateJwk: PrivateJwk, alg: string) {
  const { kty, crv, x, y, d } = privateJwk;
  return await importJWK({ kty, crv, x, y, d }, alg);
}

async function generateTicketVcJwt(
  ticketNo: string = uuidv4(),
  eventName: string = "test event",
) {
  const ticketCredential: TicketCredential = {
    ticketNo,
    eventName,
  };
  const { cert, privateJwk } = await generateCert();
  const x5c = [cert];

  // https://www.w3.org/TR/vc-data-model-1.0/#contexts
  // https://www.w3.org/TR/vc-data-model-1.0/#types
  // https://www.w3.org/TR/vc-data-model-1.0/#presentations-0
  // https://www.w3.org/TR/vc-data-model-1.0/#proof-formats
  const claims = {
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["TicketCredential"],
      credentialSubject: ticketCredential,
    },
  };
  let alg = getKeyAlgorithm(privateJwk);
  let basicHeader: JWTHeaderParameters = { alg: alg, typ: "JWT" };
  let header = { ...basicHeader, x5c };
  let key = await jwk2KeyLike(privateJwk, alg);

  // const jwt = await new SignJWT(claims).setProtectedHeader(header).sign(key);
  const vcJwt = await new SignJWT(claims)
    .setProtectedHeader(header)
    .setIssuedAt()
    .setIssuer("urn:example:issuer")
    .setExpirationTime("30 days")
    .sign(key);
  return { ticketCredential, alg, basicHeader, key, vcJwt };
}

async function generateTicketVpJwt(vcJwt: string) {
  const vpClaims = {
    vp: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [vcJwt],
    },
  };
  const holderPrivateJwk = ellipticJwk.newPrivateJwk("P-256");
  const alg = getKeyAlgorithm(holderPrivateJwk);
  const basicHeader = { alg: alg, typ: "JWT" };
  const key = await jwk2KeyLike(holderPrivateJwk, alg);

  // const jwt = await new SignJWT(claims).setProtectedHeader(header).sign(key);
  return await new SignJWT(vpClaims)
    .setProtectedHeader({ ...basicHeader, jwk: holderPrivateJwk })
    .setIssuedAt()
    .setIssuer("dummy jwk thumbprint of wallet")
    .setAudience("urn:example:verifier:client_id")
    .setExpirationTime("2h")
    .sign(key);
}

const descriptorMapTicket = {
  id: INPUT_DESCRIPTOR_TICKET.id,
  format: "jwt_vc",
  path: "$",
  pathNested: {
    format: "jwt_vc_json",
    path: "$[0].vp.verifiableCredential[0]",
  },
};

const getPresentationSubmission = (definitionId?: string) => {
  return {
    id: uuidv4(),
    definitionId: definitionId
      ? definitionId
      : "32f54163-7166-48f1-93d8-ff217bdb0653",
    descriptorMap: [descriptorMapTicket],
  };
};
const getSerializedPresentationSubmission = (definitionId?: string) => {
  return JSON.stringify(camelToSnake(getPresentationSubmission(definitionId)));
};

describe("vp verify test", () => {
  const originalEnv = process.env;
  beforeEach(async () => {
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    // テストが終わった後に元の状態に戻す
    process.env = originalEnv;
  });
  it("should be verified by iss public key", async () => {
    let { ticketCredential, vcJwt } = await generateTicketVcJwt();
    const vpJwt = await generateTicketVpJwt(vcJwt);
    console.debug(decodeJwt(vcJwt));
    console.debug(decodeJwt(vpJwt));
    process.env.ENVIRONMENT = "local";
    const handleVpResponseResult = await verifyVPResponse(
      vpJwt,
      getPresentationSubmission(),
      [INPUT_DESCRIPTOR_TICKET],
    );
    console.debug(handleVpResponseResult);
    assert.equal(handleVpResponseResult.ok, true);
    const { payload: extractedVc } =
      handleVpResponseResult as OkResult<TicketCredential>;
    assert.equal(extractedVc.ticketNo, ticketCredential.ticketNo);
    assert.equal(extractedVc.eventName, ticketCredential.eventName);
  });
});

const app = init();
const submissionRequirementTicket = {
  name: "Ticket",
  rule: "pick",
  count: 1,
  from: "A",
};
describe("vp response test", () => {
  const originalEnv = process.env;
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    // テストが終わった後に元の状態に戻す
    process.env = originalEnv;
  });
  it("should be 400 error by no existence ticket", async () => {
    const pd = {
      id: uuidv4(),
      inputDescriptors: [INPUT_DESCRIPTOR_TICKET],
      submissionRequirements: [submissionRequirementTicket],
    };
    memorySession.presentationDefinitions = {};
    memorySession.presentationDefinitions[pd.id] = pd;

    let { vcJwt } = await generateTicketVcJwt();
    const vpJwt = await generateTicketVpJwt(vcJwt);

    const payload = {
      vp_token: vpJwt,
      presentation_submission: getSerializedPresentationSubmission(),
    };
    console.debug(decodeJwt(vcJwt));
    console.debug(decodeJwt(vpJwt));
    const response = await request(app.callback())
      .post(new URL(process.env.OID4VP_RESPONSE_URI || "").pathname)
      .send(payload);
    assert.equal(response.status, 400);
  });
  it("should be 200", async () => {
    process.env.ENVIRONMENT = "local";
    const eventId = await fixtureEvent(defaultFixtureEvent);
    const ticket = await fixtureTicket(eventId, defaultFixtureTicket);

    const pd = {
      id: uuidv4(),
      inputDescriptors: [INPUT_DESCRIPTOR_TICKET],
      submissionRequirements: [submissionRequirementTicket],
    };

    memorySession.presentationDefinitions = {};
    memorySession.presentationDefinitions[pd.id] = pd;

    let { vcJwt } = await generateTicketVcJwt(ticket.ticketNo);
    const vpJwt = await generateTicketVpJwt(vcJwt);

    const payload = {
      vp_token: vpJwt,
      presentation_submission: getSerializedPresentationSubmission(pd.id),
    };
    console.debug(decodeJwt(vcJwt));
    console.debug(decodeJwt(vpJwt));
    const response = await request(app.callback())
      .post(new URL(process.env.OID4VP_RESPONSE_URI || "").pathname)
      .send(payload);
    assert.equal(response.status, 200);
    const body = response.body;
    assert.isObject(body);
    assert.equal(
      body.redirect_uri,
      `${process.env.OID4VP_REDIRECT_URI_AFTER_DIRECT_POST}/${eventId}`,
    );
    const ticketRow = await store.getTicketByTicketNo(ticket.ticketNo);
    assert.notEqual(ticketRow?.consumedAt, null);
    //  assert.notEqual(ticketRow?.authorizedCode.usedAt, null);
    //  このテストでは`accessTokenIssuer`が呼ばれないので、この値はnullが正しい。
    //  過去の実装では、`consumeTicket`で更新していたので、nullでない状態であった。
  });
});

describe("xert chain test", () => {
  beforeEach(async () => {});
  it("cert chain should be verified", async () => {
    const certificateArray = chain
      .split("-----END CERTIFICATE-----\n")
      .map((cert) =>
        cert
          .replace("-----BEGIN CERTIFICATE-----\n", "")
          .replace("-----END CERTIFICATE-----", "")
          .replace(/\n/g, "")
          .trim(),
      )
      .filter((cert) => cert !== "");

    console.log(certificateArray);

    await verifyCertificateChain(certificateArray);
  });
  it("cert chain should be converted cert model", async () => {
    const certificateArray = chain
      .split("-----END CERTIFICATE-----\n")
      .map((cert) =>
        cert
          .replace("-----BEGIN CERTIFICATE-----\n", "")
          .replace("-----END CERTIFICATE-----", "")
          .replace(/\n/g, "")
          .trim(),
      )
      .filter((cert) => cert !== "");

    console.log(certificateArray);

    const certsInfo = getCertificatesInfo(certificateArray);
    console.log(certsInfo);
  });
});

const chain = `-----BEGIN CERTIFICATE-----
MIIFUjCCBPegAwIBAgIRAO68a+XoD/PhST9Zr7Fq4b0wCgYIKoZIzj0EAwIwgZUx
CzAJBgNVBAYTAkdCMRswGQYDVQQIExJHcmVhdGVyIE1hbmNoZXN0ZXIxEDAOBgNV
BAcTB1NhbGZvcmQxGDAWBgNVBAoTD1NlY3RpZ28gTGltaXRlZDE9MDsGA1UEAxM0
U2VjdGlnbyBFQ0MgT3JnYW5pemF0aW9uIFZhbGlkYXRpb24gU2VjdXJlIFNlcnZl
ciBDQTAeFw0yMzEyMDUwMDAwMDBaFw0yNTAxMDQyMzU5NTlaMFAxCzAJBgNVBAYT
AkpQMQ4wDAYDVQQIEwVUb2t5bzEWMBQGA1UEChMNRGF0YVNpZ24gSW5jLjEZMBcG
A1UEAxMQb3duZC1wcm9qZWN0LmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IA
BFIprdRg9RgqfsmAAmY/QMQ3Czjds6QvvO3WJT4rP00KVBwHxlbH1ZfSKVgDAdZP
fQAp7tWBED9nlck7Qk9M4nGjggNqMIIDZjAfBgNVHSMEGDAWgBRNSu/ERrMSrU9O
mrFZ4lGrCBB4CDAdBgNVHQ4EFgQULd9BFtdtud+3yIiR9ZXHqd6S9WQwDgYDVR0P
AQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsG
AQUFBwMCMEoGA1UdIARDMEEwNQYMKwYBBAGyMQECAQMEMCUwIwYIKwYBBQUHAgEW
F2h0dHBzOi8vc2VjdGlnby5jb20vQ1BTMAgGBmeBDAECAjBaBgNVHR8EUzBRME+g
TaBLhklodHRwOi8vY3JsLnNlY3RpZ28uY29tL1NlY3RpZ29FQ0NPcmdhbml6YXRp
b25WYWxpZGF0aW9uU2VjdXJlU2VydmVyQ0EuY3JsMIGKBggrBgEFBQcBAQR+MHww
VQYIKwYBBQUHMAKGSWh0dHA6Ly9jcnQuc2VjdGlnby5jb20vU2VjdGlnb0VDQ09y
Z2FuaXphdGlvblZhbGlkYXRpb25TZWN1cmVTZXJ2ZXJDQS5jcnQwIwYIKwYBBQUH
MAGGF2h0dHA6Ly9vY3NwLnNlY3RpZ28uY29tMDEGA1UdEQQqMCiCEG93bmQtcHJv
amVjdC5jb22CFHd3dy5vd25kLXByb2plY3QuY29tMIIBfQYKKwYBBAHWeQIEAgSC
AW0EggFpAWcAdQDPEVbu1S58r/OHW9lpLpvpGnFnSrAX7KwB0lt3zsw7CAAAAYw6
NipUAAAEAwBGMEQCIBVcGQjOkfLxvpm1Admcetmn8D15G4Gt2AIdOXveZYrsAiBe
q8jh8G4geumOHXIklSxvBzip9VK6sw9yq4AnTHnSPwB2AKLjCuRF772tm3447Udn
d1PXgluElNcrXhssxLlQpEfnAAABjDo2KcoAAAQDAEcwRQIhAJP0UetSSFGF9/fa
OHVzhkPFOg3etjXqWQShnxYI8a+GAiABzN4+sJAysZ88mtodttNYamXsnfw1T3qX
YcJbB5GwJAB2AE51oydcmhDDOFts1N8/Uusd8OCOG41pwLH6ZLFimjnfAAABjDo2
KhkAAAQDAEcwRQIgbpDfqifRz9PW+Tq83ivbXHA1GheQpGX88laI0XB910gCIQCK
Rm2sRqqlgaXX7rO3EznDn7MwC4mbQwSyEIDjXddHMzAKBggqhkjOPQQDAgNJADBG
AiEAzwi+A0/YY55h0f+Id0+eUPrRsVBdOKWIp19yQZ62jJICIQCvKk/avGDl5/eN
IyN1eesa1sbs8QfbTbvzitYsVlRqXg==
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDrjCCAzOgAwIBAgIQNb50Y4yz6d4oBXC3l4CzZzAKBggqhkjOPQQDAzCBiDEL
MAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0plcnNl
eSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNVBAMT
JVVTRVJUcnVzdCBFQ0MgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMTgxMTAy
MDAwMDAwWhcNMzAxMjMxMjM1OTU5WjCBlTELMAkGA1UEBhMCR0IxGzAZBgNVBAgT
EkdyZWF0ZXIgTWFuY2hlc3RlcjEQMA4GA1UEBxMHU2FsZm9yZDEYMBYGA1UEChMP
U2VjdGlnbyBMaW1pdGVkMT0wOwYDVQQDEzRTZWN0aWdvIEVDQyBPcmdhbml6YXRp
b24gVmFsaWRhdGlvbiBTZWN1cmUgU2VydmVyIENBMFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAEnI5cCmFvoVij0NXO+vxE+f+6Bh57FhpyH0LTCrJmzfsPSXIhTSex
r92HOlz+aHqoGE0vSe/CSwLFoWcZ8W1jOaOCAW4wggFqMB8GA1UdIwQYMBaAFDrh
CYbUzxnClnZ0SXbc4DXGY2OaMB0GA1UdDgQWBBRNSu/ERrMSrU9OmrFZ4lGrCBB4
CDAOBgNVHQ8BAf8EBAMCAYYwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHSUEFjAU
BggrBgEFBQcDAQYIKwYBBQUHAwIwGwYDVR0gBBQwEjAGBgRVHSAAMAgGBmeBDAEC
AjBQBgNVHR8ESTBHMEWgQ6BBhj9odHRwOi8vY3JsLnVzZXJ0cnVzdC5jb20vVVNF
UlRydXN0RUNDQ2VydGlmaWNhdGlvbkF1dGhvcml0eS5jcmwwdgYIKwYBBQUHAQEE
ajBoMD8GCCsGAQUFBzAChjNodHRwOi8vY3J0LnVzZXJ0cnVzdC5jb20vVVNFUlRy
dXN0RUNDQWRkVHJ1c3RDQS5jcnQwJQYIKwYBBQUHMAGGGWh0dHA6Ly9vY3NwLnVz
ZXJ0cnVzdC5jb20wCgYIKoZIzj0EAwMDaQAwZgIxAOk//uo7i/MoeKdcyeqvjOXs
BJFGLI+1i0d+Tty7zEnn2w4DNS21TK8wmY3Kjm3EmQIxAPI1qHM/I+OS+hx0OZhG
fDoNifTe/GxgWZ1gOYQKzn6lwP0yGKlrP+7vrVC8IczJ4A==
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIID0zCCArugAwIBAgIQVmcdBOpPmUxvEIFHWdJ1lDANBgkqhkiG9w0BAQwFADB7
MQswCQYDVQQGEwJHQjEbMBkGA1UECAwSR3JlYXRlciBNYW5jaGVzdGVyMRAwDgYD
VQQHDAdTYWxmb3JkMRowGAYDVQQKDBFDb21vZG8gQ0EgTGltaXRlZDEhMB8GA1UE
AwwYQUFBIENlcnRpZmljYXRlIFNlcnZpY2VzMB4XDTE5MDMxMjAwMDAwMFoXDTI4
MTIzMTIzNTk1OVowgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpOZXcgSmVyc2V5
MRQwEgYDVQQHEwtKZXJzZXkgQ2l0eTEeMBwGA1UEChMVVGhlIFVTRVJUUlVTVCBO
ZXR3b3JrMS4wLAYDVQQDEyVVU0VSVHJ1c3QgRUNDIENlcnRpZmljYXRpb24gQXV0
aG9yaXR5MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEGqxUWqn5aCPnetUkb1PGWthL
q8bVttHmc3Gu3ZzWDGH926CJA7gFFOxXzu5dP+Ihs8731Ip54KODfi2X0GHE8Znc
JZFjq38wo7Rw4sehM5zzvy5cU7Ffs30yf4o043l5o4HyMIHvMB8GA1UdIwQYMBaA
FKARCiM+lvEH7OKvKe+CpX/QMKS0MB0GA1UdDgQWBBQ64QmG1M8ZwpZ2dEl23OA1
xmNjmjAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zARBgNVHSAECjAI
MAYGBFUdIAAwQwYDVR0fBDwwOjA4oDagNIYyaHR0cDovL2NybC5jb21vZG9jYS5j
b20vQUFBQ2VydGlmaWNhdGVTZXJ2aWNlcy5jcmwwNAYIKwYBBQUHAQEEKDAmMCQG
CCsGAQUFBzABhhhodHRwOi8vb2NzcC5jb21vZG9jYS5jb20wDQYJKoZIhvcNAQEM
BQADggEBABns652JLCALBIAdGN5CmXKZFjK9Dpx1WywV4ilAbe7/ctvbq5AfjJXy
ij0IckKJUAfiORVsAYfZFhr1wHUrxeZWEQff2Ji8fJ8ZOd+LygBkc7xGEJuTI42+
FsMuCIKchjN0djsoTI0DQoWz4rIjQtUfenVqGtF8qmchxDM6OW1TyaLtYiKou+JV
bJlsQ2uRl9EMC5MCHdK8aXdJ5htN978UeAOwproLtOGFfy/cQjutdAFI3tZs4RmY
CV4Ks2dH/hzg1cEo70qLRDEmBDeNiXQ2Lu+lIg+DdEmSx/cQwgwp+7e9un/jX9Wf
8qn0dNW44bOwgeThpWOjzOoEeJBuv/c=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEMjCCAxqgAwIBAgIBATANBgkqhkiG9w0BAQUFADB7MQswCQYDVQQGEwJHQjEb
MBkGA1UECAwSR3JlYXRlciBNYW5jaGVzdGVyMRAwDgYDVQQHDAdTYWxmb3JkMRow
GAYDVQQKDBFDb21vZG8gQ0EgTGltaXRlZDEhMB8GA1UEAwwYQUFBIENlcnRpZmlj
YXRlIFNlcnZpY2VzMB4XDTA0MDEwMTAwMDAwMFoXDTI4MTIzMTIzNTk1OVowezEL
MAkGA1UEBhMCR0IxGzAZBgNVBAgMEkdyZWF0ZXIgTWFuY2hlc3RlcjEQMA4GA1UE
BwwHU2FsZm9yZDEaMBgGA1UECgwRQ29tb2RvIENBIExpbWl0ZWQxITAfBgNVBAMM
GEFBQSBDZXJ0aWZpY2F0ZSBTZXJ2aWNlczCCASIwDQYJKoZIhvcNAQEBBQADggEP
ADCCAQoCggEBAL5AnfRu4ep2hxxNRUSOvkbIgwadwSr+GB+O5AL686tdUIoWMQua
BtDFcCLNSS1UY8y2bmhGC1Pqy0wkwLxyTurxFa70VJoSCsN6sjNg4tqJVfMiWPPe
3M/vg4aijJRPn2jymJBGhCfHdr/jzDUsi14HZGWCwEiwqJH5YZ92IFCokcdmtet4
YgNW8IoaE+oxox6gmf049vYnMlhvB/VruPsUK6+3qszWY19zjNoFmag4qMsXeDZR
rOme9Hg6jc8P2ULimAyrL58OAd7vn5lJ8S3frHRNG5i1R8XlKdH5kBjHYpy+g8cm
ez6KJcfA3Z3mNWgQIJ2P2N7Sw4ScDV7oL8kCAwEAAaOBwDCBvTAdBgNVHQ4EFgQU
oBEKIz6W8Qfs4q8p74Klf9AwpLQwDgYDVR0PAQH/BAQDAgEGMA8GA1UdEwEB/wQF
MAMBAf8wewYDVR0fBHQwcjA4oDagNIYyaHR0cDovL2NybC5jb21vZG9jYS5jb20v
QUFBQ2VydGlmaWNhdGVTZXJ2aWNlcy5jcmwwNqA0oDKGMGh0dHA6Ly9jcmwuY29t
b2RvLm5ldC9BQUFDZXJ0aWZpY2F0ZVNlcnZpY2VzLmNybDANBgkqhkiG9w0BAQUF
AAOCAQEACFb8AvCb6P+k+tZ7xkSAzk/ExfYAWMymtrwUSWgEdujm7l3sAg9g1o1Q
GE8mTgHj5rCl7r+8dFRBv/38ErjHT1r0iWAFf2C3BUrz9vHCv8S5dIa2LX1rzNLz
Rt0vxuBqw8M0Ayx9lt1awg6nCpnBBYurDC/zXDrPbDdVCYfeU0BsWO/8tqtlbgT2
G9w84FoVxp7Z8VlIMCFlA2zs6SFz7JsDoeA3raAVGI/6ugLOpyypEBMs1OUIJqsi
l2D4kF501KKaU73yqWjgom7C12yxow+ev+to51byrvLjKzg6CYG1a4XXvi3tPxq3
smPi9WIsgtRqAEFQ8TmDn5XpNpaYbg==
-----END CERTIFICATE-----`;
