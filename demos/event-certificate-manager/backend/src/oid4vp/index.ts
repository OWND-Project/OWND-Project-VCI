export const VC_FORMAT_ALG = ["ES256"];

export const VC_FORMAT_VC_SD_JWT = {
  "vc+sd-jwt": {
    alg: VC_FORMAT_ALG,
  },
};

export const VC_FORMAT_JWT_VC = {
  jwt_vc: {
    alg: VC_FORMAT_ALG,
  },
};

export const VC_FORMAT_JWT_VC_JSON = {
  jwt_vc_json: {
    alg: VC_FORMAT_ALG,
  },
};

const toSnakeCase = (key: string): string =>
  key.replace(/([A-Z])/g, "_$1").toLowerCase();

export const camelToSnake = (obj: {
  [key: string]: any;
}): {
  [key: string]: any;
} => {
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = toSnakeCase(key);
      newObj[newKey] = obj[key];
    }
  }
  return newObj;
};

const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
};

export const snakeToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => snakeToCamel(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      result[toCamelCase(key)] = snakeToCamel(obj[key]);
      return result;
    }, {} as { [key: string]: any });
  }
  return obj;
};
