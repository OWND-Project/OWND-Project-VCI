# Employee VCI UI 要件定義

## 概要
employee-vci（社員証クレデンシャル発行サーバー）のUI機能について整理するドキュメント

**最終更新**: 2025-01-12
**実装状況**: Phase 1 完了（社員管理UI）

---

## 1. 対象ユーザー

### 1-1. 管理者（Issuer側）
- [x] 社員情報の管理を行う担当者
- [ ] クレデンシャル発行の管理・監視を行う担当者（将来実装）

### 1-2. エンドユーザー（Holder側）
- [ ] 社員証クレデンシャルを取得する社員（将来実装）
- [ ] Pre-Authorized Code を受け取ってクレデンシャルを取得（将来実装）

---

## 2. 必要な画面・機能

### 2-1. 管理者向け機能

#### 社員管理 ✅ 実装済み
- [x] 社員一覧表示
  - [x] 全社員の表示（社員番号、氏名、会社名、部署、性別）
  - [ ] 検索・フィルタリング機能（将来実装）
  - [ ] ソート機能（将来実装）
- [x] 社員登録
  - [x] 社員番号、氏名、部署、性別、会社名の入力
  - [x] 基本的なバリデーション（必須項目チェック）
- [x] 社員情報編集
  - [x] 既存データの編集フォーム
  - [x] 更新後のリダイレクト
- [x] 社員情報削除
  - [x] 確認ダイアログ付き削除
  - [x] Basic認証対応（credentials: 'include'）

#### クレデンシャル発行管理（将来実装）
- [ ] Pre-Authorized Code 発行
  - [ ] 対象社員の選択
  - [ ] TX Code（PIN）の生成・設定
  - [ ] 有効期限の設定
  - [ ] 発行されたCodeの表示（QRコード含む）
- [ ] 発行履歴の表示
  - [ ] 発行日時、対象社員、使用状態などの確認
- [ ] 発行済みCodeの管理
  - [ ] 未使用/使用済みの状態確認
  - [ ] 有効期限の確認

#### ダッシュボード（将来実装）
- [ ] 発行統計
  - [ ] 総社員数
  - [ ] 発行済みクレデンシャル数
  - [ ] 未使用Code数
- [ ] 最近のアクティビティ

### 2-2. エンドユーザー向け機能（将来実装）

#### クレデンシャル取得フロー
- [ ] Credential Offer の表示
  - [ ] 受け取るクレデンシャルの情報表示
  - [ ] OpenID4VCI URL / QRコードの表示
- [ ] TX Code（PIN）入力画面（必要な場合）
- [ ] 取得完了画面
  - [ ] 次のステップの案内（ウォレットアプリでの受け取り方法など）

---

## 3. 技術要件

### 3-1. フロントエンド技術スタック ✅ 確定
- [x] **テンプレートエンジン**: EJS (@ladjs/koa-views)
- [x] **スタイル**: シンプルなHTML/CSS（外部ライブラリなし）
  - レスポンシブ対応（基本的なメディアクエリ）
  - カスタムCSSクラス（btn, form-group, tableなど）
- [x] **JavaScript**: Vanilla JS（最小限）
  - fetch API（削除処理）
  - confirm ダイアログ

### 3-2. 既存実装との統合 ✅ 完了
- [x] EJS テンプレートエンジンの設定
- [x] 新しいルートの追加
  - GET `/admin/employees` - 社員一覧
  - GET `/admin/employees/new` - 登録フォーム表示
  - POST `/admin/employees/new` - 登録処理
  - GET `/admin/employees/:id/edit` - 編集フォーム表示
  - POST `/admin/employees/:id/update` - 更新処理
  - DELETE `/admin/employees/:id` - 削除処理
- [x] 既存APIエンドポイントの活用
  - POST `/admin/employees/new` (既存のAPI再利用)
- [x] 新規データベース関数の追加
  - `getAllEmployees()`
  - `updateEmployee(id, employee)`
  - `deleteEmployee(id)`

### 3-3. 認証・認可 ✅ 実装済み
- [x] 管理者画面へのアクセス制御
  - [x] 既存の koa-basic-auth を使用
  - [x] 全ての管理画面ルートで認証を要求
  - [x] credentials: 'include' で fetch リクエストも認証対応
- [ ] エンドユーザー向け画面の公開範囲（将来実装）

---

## 4. 画面遷移フロー

### 4-1. 管理者フロー ✅ 実装済み
```
Basic認証 → 社員一覧 (/admin/employees)
              ├─ 新規登録 (/admin/employees/new) → 登録完了 → 一覧へ
              ├─ 編集 (/admin/employees/:id/edit) → 更新完了 → 一覧へ
              └─ 削除 (確認ダイアログ) → 削除完了 → 一覧リロード
```

### 4-2. エンドユーザーフロー（将来実装）
```
Credential Offer ページ → (TX Code入力) → 完了画面
```

---

## 5. 優先順位

### Phase 1（最小限の機能）✅ 完了
- [x] 社員一覧表示（シンプルなリスト）
- [x] 社員登録フォーム
- [x] 社員編集フォーム
- [x] 社員削除機能
- [x] Basic認証による保護
- [x] レスポンシブ対応の基本CSS

### Phase 2（基本機能の拡充）- 将来実装
- [ ] 社員検索機能（社員番号、氏名）
- [ ] ソート機能（各カラム）
- [ ] ページネーション
- [ ] クレデンシャル発行機能のUI統合
- [ ] バリデーションエラーの詳細表示

### Phase 3（将来的な拡張）- 将来実装
- [ ] ダッシュボード（統計情報）
- [ ] CSVインポート/エクスポート
- [ ] エンドユーザー向けCredential Offer画面
- [ ] QRコード生成機能
- [ ] 多言語対応

---

## 6. 非機能要件

### 6-1. パフォーマンス
- [x] ページ読み込み時間: シンプルなデザインで高速
- [ ] 同時アクセス数: デモ用途のため未検証

### 6-2. セキュリティ ✅ 基本対応済み
- [ ] CSRF対策（将来実装 - koa-csrf導入予定）
- [x] XSS対策（EJSの自動エスケープ機能を使用）
- [x] 入力値のバリデーション（バックエンド側）
- [x] SQLインジェクション対策（プリペアドステートメント使用）
- [ ] HTTPS必須（本番環境で設定予定）

### 6-3. アクセシビリティ
- [x] 基本的なHTMLセマンティクス
- [ ] WAI-ARIA対応（将来実装）
- [x] キーボード操作対応（標準フォーム要素使用）

### 6-4. レスポンシブデザイン ✅ 基本対応済み
- [x] モバイル対応（基本的なメディアクエリ）
- [x] タブレット対応
- [x] max-width: 768px でのレイアウト調整

---

## 7. その他検討事項

### 7-1. 多言語対応
- [x] 日本語（現在のUI言語）
- [ ] 英語（将来実装）
- [ ] その他の言語（将来実装）

### 7-2. テーマ・ブランディング ✅ 基本実装済み
- [x] カラーテーマ（#003289 - ブルー系）
- [ ] 会社ロゴの表示（将来実装）
- [ ] カスタマイズ可能なテーマ（将来実装）
- [ ] ダークモード対応（将来実装）

### 7-3. 通知機能
- [ ] クレデンシャル発行完了通知（将来実装）
- [x] エラー通知（alert ダイアログで実装）

---

## 8. 実装済みファイル構成

### 8-1. ビューテンプレート (views/)
- `views/layout.ejs` - 共通レイアウト
- `views/admin/employees.ejs` - 社員一覧
- `views/admin/employee-new.ejs` - 社員登録フォーム
- `views/admin/employee-edit.ejs` - 社員編集フォーム

### 8-2. スタイルシート (public/)
- `public/styles/admin.css` - 管理画面用CSS

### 8-3. バックエンド (src/)
- `src/app.ts` - EJS設定追加
- `src/store.ts` - データベース関数追加
  - `getAllEmployees()`
  - `updateEmployee(id, employee)`
  - `deleteEmployee(id)`
- `src/routes/admin/routes.ts` - ルート定義追加
- `src/routes/admin/routesHandler.ts` - ハンドラ実装
  - `handleEmployeesList()`
  - `handleEmployeeNewForm()`
  - `handleEmployeeEditForm()`
  - `handleEmployeeUpdate()`
  - `handleEmployeeDelete()`

### 8-4. APIエンドポイント

#### 実装済み
- `GET /admin/employees` - 社員一覧表示
- `GET /admin/employees/new` - 登録フォーム表示
- `POST /admin/employees/new` - 社員登録処理（既存API再利用、HTML対応追加）
- `GET /admin/employees/:id/edit` - 編集フォーム表示
- `POST /admin/employees/:id/update` - 社員更新処理
- `DELETE /admin/employees/:id` - 社員削除処理

#### 既存（変更なし）
- `GET /.well-known/openid-credential-issuer` - Issuer Metadata
- `GET /.well-known/oauth-authorization-server` - Authorization Server Metadata
- `POST /token` - Token Endpoint
- `POST /credentials` - Credential Endpoint
- `POST /admin/employees/:employeeNo/credential-offer` - Credential Offer生成

---

## 9. 質問・未決定事項（回答済み）

1. **管理者UIとエンドユーザーUIのどちらを優先しますか？**
   - **回答**: 管理者UI（社員管理）を優先 ✅

2. **既存のEJSテンプレートを使い続けますか、それとも別のフレームワークを導入しますか？**
   - **回答**: 既存のEJSテンプレートを使用（一番簡単な方法） ✅

3. **QRコード表示機能は必要ですか？**
   - **回答**: Phase 1では不要、将来実装予定

4. **Credential Offerの配布方法は？（メール、Webページ、など）**
   - **回答**: Phase 1では未実装、将来検討

5. **既存のBasic認証を使い続けますか、それとも別の認証方式を導入しますか？**
   - **回答**: 既存のBasic認証を使用 ✅

6. **デモ用途ですか、それとも本番利用を想定していますか？**
   - **回答**: デモ用途

---

## 10. アクセス情報

### 開発環境
- **URL**: http://localhost:3001/admin/employees
- **認証**: Basic認証
  - ユーザー名: `.env` の `BASIC_AUTH_USERNAME` で設定
  - パスワード: `.env` の `BASIC_AUTH_PASSWORD` で設定
- **データベース**: SQLite (`./database.sqlite`)

### 環境変数設定 (.env)
```
DATABASE_FILEPATH=./database.sqlite
APP_PORT=3001
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=password
CREDENTIAL_ISSUER_IDENTIFIER=http://localhost:3001
CREDENTIAL_ISSUER=http://localhost:3001
```

---

## 11. 次のステップ

### 完了済み
- [x] Phase 1 の機能実装
- [x] 技術スタックの決定
- [x] 基本的なUI/UX実装
- [x] ローカルでの動作確認

### 今後の予定（Phase 2以降）
- [ ] 検索・フィルタリング機能の実装
- [ ] ソート機能の実装
- [ ] ページネーションの実装
- [ ] クレデンシャル発行UIの統合
- [ ] エンドユーザー向け画面の実装
- [ ] CSRF対策の追加
- [ ] より詳細なバリデーション
- [ ] エラーハンドリングの改善
- [ ] 多言語対応
- [ ] 本番環境への展開準備

---

## 12. 参考ドキュメント

- [EMPLOYEE_MANAGEMENT_DESIGN.md](./EMPLOYEE_MANAGEMENT_DESIGN.md) - 詳細な技術設計ドキュメント
- [OID4VCI 1.0 Specification](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [HAIP draft-04](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0-04.html)
