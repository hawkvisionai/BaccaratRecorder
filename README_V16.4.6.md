# Baccarat Platform Studio v16.4.6

## 修正內容

- 修正莊家補牌規則驗證。
- 明確支援四種合法牌數布局：2-2、3-2、2-3、3-3。
- 沒有補牌時，第三張必須回傳 `null`，不再假設一定有六張牌。
- Natural 天牌局禁止辨識出第三張。
- 閒、莊應補或不應補第三張時，回傳更明確的錯誤原因。
- 保留既有網頁內建相機、手機取景框、AI/手動模式與完成牌靴清理流程。

## 部署

GitHub 覆蓋：
- `index.html`
- `app.js`
- `style.css`

Supabase 重新部署：
- `supabase/functions/analyze-capture/index.ts`

不需重新執行 SQL，也不需重新設定 OpenAI API Key。
