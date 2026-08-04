# Baccarat Platform Studio v16.1.3｜多人即時同步

## 本版完成

- `shoes`（牌靴）、`games`（牌局）、`profiles`（人員）即時訂閱。
- 其他裝置寫入資料後，畫面會自動重新讀取最新內容。
- 管理員開啟牌靴管理或人員管理時，清單會隨資料變更自動整理。
- 連線狀態顯示：連線中、即時連線、重新連線中、已離線。
- 網路恢復時自動重新建立 Realtime（即時同步）連線。
- 保留 v16.1.2 的牌靴歸屬、完成鎖定與 RLS 安全規則。

## 安裝順序

1. 在 Supabase SQL Editor 執行 `sql/v16_1_3_realtime_sync.sql`。
2. 將 `index.html`、`app.js`、`script.js`、`style.css` 覆蓋到 GitHub。
3. GitHub Pages 部署完成後按 `Ctrl + F5` 強制重新整理。
4. 用兩個瀏覽器或兩台裝置登入不同帳號，分別建立/記錄牌靴，確認管理員畫面自動更新。

## 注意

依照 v16.1.2 的安全設計，記錄員只會收到自己有權讀取的資料；管理員可在牌靴管理中查看所有牌靴。Realtime 不會繞過 RLS（資料列層級安全）。
