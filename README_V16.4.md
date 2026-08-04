# Baccarat Platform Studio v16.4

## 新增
- 完整記錄可切換「手動 / AI 辨識」
- AI 辨識只允許獲授權的記錄員使用；管理員預設可用
- 人員管理以綠燈/紅燈顯示 AI 權限
- 拍照後自動填入固定六個牌位，第三張永遠可點選新增、修改或清除
- 照片只在瀏覽器記憶體暫存，牌局儲存成功後清除
- 只記勝方模式完全不變

## 部署
1. 執行 `sql/v16_4_ai_capture.sql`。
2. 重新部署 `manage-users` Edge Function。
3. 部署新的 `analyze-capture` Edge Function。
4. Edge Function Secrets 設定：`OPENAI_API_KEY`。可選：`AI_VISION_MODEL`。
5. 覆蓋 GitHub Pages 的 `index.html`、`app.js`、`style.css`。

## 注意
- HTML 的 `capture=environment` 會要求行動瀏覽器優先開啟後鏡頭，但是否完全禁止相簿由手機作業系統決定，純網頁無法百分之百強制。
- 照片不寫入 Supabase Storage。它會短暫傳送至影像模型進行辨識；請確認所使用 AI 供應商的資料保留設定。
- AI 辨識必須經人工核對後，按「下一局」才會寫入正式牌局資料。
