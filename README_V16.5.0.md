# Baccarat Platform Studio v16.5.0

## 核心重構
- DreamGaming 固定 ROI：前端將取景框內照片依 P1/P2/P3/B1/B2/B3 固定位置裁切並合成標示圖。
- 單次 AI 請求：同時提供完整開牌區（低解析度）與 ROI 合成圖（高解析度），兼顧位置與牌值辨識。
- 部分辨識可用：單一牌位失敗時不再整局報錯，會填入已辨識牌面並要求人工補正。
- 後端規則引擎：Natural、閒補牌、莊補牌、2-2/3-2/2-3/3-3 與最終點數交叉驗證。
- 診斷資料：後端回傳缺失牌位、低信心牌位、規則與點數驗證狀態，方便後續除錯。

## 部署
1. GitHub 覆蓋 `index.html`、`app.js`、`style.css`。
2. 重新部署 `supabase/functions/analyze-capture/index.ts`。
3. 不需重新執行 SQL，也不需重設 `OPENAI_API_KEY`。
