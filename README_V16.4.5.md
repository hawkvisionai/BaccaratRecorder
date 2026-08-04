# Baccarat Platform Studio v16.4.5

- AI 拍照改用網頁內建相機，不再經過 iOS/Android 的「使用照片」確認頁。
- 相機畫面加入固定開牌框；只擷取框內內容送辨識。
- 記錄員須將上方閒／VS／莊與當局牌面完整對準綠色框。
- 拍下後立即關閉相機並開始 AI 辨識。
- 完成牌靴或切回手動時會關閉相機、清除照片與本局暫存，並保留目前記錄模式。
- 需重新部署 analyze-capture Edge Function，前端需覆蓋 index.html、app.js、style.css。
