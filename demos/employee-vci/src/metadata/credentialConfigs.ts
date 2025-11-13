/**
 * EmployeeIdentificationCredentialの設定
 */
export const employeeCredentialConfig = {
  format: "dc+sd-jwt" as const,
  scope: "EmployeeIdentification",
  cryptographic_binding_methods_supported: ["jwk"],
  credential_signing_alg_values_supported: ["ES256K"],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: ["ES256", "ES256K"],
    },
  },
  display: [
    {
      name: "社員証",
      locale: "ja-JP",
      logo: {
        uri: "", // 動的に設定される
        alt_text: "社員証のロゴ",
      },
      background_color: "#003289",
      background_image: {
        uri: "", // 動的に設定される
      },
      text_color: "#FFFFFF",
    },
    {
      name: "Employee Identification Credential",
      locale: "en-US",
      logo: {
        uri: "", // 動的に設定される
        alt_text: "a square logo of a Employee Identification Credential",
      },
      background_color: "#003289",
      background_image: {
        uri: "", // 動的に設定される
      },
      text_color: "#FFFFFF",
    },
  ],
  vct: "EmployeeIdentificationCredential",
  credential_metadata: {
    companyName: {
      display: [
        { name: "会社名", locale: "ja-JP" },
        { name: "Company Name", locale: "en-US" },
      ],
    },
    employeeNo: {
      display: [
        { name: "社員番号", locale: "ja-JP" },
        { name: "Employee Number", locale: "en-US" },
      ],
    },
    givenName: {
      display: [
        { name: "名", locale: "ja-JP" },
        { name: "First Name", locale: "en-US" },
      ],
    },
    familyName: {
      display: [
        { name: "姓", locale: "ja-JP" },
        { name: "Last Name", locale: "en-US" },
      ],
    },
    gender: {
      display: [
        { name: "性別情報", locale: "ja-JP" },
        { name: "Gender", locale: "en-US" },
      ],
    },
    division: {
      display: [
        { name: "部署", locale: "ja-JP" },
        { name: "Division", locale: "en-US" },
      ],
    },
  },
};

/**
 * 将来的に他のクレデンシャルを追加する場合はここに定義
 *
 * export const universityDegreeConfig = { ... };
 */
