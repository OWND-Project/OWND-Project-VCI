# メタデータ生成のシンプル設計

## 設計方針

- **src/**: 汎用的なインターフェースとユーティリティのみ
- **demos/employee-vci/**: 具体的なメタデータ定義とリポジトリ実装
- **切り替え**: Factoryパターンなし。必要時に実装を直接書き換え

---

## ディレクトリ構成

```
src/
  metadata/
    IMetadataRepository.ts          # インターフェース定義のみ（汎用）
  utils/
    localize.ts                     # ローカライゼーション（汎用）

demos/
  employee-vci/
    src/
      metadata/
        MetadataRepository.ts       # 具体的な実装（employee-vci固有）
        credentialConfigs.ts        # クレデンシャル設定（employee-vci固有）
      routes/
        vci/
          routes.ts
```

---

## 実装例

### 1. 汎用インターフェース（src/）

```typescript
// src/metadata/IMetadataRepository.ts
import { IssuerMetadata } from '../oid4vci/types/protocol.types.js';

/**
 * メタデータリポジトリのインターフェース
 * 各デモアプリケーションで実装する
 */
export interface IMetadataRepository {
  /**
   * Issuer Metadataを取得
   * @returns IssuerMetadata
   */
  getIssuerMetadata(): Promise<IssuerMetadata>;
}
```

---

### 2. employee-vci固有の実装（demos/employee-vci/）

#### 2-1. クレデンシャル設定定義

```typescript
// demos/employee-vci/src/metadata/credentialConfigs.ts

/**
 * EmployeeIdentificationCredentialの設定
 */
export const employeeCredentialConfig = {
  format: 'dc+sd-jwt' as const,
  scope: 'EmployeeIdentificationCredential',
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: ['ES256'],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: ['ES256'],
    },
  },
  vct: 'EmployeeIdentificationCredential',
  claims: {
    companyName: {
      display: [
        { name: '会社名', locale: 'ja-JP' },
        { name: 'Company Name', locale: 'en-US' },
      ],
    },
    employeeNo: {
      display: [
        { name: '社員番号', locale: 'ja-JP' },
        { name: 'Employee Number', locale: 'en-US' },
      ],
    },
    division: {
      display: [
        { name: '部署', locale: 'ja-JP' },
        { name: 'Division', locale: 'en-US' },
      ],
    },
    givenName: {
      display: [
        { name: '名', locale: 'ja-JP' },
        { name: 'First Name', locale: 'en-US' },
      ],
    },
    familyName: {
      display: [
        { name: '姓', locale: 'ja-JP' },
        { name: 'Last Name', locale: 'en-US' },
      ],
    },
    gender: {
      display: [
        { name: '性別情報', locale: 'ja-JP' },
        { name: 'Gender', locale: 'en-US' },
      ],
    },
  },
};

/**
 * 将来的に他のクレデンシャルを追加する場合はここに定義
 *
 * export const universityDegreeConfig = { ... };
 */
```

#### 2-2. リポジトリ実装

```typescript
// demos/employee-vci/src/metadata/MetadataRepository.ts
import { IMetadataRepository } from 'ownd-vci/dist/metadata/IMetadataRepository.js';
import { IssuerMetadata } from 'ownd-vci/dist/oid4vci/types/protocol.types.js';
import { employeeCredentialConfig } from './credentialConfigs.js';

/**
 * Employee-VCI固有のメタデータリポジトリ実装
 *
 * Phase 1: ハードコード実装
 * Phase 2: DB実装に切り替え（将来）
 */
export class MetadataRepository implements IMetadataRepository {
  private credentialIssuer: string;

  constructor(credentialIssuer: string) {
    this.credentialIssuer = credentialIssuer;
  }

  async getIssuerMetadata(): Promise<IssuerMetadata> {
    return {
      credential_issuer: this.credentialIssuer,
      credential_endpoint: `${this.credentialIssuer}/credentials`,
      display: this.buildDisplayInfo(),
      credential_configurations_supported: this.buildCredentialConfigurations(),
    };
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * 発行者の表示情報を構築
   */
  private buildDisplayInfo() {
    // 環境変数から取得（デフォルト値も設定）
    const companyNameJa = process.env.COMPANY_NAME_JA || '株式会社Example';
    const companyNameEn = process.env.COMPANY_NAME_EN || 'Example Inc.';
    const brandColor = process.env.BRAND_COLOR || '#003289';

    return [
      {
        name: companyNameJa,
        locale: 'ja-JP',
        logo: {
          uri: `${this.credentialIssuer}/images/company-logo.png`,
          alt_text: `${companyNameJa}のロゴ`,
        },
        background_color: brandColor,
        text_color: '#FFFFFF',
      },
      {
        name: companyNameEn,
        locale: 'en-US',
        logo: {
          uri: `${this.credentialIssuer}/images/company-logo.png`,
          alt_text: `a square logo of a ${companyNameEn}`,
        },
        background_color: brandColor,
        text_color: '#FFFFFF',
      },
    ];
  }

  /**
   * サポートするクレデンシャル設定を構築
   */
  private buildCredentialConfigurations() {
    return {
      EmployeeIdentificationCredential: employeeCredentialConfig,
      // 将来的に追加する場合:
      // UniversityDegreeCredential: universityDegreeConfig,
    };
  }

  // ========================================
  // 将来的にDB実装に切り替える場合の例
  // ========================================

  /*
  async getIssuerMetadata(): Promise<IssuerMetadata> {
    const db = await openDb();

    // issuer_metadata テーブルから取得
    const issuerInfo = await db.get(
      'SELECT * FROM issuer_metadata WHERE credential_issuer = ?',
      this.credentialIssuer
    );

    // display_info テーブルから取得
    const displays = await db.all(
      'SELECT * FROM display_info WHERE issuer_id = ? AND target_type = ?',
      [issuerInfo.id, 'issuer']
    );

    // credential_configurations テーブルから取得
    const configs = await db.all(
      'SELECT * FROM credential_configurations WHERE issuer_id = ?',
      issuerInfo.id
    );

    return {
      credential_issuer: issuerInfo.credential_issuer,
      credential_endpoint: issuerInfo.credential_endpoint,
      display: displays.map(d => ({ ... })),
      credential_configurations_supported: this.buildConfigsFromDb(configs),
    };
  }
  */
}
```

---

### 3. ルートハンドラの更新（demos/common/）

```typescript
// demos/common/src/routes/vci/routesHandler.ts
import Koa from 'koa';
import { IMetadataRepository } from 'ownd-vci/dist/metadata/IMetadataRepository.js';
import { localizeIssuerMetadata } from 'ownd-vci/dist/utils/localize.js';
import { resolveAcceptLanguage } from 'resolve-accept-language';

/**
 * Issuer Metadataを返すハンドラ
 *
 * @param ctx - Koaコンテキスト
 * @param metadataRepository - メタデータリポジトリ実装（各demoから注入）
 * @param availableLocales - 対応ロケール
 * @param defaultLocale - デフォルトロケール
 */
export async function handleIssueMetadata(
  ctx: Koa.Context,
  metadataRepository: IMetadataRepository,
  availableLocales: string[] = ['en-US', 'ja-JP'],
  defaultLocale: string = 'ja-JP',
) {
  try {
    // リポジトリから取得
    const metadata = await metadataRepository.getIssuerMetadata();

    // ローカライゼーション処理
    const needsLocalization = process.env.RESOLVE_ACCEPT_LANGUAGE === 'true';
    if (needsLocalization) {
      const acceptLanguage = ctx.request.header['accept-language'];
      if (acceptLanguage) {
        try {
          const preferredLocale = resolveAcceptLanguage(
            acceptLanguage,
            availableLocales,
            defaultLocale,
          );
          ctx.body = localizeIssuerMetadata(
            structuredClone(metadata),
            preferredLocale,
            defaultLocale,
          );
          ctx.status = 200;
          ctx.set('Content-Type', 'application/json');
          return;
        } catch (err) {
          console.log(`Unable to resolve accept-language: ${acceptLanguage}`);
        }
      }
    }

    ctx.body = metadata;
    ctx.status = 200;
    ctx.set('Content-Type', 'application/json');
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { message: 'Internal Server Error' };
  }
}

export default {
  handleIssueMetadata,
  // ... 他のハンドラ
};
```

```typescript
// demos/common/src/routes/vci/routes.ts
import Koa from 'koa';
import Router from 'koa-router';
import { koaBody } from 'koa-body';
import { IMetadataRepository } from 'ownd-vci/dist/metadata/IMetadataRepository.js';
import { TokenIssuerConfig } from 'ownd-vci/dist/oid4vci/tokenEndpoint/types.js';
import { CredentialIssuerConfig } from 'ownd-vci/dist/oid4vci/credentialEndpoint/types.js';
import { NonceIssuerConfig } from 'ownd-vci/dist/oid4vci/nonceEndpoint/types.js';
import { StoredAccessToken } from '../../store/authStore.js';
import routesHandler from './routesHandler.js';

export const setupCommonRoute = (
  router: Router<any, {}>,
  tokenConfigGenerator: () => TokenIssuerConfig,
  credentialConfigGenerator: () => CredentialIssuerConfig<StoredAccessToken>,
  nonceConfigGenerator: () => NonceIssuerConfig,
  metadataRepository: IMetadataRepository, // リポジトリを注入
  availableLocales: string[] = ['en-US', 'ja-JP'],
  defaultLocale: string = 'ja-JP',
) => {
  router.get(
    '/.well-known/openid-credential-issuer',
    async (ctx: Koa.Context) => {
      await routesHandler.handleIssueMetadata(
        ctx,
        metadataRepository, // リポジトリを渡す
        availableLocales,
        defaultLocale,
      );
    },
  );

  router.get(
    '/.well-known/oauth-authorization-server',
    async (ctx: Koa.Context) => {
      await routesHandler.handleAuthServer(ctx, dirname);
    },
  );

  router.post('/token', koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleToken(ctx, tokenConfigGenerator);
  });

  router.post('/credentials', koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleCredential(ctx, credentialConfigGenerator);
  });

  router.post('/nonce', koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleNonce(ctx, nonceConfigGenerator);
  });
};

export default {
  setupCommonRoute,
};
```

---

### 4. employee-vci側でのルート設定

```typescript
// demos/employee-vci/src/routes/vci/routes.ts
import Router from 'koa-router';
import commonVciRoutes from 'ownd-vci-common/dist/routes/vci/routes.js';
import { tokenConfigure } from '../../logic/vciConfigProvider.js';
import { configure } from '../../logic/credentialsConfigProvider.js';
import { nonceConfigure } from '../../logic/nonceConfigProvider.js';
import { MetadataRepository } from '../../metadata/MetadataRepository.js';

const init = () => {
  const router = new Router();

  // 環境変数からクレデンシャル発行者URLを取得
  const credentialIssuer = process.env.CREDENTIAL_ISSUER || 'http://localhost:3000';

  // メタデータリポジトリのインスタンス化（employee-vci固有の実装）
  const metadataRepository = new MetadataRepository(credentialIssuer);

  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    nonceConfigure,
    metadataRepository, // リポジトリを渡す
  );

  return router;
};

export default init;
```

---

## 将来的なDB実装への切り替え

### 切り替え手順

1. **テーブル設計とマイグレーション**
   ```sql
   CREATE TABLE issuer_metadata (
     id INTEGER PRIMARY KEY,
     credential_issuer TEXT NOT NULL UNIQUE,
     credential_endpoint TEXT NOT NULL
   );

   CREATE TABLE display_info (
     id INTEGER PRIMARY KEY,
     issuer_id INTEGER NOT NULL,
     locale TEXT NOT NULL,
     name TEXT NOT NULL,
     logo_uri TEXT,
     background_color TEXT,
     FOREIGN KEY (issuer_id) REFERENCES issuer_metadata(id)
   );

   CREATE TABLE credential_configurations (
     id INTEGER PRIMARY KEY,
     issuer_id INTEGER NOT NULL,
     config_id TEXT NOT NULL,
     format TEXT NOT NULL,
     vct TEXT NOT NULL,
     metadata JSONB,
     FOREIGN KEY (issuer_id) REFERENCES issuer_metadata(id)
   );
   ```

2. **MetadataRepository.tsの実装を書き換え**
   ```typescript
   // demos/employee-vci/src/metadata/MetadataRepository.ts

   // ハードコード実装をコメントアウト
   /*
   async getIssuerMetadata(): Promise<IssuerMetadata> {
     return {
       credential_issuer: this.credentialIssuer,
       ...
     };
   }
   */

   // DB実装に置き換え
   async getIssuerMetadata(): Promise<IssuerMetadata> {
     const db = await openDb();

     const issuerInfo = await db.get(
       'SELECT * FROM issuer_metadata WHERE credential_issuer = ?',
       this.credentialIssuer
     );

     // ... DB から取得して構築
   }
   ```

3. **既存データの移行**
   - 現在のハードコード値をDBにINSERT

---

## ファイル構成まとめ

```
src/
  metadata/
    IMetadataRepository.ts          # インターフェース定義（汎用）

demos/
  common/
    src/
      routes/
        vci/
          routes.ts                 # setupCommonRoute（リポジトリを受け取る）
          routesHandler.ts          # handleIssueMetadata（リポジトリを使用）

  employee-vci/
    src/
      metadata/
        MetadataRepository.ts       # 実装（employee-vci固有）
        credentialConfigs.ts        # クレデンシャル設定（employee-vci固有）
      routes/
        vci/
          routes.ts                 # リポジトリをインスタンス化して渡す
```

---

## メリット

### ✅ シンプル
- Factoryパターンなし
- 環境変数による切り替えなし
- 直接的でわかりやすい

### ✅ 責務が明確
- **src/**: 汎用的なインターフェース
- **demos/**: 具体的な実装

### ✅ 将来の拡張性
- DB実装への切り替えは`MetadataRepository.ts`を書き換えるだけ
- インターフェースは変わらないので他のコードへの影響なし

### ✅ テスト容易性
- インターフェースに対してテスト可能
- モック実装も簡単

---

## 移行タスク

### Step 1: インターフェース定義（src/）
- `src/metadata/IMetadataRepository.ts` 作成

### Step 2: employee-vci固有実装
- `demos/employee-vci/src/metadata/credentialConfigs.ts` 作成
- `demos/employee-vci/src/metadata/MetadataRepository.ts` 作成

### Step 3: commonルートハンドラ更新
- `demos/common/src/routes/vci/routesHandler.ts` 更新
- `demos/common/src/routes/vci/routes.ts` 更新

### Step 4: employee-vci側のルート設定更新
- `demos/employee-vci/src/routes/vci/routes.ts` 更新

### Step 5: 既存のJSONファイル削除
- `demos/employee-vci/metadata/dev/credential_issuer_metadata.json` 削除
- `demos/employee-vci/metadata/prod/credential_issuer_metadata.json` 削除

### Step 6: テスト
- 既存テストの実行
- 新規ユニットテスト追加

**想定工数**: 半日〜1日

---

## まとめ

- Factoryパターンなし。シンプルに。
- src/は汎用、demos/は固有という明確な分離
- DB切り替えは実装を直接書き換え
- インターフェースの統一により、将来の変更が容易
