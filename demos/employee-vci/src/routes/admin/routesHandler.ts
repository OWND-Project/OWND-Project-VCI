import Koa from "koa";

import { Result } from "ownd-vci/dist/types.js";
import {
  handleNotSuccessResult,
  NotSuccessResult,
} from "ownd-vci-common/dist/routes/common.js";
import {
  generateRandomNumericString,
  generateRandomString,
} from "ownd-vci/dist/utils/randomStringUtils.js";
import { generatePreAuthCredentialOffer } from "ownd-vci/dist/oid4vci/CredentialOffer.js";

import store, { NewEmployee } from "../../store.js";

export async function handleNewEmployee(ctx: Koa.Context) {
  if (!ctx.request.body) {
    ctx.body = { status: "error", message: "Invalid data received!" };
    ctx.status = 400;
    return;
  }
  const employee = ctx.request.body.employee;

  const result = await registerEmployee(employee);
  if (result.ok) {
    // Check if request is from HTML form (has Accept header for html)
    const acceptsHtml = ctx.request.headers.accept?.includes("text/html");
    if (acceptsHtml) {
      ctx.redirect("/admin/employees");
    } else {
      ctx.body = result.payload;
      ctx.status = 201;
    }
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

export async function handleEmployeeCredentialOffer(ctx: Koa.Context) {
  const { employeeNo } = ctx.params;
  const result = await credentialOfferForEmployee(employeeNo);
  if (result.ok) {
    ctx.body = result.payload;
    ctx.status = 201;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

const registerEmployee = async (
  payload: any,
): Promise<Result<NewEmployee, NotSuccessResult>> => {
  try {
    if (typeof payload !== "object" || !payload) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const { companyName, employeeNo, division, givenName, familyName, gender } =
      payload;

    if (
      typeof companyName !== "string" ||
      typeof employeeNo !== "string" ||
      typeof division !== "string" ||
      typeof givenName !== "string" ||
      typeof familyName !== "string" ||
      typeof gender !== "string"
    ) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const newEmployee: NewEmployee = {
      companyName,
      employeeNo,
      division,
      givenName,
      familyName,
      gender,
    };

    // Execute store.registerEmployee
    await store.registerEmployee(newEmployee);

    return { ok: true, payload: newEmployee };
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      return {
        ok: false,
        error: { type: "INTERNAL_ERROR", message: e.message },
      };
    } else {
      return { ok: false, error: { type: "INTERNAL_ERROR", message: "" } };
    }
  }
};

export type GenerateCredentialOfferResult = {
  subject: any;
  credentialOffer: string;
  txCode: string;
};

const credentialOfferForEmployee = async (
  employeeNo: string,
): Promise<Result<GenerateCredentialOfferResult, NotSuccessResult>> => {
  // get employee
  const employee = await store.getEmployeeByNo(employeeNo);
  if (!employee) {
    return { ok: false, error: { type: "NOT_FOUND" } };
  }

  // generate pre-auth code
  const code = generateRandomString();
  const expiresIn = Number(process.env.VCI_PRE_AUTH_CODE_EXPIRES_IN || "86400");
  const txCode = generateRandomNumericString();
  await store.addPreAuthCode(code, expiresIn, txCode, String(employee.id));

  const credentialOfferUrl = generatePreAuthCredentialOffer(
    process.env.CREDENTIAL_ISSUER || "",
    ["EmployeeIdentificationCredential"],
    code,
    {},
  );

  const payload = {
    subject: { employeeNo },
    credentialOffer: credentialOfferUrl,
    txCode: txCode,
  };
  return { ok: true, payload };
};

// Employee Management UI Handlers
export async function handleEmployeesList(ctx: Koa.Context) {
  try {
    const employees = await store.getAllEmployees();
    await ctx.render("admin/employees", {
      title: "社員一覧",
      employees,
    });
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { error: "Failed to load employees" };
  }
}

export async function handleEmployeeNewForm(ctx: Koa.Context) {
  await ctx.render("admin/employee-new", {
    title: "社員登録",
  });
}

export async function handleEmployeeEditForm(ctx: Koa.Context) {
  try {
    const { id } = ctx.params;
    const employee = await store.getEmployeeById(Number(id));
    if (!employee) {
      ctx.status = 404;
      ctx.body = { error: "Employee not found" };
      return;
    }
    await ctx.render("admin/employee-edit", {
      title: "社員編集",
      employee,
    });
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { error: "Failed to load employee" };
  }
}

export async function handleEmployeeUpdate(ctx: Koa.Context) {
  try {
    const { id } = ctx.params;
    const employee = ctx.request.body.employee;

    if (!employee) {
      ctx.status = 400;
      ctx.body = { error: "Invalid data received" };
      return;
    }

    await store.updateEmployee(Number(id), employee);
    ctx.redirect("/admin/employees");
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { error: "Failed to update employee" };
  }
}

export async function handleEmployeeDelete(ctx: Koa.Context) {
  try {
    const { id } = ctx.params;
    await store.deleteEmployee(Number(id));
    ctx.status = 204;
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { error: "Failed to delete employee" };
  }
}

export default {
  handleNewEmployee,
  handleEmployeeCredentialOffer,
  handleEmployeesList,
  handleEmployeeNewForm,
  handleEmployeeEditForm,
  handleEmployeeUpdate,
  handleEmployeeDelete,
};
