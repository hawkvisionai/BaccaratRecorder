# Baccarat Platform Studio v16.2.1

## 實際記錄時長

牌靴的記錄時長改為：

`第一局成功寫入時間 → 完成牌靴時間`

不再把建立牌靴後尚未開始輸入的等待時間計入。

## 部署

1. 在 Supabase SQL Editor（SQL 編輯器）執行：
   `sql/v16_2_1_recording_duration.sql`
2. 覆蓋 GitHub Pages：
   - `index.html`
   - `app.js`
3. `script.js` 與 `style.css` 本次沒有修改，不必覆蓋。
4. 重新整理網站並測試一副新牌靴。

## 顯示規則

- 有第一局且已完成：顯示實際「記錄時長」。
- 已建立但沒有牌局：顯示「尚未開始記錄」。
- 舊牌靴：以最早一局的 `created_at` 自動回填開始時間。
