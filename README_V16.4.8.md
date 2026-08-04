# Baccarat Platform Studio v16.4.8

- 修正 iPhone Safari 顯示「缺少辨識合成圖」：前端不再建立六格 Canvas 合成圖。
- 手機拍照後直接上傳取景框內 JPEG 至 `analyze-capture`。
- 後端依 DDN 固定版型辨識閒／莊上排兩張與下排第三張。
- 保留 2-2、3-2、2-3、3-3、Natural 與完整百家樂補牌規則驗證。
- 保留拍照後立即辨識、下一局清除暫存、完成牌靴後保留記錄模式。

## 部署
1. GitHub 覆蓋 `index.html`、`app.js`、`style.css`。
2. Supabase 重新部署 `supabase/functions/analyze-capture/index.ts`。
3. SQL 與 Secrets 不需重做。
