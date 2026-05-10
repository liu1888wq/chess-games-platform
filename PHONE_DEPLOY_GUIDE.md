# 📱 棋类游戏平台 - 手机端 Render 部署指南

## 🎯 只需 4 步，全程手机操作！

---

## 第一步：注册 GitHub 账号（如果已有可跳过）

1. 打开手机浏览器，访问 https://github.com/signup
2. 输入邮箱、密码、用户名
3. 验证邮箱

---

## 第二步：创建 GitHub 仓库并上传代码

1. 打开 https://github.com/new
2. 仓库名称填：`chess-games`（随便填）
3. 选 **Private**（私有）
4. **不要**勾选任何初始化选项
5. 点击 **Create repository**
6. 在新页面点击 **"uploading an existing file"**
7. 把以下文件逐个上传：
   - `server.js`
   - `package.json`
   - `public/index.html`
   - `public/game.js`
   - `public/i18n.js`
8. 点击 **Commit changes**

---

## 第三步：在 Render 上部署

1. 打开 https://render.com 注册（可用 GitHub 账号直接登录）
2. 点击 **Dashboard** → **New** → **Web Service**
3. 点击 **Connect a repository**
4. 授权 GitHub，选择你刚创建的 `chess-games` 仓库
5. 配置如下：
   - **Name**: `chess-games`（随便填）
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. 点击 **Create Web Service**
7. ⏳ 等待 2-3 分钟部署完成

---

## 第四步：获取链接，开始游戏！

1. 部署完成后，Render 会给你一个链接，类似：
   `https://chess-games-xxxx.onrender.com`
2. 🎉 把这个链接发给你的朋友！
3. 你们都可以用手机浏览器打开链接
4. 输入昵称 → 选择游戏 → 创建房间 → 分享房间码 → 开始对战！

---

## ⚠️ 重要提示

- **免费版休眠**：15分钟没人访问会休眠，再次打开需等约30秒唤醒
- **建议**：游戏开始前先打开链接等几秒，确保服务器已唤醒
- **WebSocket**：已添加心跳保活，游戏过程中不会断连

---

## 🔄 更新代码

如果以后需要更新代码：
1. 在 GitHub 仓库中修改文件
2. Render 会自动检测并重新部署

---

## 📋 文件清单

确保上传了以下文件：

```
chess-games/
├── server.js          ← 后端服务器
├── package.json       ← 项目配置
└── public/
    ├── index.html     ← 前端页面
    ├── game.js        ← 游戏逻辑
    └── i18n.js        ← 多语言翻译
```
