# HawkVision Record Studio v16.9

## 更新內容
- 加入 HawkVision 2 秒品牌開場與鷹眼閃爍。
- Logo 精準轉場至登入後左上角品牌位置。
- Header、登入頁、Favicon、手機圖示全面品牌化。
- 登入後左上角持續顯示 Logo、HawkVision 與標語。
- 人員管理新增「刪除人員」。
- 為保留歷史資料歸屬，只有沒有任何牌靴與牌局紀錄的記錄員才能永久刪除。
- 已有歷史紀錄的人員請使用「停用」。

## 必要部署
除了上傳 GitHub 網頁檔案，還必須重新部署：
`supabase/functions/manage-users/index.ts`

否則前端會出現「不支援的操作」，無法執行刪除。
