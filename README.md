# Forever Sweet

只属于两个人的生活记录网站。静态前端 + [Supabase](https://supabase.com) 免费后端，部署在 GitHub Pages。

- **首页**：精选文章（文字 + 配图），每篇有「阅读全文」入口
- **记录页**：全部帖子，按时间从新到旧，含点赞 / 评论数、发布入口、详情入口
- **发布页**：写文字 + 传图片，可勾选「精选」上首页
- **登录**：只有两个预置账号能发布 / 编辑 / 删除；未登录可浏览、点赞、评论
- **评论**：不显示是谁评论的

UI 为 **Editorial（编辑杂志风）**：暖米色背景、柔和黑文字、衬线标题、单色体系。

---

## 目录结构

```
Forever-Sweet/
├── index.html            # 单页入口（hash 路由）
├── styles.css            # Editorial 样式
├── app.js                # 前端逻辑（路由 / 渲染 / 数据 / 鉴权）
├── config.js             # ★ 需要你填的 Supabase 配置
├── supabase/schema.sql   # ★ Supabase 初始化脚本
├── vendor/supabase.min.js # Supabase SDK（本地副本，避免 CDN 被墙）
├── .nojekyll
└── README.md
```

---

## 一、创建 Supabase 后端

1. 打开 [supabase.com](https://supabase.com)，注册并 **New project**（免费档即可，区域选离你近的，比如 Singapore / Tokyo）。
2. 进入项目 → 左侧 **SQL Editor** → **New query**，把 `supabase/schema.sql` 全部内容粘贴进去，点 **Run**。
   - 这会在数据库里建好 `posts` / `comments` / `likes` 三张表、开启行级安全（RLS），并创建公开图片存储桶 `images`。
   - 脚本末尾会插入两条示例文章（表为空时才插入），方便你第一次打开就能看到效果，之后可以在站内直接删除。

## 二、创建两个登录账号

Supabase 用「邮箱 + 密码」登录。这里手动创建两个人（不要开放注册）：

1. 左侧 **Authentication → Users → Add user**：
   - 填入第一个人的 **邮箱** 和 **密码**，勾选 **Auto Confirm User**，点 Create。
   - 重复一次，创建第二个人的账号。
2. 关闭新用户注册：**Authentication → Sign In / Providers → Email**，把 **"Allow new users to sign up"** 关掉（Off）。这样只有上面两个账号能登录。

> 密码强度由你自定，两个人记住即可。登录页输入的就是这两个邮箱 + 密码。

## 三、填配置

1. 左侧 **Project Settings → API**，复制两样东西：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon / public** 这一行的 key（以 `eyJ...` 开头）
2. 打开项目根目录的 `config.js`，分别填进 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。

> ⚠️ 只用 **anon public** key。**service_role** key 权限极大，绝不能放进 `config.js` 或提交到 GitHub。

## 四、本地预览

在项目目录起一个静态服务器（因为要加载本地 js）：

```bash
# 任选其一
python -m http.server 8000
# 或
npx serve .
```

浏览器打开 `http://localhost:8000`。此时能看到首页（若执行了示例数据会显示两篇文章）。

## 五、部署到 GitHub Pages

1. 把这个仓库推到 GitHub（`config.js` 里的 anon key 是公开的，属于正常做法，RLS 负责保护数据）。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**，分支选 `main`、目录选 **/ (root)**，保存。
3. 稍等片刻，访问 `https://<你的用户名>.github.io/Forever-Sweet/` 即可。

> 站点用的是 hash 路由（`#/posts` 这类），所以 GitHub Pages 上刷新、直达链接都不会 404，无需额外配置。

---

## 使用说明

| 操作 | 是否需登录 |
|---|---|
| 浏览首页 / 记录页 / 详情 | 否 |
| 点赞 / 取消点赞 | 否（按浏览器去重） |
| 评论 | 否（匿名，不显示昵称） |
| 发布 / 编辑 / 删除 | 是（两个账号之一） |

- **发布**：登录后，导航栏会出现「发布」，或到「记录页」点「＋ 发布新记录」。
- **精选**：发布 / 编辑时勾选「精选 —— 显示在首页」，这篇就会出现在首页。
- **编辑 / 删除**：进入文章详情页，登录状态下会看到「编辑」「删除」按钮。
- **图片**：发布时选择图片后先预览，点「发布」时才真正上传到 Supabase 存储。

---

## 权限模型（RLS 摘要）

- `posts`：所有人可读；仅 `authenticated`（两个登录账号）可增 / 改 / 删。
- `comments`：所有人可读、可发。
- `likes`：所有人可读、可点赞 / 取消（以本地随机 `user_key` 去重）。
- `images` 存储桶：公开可读；仅登录用户可上传。

## 常见问题

- **登录报错 / 登不进去**：确认账号是在 Authentication → Users 里手动创建的，且勾选了 Auto Confirm User；或去 Providers → Email 关闭「Confirm email」。
- **发布时报错**：确认 `config.js` 填的是 anon key，且 schema.sql 已完整执行。
- **想换域名 / 换仓库名**：`config.js` 无需改；GitHub Pages 地址随仓库名变。

---

## 许可与提醒

本项目为个人情侣记录用途。公开仓库意味着任何人都能**看**到内容（阅读、点赞、评论也公开），请勿发布隐私信息；如需私密，可改用 Supabase 的私密模式或给仓库加访问控制。
