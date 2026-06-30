# 期末复习网站 — 全栈部署指南

把网站部署到公网，手机也能刷题。分两步：后端放 Render，前端放 GitHub Pages。

---

## 一、GitHub 建仓

1. 去 [github.com/new](https://github.com/new) 创建新仓库，名字随意（例如 `final-review`）
2. 仓库设为 **Public**（GitHub Pages 免费套餐需要 public）
3. 本地初始化并推送：

```bash
cd 期末复习网站
git init
git add .
git commit -m "feat: 期末复习网站全栈版"
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

---

## 二、后端：Render 部署

### 2.1 创建 Render 服务

1. 注册 [render.com](https://render.com)（用 GitHub 账号登录即可）
2. 进入 Dashboard → **New +** → **Blueprint**
3. 连接你的 GitHub 仓库，Render 会自动发现 `render.yaml`
4. 点击 **Apply**，Render 会自动创建：
   - Web Service（Python + gunicorn）
   - 1GB 持久磁盘（挂载在 `/data`）

### 2.2 配置环境变量

在 Render Dashboard → 你的服务 → **Environment**，手动添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxx` | 你的 DeepSeak API Key |

> 其余变量（`DATABASE_URL`、`DATA_DIR` 等）已在 `render.yaml` 中预设，无需手动配置。

### 2.3 上传初始数据库

Render 持久磁盘初始为空，需要把本地的题库传上去：

**方法一：Render Shell（推荐）**

1. 在 Render Dashboard → 你的服务 → **Shell** 标签页
2. 把本地 `data/study.db` 文件内容拖入 Shell
3. 执行：
   ```bash
   cp /tmp/study.db /data/study.db
   mkdir -p /data/uploads
   ```

**方法二：本地 scp（如果 Render 支持）**

```bash
# 需要先从 Render 获取 SSH 地址
scp data/study.db render-user@xxx.onrender.com:/data/study.db
```

### 2.4 验证后端

部署完成后，Render 会给你一个地址，例如：
```
https://final-review-api.onrender.com
```

浏览器打开 `https://你的地址/api/subjects`，如果返回 JSON 数组说明后端正常。

> ⚠️ 免费套餐：15 分钟无请求会休眠，下次请求需约 30 秒冷启动。这是 Render 的限制，升级付费套餐可解决。

---

## 三、前端：GitHub Pages 部署

### 3.1 设置 GitHub Actions 变量

在 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **Variables**，新建：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_BASE` | `/你的仓库名/` | 例如 `/final-review/`；如果是用户页 `用户名.github.io` 则留空或填 `/` |
| `VITE_API_BASE` | `https://你的render地址/api` | 例如 `https://final-review-api.onrender.com/api` |

### 3.2 首次触发部署

代码 push 到 main 分支后，Actions 会自动运行。如果没触发，手动执行：

1. GitHub → 你的仓库 → **Actions** → **Deploy Frontend to GitHub Pages**
2. 点击 **Run workflow** → **Run workflow**

### 3.3 配置 Pages 源

1. GitHub → **Settings** → **Pages**
2. Source 选 **GitHub Actions**
3. 部署完成后，页面地址会显示在 Pages 设置页

### 3.4 验证前端

打开 `https://你的用户名.github.io/仓库名/`，应该能看到首页。

---

## 四、进阶配置

### 自定义域名

如果你有域名（例如 `review.yourdomain.com`）：

1. GitHub Pages 支持自定义域：Settings → Pages → Custom domain
2. DNS 添加 CNAME 记录指向 `你的用户名.github.io`
3. Render 也支持自定义域：服务 → Settings → Custom Domain

### 数据定期备份

Render 免费磁盘不会自动备份，建议定期：

```bash
# 从 Render Shell 下载数据库
cp /data/study.db /tmp/study-$(date +%Y%m%d).db
# 然后通过 Render Shell 界面下载到本地
```

### 更新题库

上传新试卷到本地运行的后端，然后把更新的 `study.db` 重新传到 Render。

---

## 五、常见问题

| 问题 | 解决方案 |
|------|---------|
| 前端页面空白 | 检查 `VITE_BASE` 是否设置正确，仓库名大小写是否一致 |
| API 请求 404 | 检查 `VITE_API_BASE` 是否以 `/api` 结尾，Render 服务是否在运行 |
| AI 功能不可用 | 检查 Render 环境变量 `DEEPSEEK_API_KEY` 是否填写 |
| Render 每次访问很慢 | 免费套餐冷启动正常现象，升级付费或设置 uptime monitor 定期访问 |
| 手机访问布局乱 | 已在最新版适配 640px / 768px 断点，清除浏览器缓存后重试 |
