# Baccarat Platform Studio v16.7.1

此版本僅調整相機畫面上的六格參考框：

- 縮小 P1、P2、B1、B2 直向框
- 縮小 P3、B3 橫向補牌框
- 增加六格之間的間距，方便同時看見所有牌位
- 保留外層綠色牌區框
- 不修改 AI ROI 裁切、辨識、Supabase 或資料儲存邏輯
- 更新 CSS/JS 快取版本為 v16.7.1

部署時只需覆蓋：`index.html`、`style.css`、`app.js`。
不需重新部署 Edge Function，也不需執行 SQL。
