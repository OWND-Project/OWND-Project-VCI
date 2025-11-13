# 社員管理機能 設計ドキュメント

## 概要
employee-vci に社員管理のWeb UI を追加する。
シンプルな実装で、検索・ソート機能は含まない。

---

## 技術スタック

### フロントエンド
- **テンプレートエンジン**: EJS（既存の @ladjs/koa-views を使用）
- **スタイル**: シンプルなHTML/CSS（外部ライブラリなし）
- **JavaScript**: 最小限のvanilla JS（フォーム送信、削除確認など）

### バックエンド
- **認証**: koa-basic-auth（既存の実装を使用）
- **ルーティング**: koa-router
- **既存API**: 一部は既存のAPIエンドポイントを活用

---

## 画面一覧

### 1. 社員一覧画面
**URL**: `GET /admin/employees`

**表示内容**:
- 社員の一覧をテーブル形式で表示
- 表示項目:
  - 社員番号 (employeeNo)
  - 氏名 (familyName + givenName)
  - 会社名 (companyName)
  - 部署 (division)
  - 性別 (gender)
  - アクション（編集・削除ボタン）

**機能**:
- 「新規登録」ボタン → 社員登録画面へ遷移
- 各行の「編集」ボタン → 社員編集画面へ遷移
- 各行の「削除」ボタン → 確認ダイアログ → 削除実行
- Basic認証で保護

**技術詳細**:
- ルートハンドラで全社員を取得してEJSに渡す
- 削除はクライアント側JavaScriptでDELETEリクエストを送信

---

### 2. 社員登録画面
**URL**: `GET /admin/employees/new`

**表示内容**:
- 社員情報入力フォーム
- 入力項目:
  - 会社名 (companyName) - テキスト入力
  - 社員番号 (employeeNo) - テキスト入力、必須、ユニーク
  - 姓 (familyName) - テキスト入力、必須
  - 名 (givenName) - テキスト入力、必須
  - 部署 (division) - テキスト入力
  - 性別 (gender) - セレクトボックス（male/female/other）

**機能**:
- 「登録」ボタン → 既存API `POST /admin/employees/new` に送信
- 「キャンセル」ボタン → 社員一覧画面へ戻る
- バリデーションエラーの表示
- 登録成功後は社員一覧画面へリダイレクト

**技術詳細**:
- 既存API `POST /admin/employees/new` を使用
- フォームはPOSTメソッドで送信
- エラーがあった場合は同じ画面に戻り、エラーメッセージを表示

---

### 3. 社員編集画面
**URL**: `GET /admin/employees/:id/edit`

**表示内容**:
- 社員情報編集フォーム（登録画面と同じ入力項目）
- 既存の社員情報が初期値として表示される

**機能**:
- 「更新」ボタン → `PUT /admin/employees/:id` に送信
- 「キャンセル」ボタン → 社員一覧画面へ戻る
- バリデーションエラーの表示
- 更新成功後は社員一覧画面へリダイレクト

**技術詳細**:
- 新しいAPIエンドポイント `PUT /admin/employees/:id` を作成
- store.ts に更新関数を追加

---

## APIエンドポイント

### 既存のAPI（そのまま使用）
- `POST /admin/employees/new` - 社員登録（既存）

### 新規追加が必要なAPI

#### 1. 社員一覧取得
```
GET /admin/employees/list
Authorization: Basic認証
Response: 200 OK
{
  "employees": [
    {
      "id": 1,
      "companyName": "株式会社Example",
      "employeeNo": "E001",
      "givenName": "太郎",
      "familyName": "山田",
      "gender": "male",
      "division": "営業部"
    },
    ...
  ]
}
```

#### 2. 社員詳細取得
```
GET /admin/employees/:id
Authorization: Basic認証
Response: 200 OK
{
  "id": 1,
  "companyName": "株式会社Example",
  "employeeNo": "E001",
  "givenName": "太郎",
  "familyName": "山田",
  "gender": "male",
  "division": "営業部"
}
```

#### 3. 社員情報更新
```
PUT /admin/employees/:id
Authorization: Basic認証
Content-Type: application/json
{
  "employee": {
    "companyName": "株式会社Example",
    "employeeNo": "E001",
    "givenName": "太郎",
    "familyName": "山田",
    "gender": "male",
    "division": "営業部"
  }
}
Response: 200 OK
```

#### 4. 社員削除
```
DELETE /admin/employees/:id
Authorization: Basic認証
Response: 204 No Content
```

---

## データベース関数（store.ts）

### 既存の関数
- `registerEmployee(newEmployee: NewEmployee): Promise<void>` - 社員登録
- `getEmployeeByNo(employeeNo: string)` - 社員番号で取得
- `getEmployeeById(id: string | number)` - IDで取得

### 新規追加が必要な関数

#### 1. 全社員取得
```typescript
export const getAllEmployees = async (): Promise<Employee[]> => {
  const db = await store.openDb();
  const employees = await db.all<Employee[]>(
    `SELECT * FROM ${TBL_NM_EMPLOYEES} ORDER BY createdAt DESC`
  );
  return employees;
};
```

#### 2. 社員情報更新
```typescript
export const updateEmployee = async (
  id: number,
  employee: NewEmployee
): Promise<void> => {
  const db = await store.openDb();
  const sql = `
    UPDATE ${TBL_NM_EMPLOYEES}
    SET companyName = ?, employeeNo = ?, givenName = ?,
        familyName = ?, gender = ?, division = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await db.run(
    sql,
    employee.companyName,
    employee.employeeNo,
    employee.givenName,
    employee.familyName,
    employee.gender,
    employee.division,
    id
  );
};
```

#### 3. 社員削除
```typescript
export const deleteEmployee = async (id: number): Promise<void> => {
  const db = await store.openDb();
  await db.run(`DELETE FROM ${TBL_NM_EMPLOYEES} WHERE id = ?`, id);
};
```

---

## ディレクトリ構成

```
demos/employee-vci/
├── src/
│   ├── routes/
│   │   └── admin/
│   │       ├── routes.ts          # ルート定義（既存）
│   │       └── routesHandler.ts   # ハンドラ実装（既存）
│   └── store.ts                    # データベース操作（既存）
├── views/
│   ├── layout.ejs                  # 共通レイアウト（新規）
│   └── admin/
│       ├── employees.ejs           # 社員一覧（新規）
│       ├── employee-new.ejs        # 社員登録（新規）
│       └── employee-edit.ejs       # 社員編集（新規）
└── public/
    └── styles/
        └── admin.css               # 管理画面用CSS（新規）
```

---

## 画面レイアウト・デザイン

### 共通レイアウト（layout.ejs）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> - Employee VCI</title>
  <link rel="stylesheet" href="/styles/admin.css">
</head>
<body>
  <header>
    <h1>Employee VCI 管理画面</h1>
    <nav>
      <a href="/admin/employees">社員管理</a>
    </nav>
  </header>
  <main>
    <%- body %>
  </main>
  <footer>
    <p>&copy; 2025 Employee VCI</p>
  </footer>
</body>
</html>
```

### CSS スタイル（admin.css）
シンプルで読みやすいスタイル：
- レスポンシブ対応（基本的なメディアクエリ）
- テーブルのスタイリング
- ボタンのスタイリング（primary, secondary, danger）
- フォームのスタイリング
- エラーメッセージのスタイリング

---

## 実装順序

### Phase 1: 基盤構築
1. ✅ views ディレクトリ作成
2. ✅ EJS設定を app.ts に追加
3. ✅ 共通レイアウト（layout.ejs）作成
4. ✅ CSS ファイル作成

### Phase 2: 社員一覧
5. ✅ store.ts に getAllEmployees() 追加
6. ✅ routesHandler.ts に社員一覧ハンドラ追加
7. ✅ routes.ts に社員一覧ルート追加
8. ✅ employees.ejs 作成

### Phase 3: 社員登録
9. ✅ employee-new.ejs 作成
10. ✅ routesHandler.ts に登録画面表示ハンドラ追加
11. ✅ routes.ts に登録画面ルート追加
12. ✅ 既存の POST /admin/employees/new を活用

### Phase 4: 社員編集
13. ✅ store.ts に updateEmployee() 追加
14. ✅ routesHandler.ts に編集画面表示・更新ハンドラ追加
15. ✅ routes.ts に編集関連ルート追加
16. ✅ employee-edit.ejs 作成

### Phase 5: 社員削除
17. ✅ store.ts に deleteEmployee() 追加
18. ✅ routesHandler.ts に削除ハンドラ追加
19. ✅ routes.ts に削除ルート追加
20. ✅ クライアント側JavaScript追加（削除確認ダイアログ）

### Phase 6: テスト・調整
21. ✅ ローカルでの動作確認
22. ✅ バリデーションの確認
23. ✅ エラーハンドリングの確認
24. ✅ UI/UXの微調整

---

## セキュリティ考慮事項

1. **Basic認証**
   - 全ての管理画面は Basic認証で保護
   - 既存の koa-basic-auth を使用

2. **CSRF対策**
   - 現時点ではデモ用途のため省略
   - 本番利用時には koa-csrf などを導入

3. **入力値検証**
   - バックエンドで全ての入力値をバリデーション
   - XSS対策としてEJSの自動エスケープを活用

4. **SQLインジェクション対策**
   - プリペアドステートメントを使用（既存実装と同様）

---

## エラーハンドリング

### バリデーションエラー
- 必須項目が空の場合
- 社員番号が重複している場合
- 形式が不正な場合（将来的な拡張）

### データベースエラー
- 接続エラー
- クエリ実行エラー
- 制約違反エラー

### 404エラー
- 存在しない社員IDでのアクセス

---

## 今後の拡張予定（対象外）

以下は今回の実装には含めないが、将来的に追加可能な機能：

- 検索機能（社員番号、氏名での検索）
- ソート機能（各カラムでのソート）
- ページネーション（社員数が多い場合）
- 一括登録機能（CSVインポート）
- クレデンシャル発行履歴の表示
- クレデンシャル発行機能のUI統合
- ダッシュボード（統計情報の表示）
