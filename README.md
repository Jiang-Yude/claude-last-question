# 上一題提示列 last-question

Claude Code 的小外掛（Mod）。在輸入框上方固定顯示一列提示：你上一個問題、送出多久了，以及這個對話的上下文已使用多少（用一個彩色小圓圈表示）。

```
上一題（3 分鐘前・◔）：這個提示列能不能加上已使用多少？   [收起]
```

好幾個任務切來切去，回到某個對話時常常忘記上一題到底問了什麼。這一行讓你抬頭就看得到。

## 顯示什麼

| 欄位 | 說明 |
|---|---|
| 上一題 | 你最後送出的問題，換行會併成一行，超過 80 字會截斷；斜線指令（例如 `/compact`）不算 |
| 多久了 | 剛剛、N 分鐘前、N 小時 N 分前，每分鐘更新 |
| 圓圈 | 上下文已使用的比例：灰底圓餅，從 12 點鐘方向順時針填色，用得越多填得越滿。不顯示數字，在 Claude 桌面 App 裡滑鼠移到圓圈上會顯示「上下文已使用 X%」。數字跟 Claude Code 狀態列、桌面版「背景資訊」同一個；每輪回答完更新一次，還沒量到時不顯示 |
| 收起 | 這一題先不顯示，下次送出新問題會再出現 |

### 圓圈顏色

| 已使用 | 顏色 |
|---|---|
| 20% 以內（含 20%） | 淺綠 |
| 超過 20%，到 50%（含） | 深綠 |
| 超過 50%，未滿 70% | 黃 |
| 70% 以上（含 70%） | 紅 |

終端機畫不了圖，改用 ○◔◑◕● 字元，顏色規則相同。

## 安裝

在終端機的 Claude Code 裡輸入：

```
/plugin install last-question --marketplace Jiang-Yude/claude-last-question
```

出現 `Add marketplace?` 按 `y`，再選安裝範圍（預設 user 按 Enter）。

從一般終端機（shell）安裝：

```
claude plugin install last-question --marketplace Jiang-Yude/claude-last-question
```

Claude 桌面版（Code 分頁）：按輸入框旁的 **+** → **Plugins** → **Add marketplace**，輸入 `Jiang-Yude/claude-last-question`，再選 **last-question** → **Add plugin**。

需要支援 Mods 的 Claude Code；裝不起來請先更新 Claude Code。

移除：

```
/plugin uninstall last-question
```

## 隱私

上一題的文字只存在這個對話的工作階段裡，外掛不連網、不把內容送到任何地方。

提醒：如果上一題貼了密碼、金鑰或客戶資料，它會一直顯示在輸入框上方。分享螢幕前先按「收起」。

## 作者

江昱德（江江教練）。做法與實測說明：[jiangyude.com/articles/last-question-mod](https://jiangyude.com/articles/last-question-mod/)

MIT License
