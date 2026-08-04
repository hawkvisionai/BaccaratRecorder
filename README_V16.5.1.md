# Baccarat Platform Studio v16.5.1

修正 iPhone Safari 偶發未產生或未送出六格 ROI 圖時，後端直接回報「缺少六格辨識圖」的問題。

- 前端會驗證 ROI 圖；建立失敗時自動改用完整開牌區辨識。
- 後端接受 ROI 圖為可選，不會因缺少 ROI 圖直接中止。
- 有 ROI 圖時仍優先使用固定六格辨識。
- 回傳 diagnostics.roi_sheet_received 供除錯。
