# v16.1.1 帳號登入與人員管理修正版

## 目的
- 管理員仍可使用原本 Email 登入。
- 新記錄員只需輸入自訂帳號與密碼。
- 管理員建立記錄員時不必填真實 Email。
- 系統內部自動建立 `帳號@baccarat.local`，使用者不會看到。

## 安裝順序
1. Supabase SQL Editor 執行 `sql/v16_1_1_username_patch.sql`。
2. Supabase Edge Functions 網頁編輯器建立 `manage-users`。
3. 用本專案的 `supabase/functions/manage-users/index.ts` 覆蓋函式內容並部署。
4. 將 `index.html`、`app.js`、`script.js`、`style.css` 上傳 GitHub。
5. 等 GitHub Pages 完成部署後重新登入測試。

## 帳號格式
3～30 碼，只能使用小寫英文、數字、`.`、`_`、`-`。
