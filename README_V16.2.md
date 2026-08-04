# Baccarat Platform Studio v16.2

## 新功能

- Dashboard（管理總覽），僅管理員可見
- 進行中牌靴、今日完成牌靴、今日記錄局數
- 累計牌靴與累計牌局
- 最近完成牌靴：顯示完成時間、總局數與記錄耗時
- 快速搜尋牌靴：可依牌靴編號、名稱或場館查找
- 最近活動：只顯示建立牌靴與完成牌靴
- Realtime（即時同步）自動更新 Dashboard

## 部署

1. 在 Supabase SQL Editor（SQL 編輯器）執行 `sql/v16_2_dashboard.sql`。
2. 將 `index.html`、`app.js`、`style.css` 覆蓋到 GitHub Pages。
3. 重新載入網站，管理員登入後會看到「管理總覽」。
