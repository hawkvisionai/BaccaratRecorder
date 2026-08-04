# Baccarat Platform Studio v16.4.4

- AI 照片改為前端固定版型裁切：全圖、計分區、牌桌區與六個牌位分別送出。
- 後端逐格辨識並以畫面點數、百家樂補牌規則交叉驗證。
- 起手牌、點數或補牌規則不一致時拒絕帶入，要求重新拍照。
- 手機拍照確認後立即開始辨識，不增加「使用照片」按鈕。
- 完成牌靴後清除上一局照片、六個牌位、點數、勝負與暫存狀態；保留當下手動／AI 模式。

## 部署
1. 覆蓋 GitHub：index.html、app.js、style.css。
2. 重新部署 Supabase Edge Function：supabase/functions/analyze-capture/index.ts。
3. 不需重新執行 SQL，不需重設 OPENAI_API_KEY。
