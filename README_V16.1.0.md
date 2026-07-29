# Baccarat Platform Studio v16.1.0

本版本以 `BaccaratAnalyzer_v15_0_actual_build(2).zip` 為基礎直接升級，保留原有錄牌、場館、牌靴管理與 Supabase 雲端資料功能。

## 本版新增

- Supabase Auth（Supabase 身分驗證）登入與登出
- Admin（管理員）與 Recorder（記錄員）角色基礎
- 右上角顯示登入者名稱與中文角色
- 記錄員隱藏「牌靴管理」功能
- 未登入時無法進入錄牌畫面
- 登入頁不提供自行註冊
- 版本顯示更新為 v16.1.0

## 安裝步驟

1. 先備份目前仍可使用的 v15 網站資料夾。
2. 到 Supabase 的 SQL Editor（SQL 編輯器）。
3. 完整執行 `sql/v16_1_0_auth_roles.sql`。
4. 將 SQL 最下方被註解的管理員更新指令複製出來，把 Email 改成你的登入 Email，移除前面的 `--` 後執行。
5. 將本資料夾中的網站檔案部署到原網站位置。
6. 瀏覽器重新整理；若仍顯示舊版，使用 `Ctrl + F5` 強制重新整理。

## 管理員設定範例

```sql
update public.profiles
set role='admin',
    display_name='孟樺',
    is_active=true,
    updated_at=now()
where email='你的登入Email';
```

## 成功判斷

登入後應看到：

- 左上角：`v16.1.0｜多人登入與權限基礎`
- 右上角：顯示名稱及「管理員」或「記錄員」
- 管理員可看到「牌靴管理」
- 記錄員看不到「牌靴管理」

## 版本邊界

v16.1.0 只完成登入與角色顯示基礎。新增記錄員、重設密碼、停用或啟用帳號屬於 v16.1.1。
