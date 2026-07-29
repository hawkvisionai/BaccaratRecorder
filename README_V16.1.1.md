# Baccarat Platform Studio v16.1.1｜人員管理

## 新增功能

- 管理員專用「人員管理」按鈕
- 建立 Recorder（記錄員）帳號
- 查看所有人員
- 重設記錄員密碼
- 停用／啟用記錄員
- 記錄員看不到人員管理入口

## 安裝順序

1. 在 Supabase SQL Editor 執行 `sql/v16_1_1_user_management.sql`。
2. 在 Supabase Dashboard 建立 Edge Function（邊緣函式）`manage-users`。
3. 將 `supabase/functions/manage-users/index.ts` 的內容貼入並 Deploy（部署）。
4. 將網站根目錄檔案上傳 GitHub，Commit 後等待 GitHub Pages 重新部署。
5. 管理員重新登入，右上角會出現「人員管理」。

## 安全設計

瀏覽器內沒有 Service Role Key（服務角色金鑰）。建立帳號、重設密碼與停用帳號都由 Supabase Edge Function 驗證管理員身分後執行。
