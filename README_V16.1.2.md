# Baccarat Platform Studio v16.1.2｜多人牌靴鎖定

## 本版完成
- 每位記錄員只載入並操作自己的進行中牌靴。
- 新牌靴由資料庫原子化產生唯一編號，避免多人同時建立時撞號。
- 一位人員同時只能有一副進行中牌靴。
- 牌局寫入會檢查牌靴負責人；其他記錄員無法修改。
- 「完成牌靴」後立即鎖定，不能再新增或刪除牌局。
- 管理員的牌靴管理會顯示負責人。
- 保留全部既有歷史資料與 v16.1.1 人員管理。

## 升級順序
1. 在 Supabase SQL Editor 執行 `sql/v16_1_2_multi_user_shoe_locking.sql`。
2. 將根目錄 `index.html`、`app.js`、`script.js`、`style.css` 上傳到 GitHub 並 Commit。
3. 等 GitHub Pages 部署後按 Ctrl+F5。
4. 以管理員與記錄員分別建立牌靴，確認兩人看到不同的「目前牌靴」。

## 注意
- 不需要修改或重新部署 `manage-users` Edge Function。
- v16.1.2 先完成資料歸屬與鎖定；即時畫面更新會在 v16.1.3 完成。
