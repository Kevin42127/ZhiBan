# AI 助理 Chrome 擴充功能

使用 GROQ AI 的智能助理 Chrome 瀏覽器擴充功能，後端部署於 Vercel。

## 功能特色

- 現代化介面設計
- 使用 GROQ AI 提供智能對話
- API KEY 保護於後端
- 支援自訂 API 端點

## 安裝步驟

### 1. 載入擴充功能到 Chrome

1. 開啟 Chrome 瀏覽器
2. 前往 `chrome://extensions/`
3. 開啟「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案資料夾

### 2. 設定後端 API

#### 部署到 Vercel

1. 將專案推送到 GitHub
2. 在 Vercel 匯入專案
3. 在 Vercel 環境變數中設定 `GROQ_API_KEY`
4. 部署完成後取得 API 端點 URL

#### 設定擴充功能

1. 點擊擴充功能圖示
2. 點擊設定按鈕
3. 輸入 Vercel 部署的 API 端點（例如：`https://your-app.vercel.app/api/chat`）
4. 點擊「儲存設定」

## 環境變數

在 Vercel 專案設定中新增：

- `GROQ_API_KEY`: 您的 GROQ API 金鑰

## 使用方式

1. 點擊瀏覽器工具列中的擴充功能圖示
2. 在輸入框中輸入問題
3. 按下 Enter 或點擊傳送按鈕
4. AI 助理會回覆您的問題

## 專案結構

```
.
├── manifest.json          # Chrome 擴充功能設定檔
├── popup.html            # 彈出視窗 HTML
├── styles.css            # 樣式表
├── popup.js              # 前端邏輯
├── api/
│   └── chat.js          # Vercel API 路由
├── vercel.json          # Vercel 部署設定
└── README.md           # 說明文件
```

## 注意事項

- 確保 GROQ API KEY 已正確設定於 Vercel 環境變數
- API 端點必須使用 HTTPS
- 首次使用前請先設定 API 端點
