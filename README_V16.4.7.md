# Baccarat Platform Studio v16.4.7

本版重點：

- 固定六格裁切後合成為單一辨識圖，避免第三張位置被模型重新排列。
- 移除模型 layout 與固定格結果不一致時的錯誤判斷；牌數直接依六個固定格決定。
- 前端先縮圖與 JPEG 壓縮，只上傳一張合成圖。
- 一次 OpenAI 影像請求完成六張牌與點數辨識，減少 API 往返與等待時間。
- 百家樂 Natural、閒補牌與莊補牌規則仍由後端程式驗證。
- 支援 2-2、3-2、2-3、3-3 四種牌數。

部署：

1. GitHub 覆蓋 `index.html`、`app.js`、`style.css`。
2. 重新部署 `supabase/functions/analyze-capture/index.ts`。
3. 不需要重新執行 SQL，也不需要重設 API Key。
