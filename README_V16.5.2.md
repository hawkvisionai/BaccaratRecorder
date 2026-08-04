# Baccarat Platform Studio v16.5.2

## 本版重點

- AI 僅預填，不再直接視為已確認資料。
- 六個牌位都必須逐格人工確認後，「下一局」才可使用。
- 空白第三張也必須點選「確認無第三張」。
- 未確認牌位顯示橘色，確認後變綠色。
- 辨識改為兩階段：第一次辨識後，若有缺牌、低信心、規則或點數衝突，後端會自動進行第二次針對性校正。
- 預設影像模型改為 `gpt-4o`；若 Supabase Secret 有設定 `AI_VISION_MODEL`，仍以該值為準。
- 保留完整百家樂補牌規則與上方點數交叉驗證。

## 部署

GitHub 覆蓋：
- `index.html`
- `app.js`
- `style.css`

Supabase Edge Function 重新部署：
- `supabase/functions/analyze-capture/index.ts`

SQL、OpenAI API Key 與其他 Secret 不需重做。
