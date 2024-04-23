import { assert } from "chai";
import request from "supertest";

import { url2CredentialOffer } from "../../../common/src/oid4vci/CredentialOffer";
import { init } from "../src/app";
import store, { Employee, NewEmployee } from "../src/store";
import { GenerateCredentialOfferResult } from "../src/routes/admin/routesHandler";

const app = init();
const username = "username";
const password = "password";

const NEW_EMPLOYEE_ENDPOINT = "/admin/employees/new";

describe("/admin/employees/new endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();
  });
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(NEW_EMPLOYEE_ENDPOINT);
    assert.equal(response.status, 401);
  });
  it("Bad Request 1", async () => {
    const response = await request(app.callback())
      .post(NEW_EMPLOYEE_ENDPOINT)
      .auth(username, password);
    assert.equal(response.status, 400);
  });
  it("Bad Request 2", async () => {
    const response = await request(app.callback())
      .post(NEW_EMPLOYEE_ENDPOINT)
      .auth(username, password)
      .send({});
    assert.equal(response.status, 400);
  });
  it("Created Successfully", async () => {
    const employee: NewEmployee = {
      companyName: "companyName",
      employeeNo: "1",
      givenName: "test1",
      familyName: "test2",
      gender: "test3",
      division: "test4",
    };
    const response = await request(app.callback())
      .post(NEW_EMPLOYEE_ENDPOINT)
      .auth(username, password)
      .send({ employee });
    assert.equal(response.status, 201);

    const payload = response.body as Employee;
    assert.isObject(payload, "Payload should be an object");
    assert.equal(payload.employeeNo, "1");
    assert.equal(payload.givenName, "test1");
    assert.equal(payload.familyName, "test2");
    assert.equal(payload.gender, "test3");
    assert.equal(payload.division, "test4");
  });
});

describe("/admin/employees/employNo/credential-offer endpoint test", () => {
  beforeEach(async () => {
    await store.destroyDb();
    await store.createDb();

    const employee: NewEmployee = {
      companyName: "companyName",
      employeeNo: "1",
      givenName: "test1",
      familyName: "test2",
      gender: "test3",
      division: "test4",
    };
    await request(app.callback())
      .post(NEW_EMPLOYEE_ENDPOINT)
      .auth(username, password)
      .send({ employee });
  });
  const endpoint = (employeeNo: string) =>
    `/admin/employees/${employeeNo}/credential-offer`;
  it("Unauthorized request", async () => {
    const response = await request(app.callback()).post(endpoint("1"));
    assert.equal(response.status, 401);
  });
  it("Not Found Request", async () => {
    const response = await request(app.callback())
      .post(endpoint("-1"))
      .auth(username, password);
    assert.equal(response.status, 404);
  });
  it("Created Successfully", async () => {
    const response = await request(app.callback())
      .post(endpoint("1"))
      .auth(username, password);
    assert.equal(response.status, 201);

    const payload = response.body as GenerateCredentialOfferResult;
    assert.isObject(payload, "Payload should be an object");
    const { credentialOffer: credentialOfferUrl, userPin } = payload;
    const credentialOffer = url2CredentialOffer(credentialOfferUrl);
    assert.equal(
      credentialOffer.credential_issuer,
      process.env.CREDENTIAL_ISSUER || "",
    );
    assert.equal(credentialOffer.credentials.length, 1);
    assert.equal(
      credentialOffer.credentials[0],
      "EmployeeIdentificationCredential",
    );

    const grant =
      credentialOffer.grants[
        "urn:ietf:params:oauth:grant-type:pre-authorized_code"
      ];
    assert.isString(grant["pre-authorized_code"]);
    assert.isTrue(grant.user_pin_required);

    assert.equal(8, userPin.length);
    assert.match(userPin, /^[0-9]+$/);
  });
});
