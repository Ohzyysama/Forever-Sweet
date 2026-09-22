/* ============================================================
   Forever Sweet · 前端应用逻辑（无构建，纯原生 JS）
   ============================================================ */

const app = document.getElementById("app");
const navLinks = document.getElementById("navLinks");
const navToggle = document.getElementById("navToggle");
const navAuthLink = document.getElementById("navAuthLink");

let sb = null;
let currentSession = null;
let composeState = null; // { id, existing, newFiles:[{file,url}], removed }
let celebrationShown = false;

// 在一起的纪念日：2026 年 3 月 8 日（想改日期就改这里）
const TOGETHER_SINCE = new Date(2026, 2, 8);

// 农历生日（month/day 是农历月份和日期）
const LUNAR_BIRTHDAYS = [
  { month: 7, day: 20, label: "生日 · 农历七月二十" },
  { month: 8, day: 3,  label: "生日 · 农历八月初三" },
];

/* ---------- 工具函数 ---------- */

function isConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR-") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("YOUR-")
  );
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function bodyHtml(body) {
  return escapeHtml(body || "").replace(/\n/g, "<br>");
}

function excerpt(text, n = 120) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function displayTitle(p) {
  const t = (p.title || "").trim();
  if (t) return t;
  const first = (p.body || "").split("\n").map((s) => s.trim()).find(Boolean);
  if (first) return first.length > 24 ? first.slice(0, 24) + "…" : first;
  return "未命名";
}

function postAuthor(p) {
  return (p.author_name || "").trim();
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function daysTogether() {
  const a = new Date(TOGETHER_SINCE.getFullYear(), TOGETHER_SINCE.getMonth(), TOGETHER_SINCE.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function lunarBirthdayToSolar(year, month, day) {
  if (!window.Lunar) return null;
  try {
    const solar = Lunar.fromYmd(year, month, day).getSolar();
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  } catch (e) {
    return null;
  }
}

function milestoneEvents() {
  const today = startOfDay(new Date());
  const events = [];

  // 100 倍数天（100、200、300…）
  const daysNow = daysTogether();
  const first = Math.max(100, Math.ceil(daysNow / 100) * 100);
  for (let n = first; n <= daysNow + 730; n += 100) {
    events.push({ date: addDays(TOGETHER_SINCE, n), name: `在一起 ${n} 天` });
  }

  // 满月（每个月 8 号）
  for (let i = 1; i <= 36; i++) {
    events.push({
      date: new Date(TOGETHER_SINCE.getFullYear(), TOGETHER_SINCE.getMonth() + i, TOGETHER_SINCE.getDate()),
      name: `在一起满 ${i} 个月`,
    });
  }

  // 满年（每年 3 月 8 日）
  for (let y = TOGETHER_SINCE.getFullYear() + 1; y <= TOGETHER_SINCE.getFullYear() + 10; y++) {
    events.push({
      date: new Date(y, TOGETHER_SINCE.getMonth(), TOGETHER_SINCE.getDate()),
      name: `在一起满 ${y - TOGETHER_SINCE.getFullYear()} 年`,
    });
  }

  // 农历生日（今年 + 明年）
  if (window.Lunar) {
    for (const bd of LUNAR_BIRTHDAYS) {
      for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
        const solar = lunarBirthdayToSolar(y, bd.month, bd.day);
        if (solar) events.push({ date: solar, name: bd.label });
      }
    }
  }

  return events;
}

function celebrationsToday() {
  const today = startOfDay(new Date()).getTime();
  return milestoneEvents().filter((e) => e.date.getTime() === today);
}

function startFireworks(canvas) {
  const ctx = canvas.getContext("2d");
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  const colors = ["#E8E2D6", "#C9A24B", "#D46A6A", "#6A9BBD", "#A97BC4", "#E0A458", "#7FAE9B", "#D98C7A"];
  const particles = [];

  function burst(x, y) {
    const n = 36 + Math.floor(Math.random() * 28);
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.016,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  let last = 0;
  let raf;
  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    if (t - last > 360) {
      last = t;
      burst(Math.random() * w, h * (0.18 + Math.random() * 0.38));
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  return () => cancelAnimationFrame(raf);
}

function showCelebration(names) {
  const msg = names.join(" · ");
  const overlay = document.createElement("div");
  overlay.className = "celebration";
  overlay.innerHTML = `
    <canvas class="celebration-canvas"></canvas>
    <div class="celebration-card">
      <span class="label">纪念日</span>
      <p class="celebration-title">${escapeHtml(msg)}</p>
      <p class="celebration-sub">Happy together</p>
    </div>`;
  document.body.appendChild(overlay);

  let stop = null;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stop = startFireworks(overlay.querySelector("canvas"));
  }

  setTimeout(() => {
    if (stop) stop();
    overlay.classList.add("hide");
    setTimeout(() => overlay.remove(), 650);
  }, 4200);
}

function maybeCelebrate() {
  if (celebrationShown) return;
  const todays = celebrationsToday();
  if (todays.length) {
    celebrationShown = true;
    showCelebration(todays.map((e) => e.name));
  }
}

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "刚刚";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(iso);
}

const pad = (n) => String(n).padStart(2, "0");

function getUserKey() {
  let k = localStorage.getItem("fs_user_key");
  if (!k) {
    k = (crypto.randomUUID && crypto.randomUUID()) ||
      "k-" + Date.now() + "-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem("fs_user_key", k);
  }
  return k;
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.getElementById("toast").appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 2600);
}

const loading = () => '<p class="loading">正在加载…</p>';
const errorMarkup = () =>
  '<div class="error-box"><p class="empty-text">加载失败，请稍后重试。</p></div>';

/* ---------- 导航 ---------- */

function parseHash() {
  return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

function highlightActiveNav() {
  const seg = parseHash()[0] || "home";
  let active = seg;
  if (seg === "post" || seg === "edit") active = "posts";
  document.querySelectorAll("#navLinks a[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === active);
  });
}

function updateNavAuth() {
  const on = !!currentSession;
  document.body.classList.toggle("logged-in", on);
  navAuthLink.textContent = on ? "退出" : "登录";
  highlightActiveNav();
}

function initNav() {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
  navAuthLink.addEventListener("click", async (e) => {
    if (currentSession) {
      e.preventDefault();
      await sb.auth.signOut();
      location.hash = "#/";
    }
  });
}

/* ---------- 数据层 ---------- */

async function fetchPosts() {
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchFeatured() {
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("featured", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchPost(id) {
  const { data, error } = await sb
    .from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchComments(postId) {
  const { data, error } = await sb
    .from("comments").select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchLikeMeta(postIds) {
  const counts = {};
  const mine = new Set();
  if (!postIds.length) return { counts, mine };
  const { data, error } = await sb
    .from("likes").select("post_id, user_key").in("post_id", postIds);
  if (error) return { counts, mine };
  const myKey = getUserKey();
  for (const r of data || []) {
    counts[r.post_id] = (counts[r.post_id] || 0) + 1;
    if (r.user_key === myKey) mine.add(r.post_id);
  }
  return { counts, mine };
}

async function fetchCommentCounts(postIds) {
  const counts = {};
  if (!postIds.length) return counts;
  const { data, error } = await sb
    .from("comments").select("post_id").in("post_id", postIds);
  if (error) return counts;
  for (const r of data || []) counts[r.post_id] = (counts[r.post_id] || 0) + 1;
  return counts;
}

async function toggleLike(postId, liked) {
  if (liked) {
    await sb.from("likes").delete()
      .eq("post_id", postId).eq("user_key", getUserKey());
  } else {
    await sb.from("likes").insert({ post_id: postId, user_key: getUserKey() });
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

// 前端压缩图片：最长边缩到 maxDim、转 JPEG 压缩质量 quality
// 压缩后反而更大的话返回原文件
async function compressImage(file, maxDim = 1920, quality = 0.82) {
  if (file.type === "image/gif") return file; // 动图保持原样
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    const url = URL.createObjectURL(file);
    try {
      bitmap = await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const w0 = bitmap.width || bitmap.naturalWidth;
  const h0 = bitmap.height || bitmap.naturalHeight;
  if (!w0 || !h0) return file;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  if (scale === 1 && file.size <= 400 * 1024) return file; // 已经够小
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function uploadImages(files) {
  const urls = [];
  const prefix = currentSession && currentSession.user ? currentSession.user.id : "anon";
  for (const f of files) {
    const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await sb.storage.from("images").upload(path, f);
    if (error) throw error;
    const { data } = sb.storage.from("images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/* ---------- 视图：首页 ---------- */

function heroMarkup() {
  const days = daysTogether();
  const s = TOGETHER_SINCE;
  const sinceLabel = `Together since ${s.getFullYear()}.${String(s.getMonth() + 1).padStart(2, "0")}.${String(s.getDate()).padStart(2, "0")}`;
  return `
    <section class="hero container">
      <div class="hero-eyebrow">
        <span class="label">Est. MMXXVI · 两个人的生活札记</span>
      </div>
      <h1 class="hero-title">只属于<br>我们的<em>故事</em></h1>
      <div class="hero-together">
        <span class="label">${sinceLabel}</span>
        <p class="together-line">我们在一起 <span class="together-num">${days}</span> 天啦</p>
      </div>
      <p class="hero-sub italic">这里收藏我们的日常 —— 每一段文字、每一张照片，都是我们的小小纪念。</p>
    </section>`;
}

function featureRow(p, i, likes, comments) {
  const flip = i % 2 === 1 ? " flip" : "";
  const img = p.images && p.images.length ? p.images[0] : null;
  const author = postAuthor(p);
  const media = img
    ? `<a class="feature-media" href="#/post/${p.id}">
        <div class="media-frame">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(displayTitle(p))}" loading="lazy">
        </div>
      </a>`
    : "";
  const noMedia = img ? "" : " no-media";
  return `
    <article class="feature${flip}${noMedia}">
      ${media}
      <div class="feature-body">
        <span class="label">${author ? escapeHtml(author) + " · " : ""}${formatDate(p.created_at)}</span>
        <h3 class="feature-title"><a href="#/post/${p.id}">${escapeHtml(displayTitle(p))}</a></h3>
        <p class="feature-excerpt">${escapeHtml(excerpt(p.body))}</p>
        <div class="feature-meta">
          <span>♥ ${likes}</span>
          <span>${comments} 条评论</span>
        </div>
        <a class="read-more" href="#/post/${p.id}">阅读全文 <span class="arrow">→</span></a>
      </div>
    </article>`;
}

function featuredMarkup(posts, counts, cc) {
  if (!posts.length) {
    return `
      <div class="empty">
        <span class="label">精选 · Featured</span>
        <p class="empty-text">还没有精选内容。</p>
        <p class="empty-hint italic">登录后发布文章，并勾选「精选」，就会显示在首页。</p>
        <a class="btn-ghost" href="#/posts">去记录页看看</a>
      </div>`;
  }
  const rows = posts
    .map((p, i) => featureRow(p, i, counts[p.id] || 0, cc[p.id] || 0))
    .join("");
  return `
    <div class="featured-head">
      <span class="label">精选 · Featured</span>
      <h2 class="section-title">最近的故事</h2>
    </div>
    <div class="featured-grid">${rows}</div>`;
}

async function home() {
  app.innerHTML =
    heroMarkup() + `<section class="featured container" id="featured">${loading()}</section>`;
  try {
    const posts = await fetchFeatured();
    maybeCelebrate();
    const ids = posts.map((p) => p.id);
    const [{ counts, mine }, cc] = await Promise.all([
      fetchLikeMeta(ids),
      fetchCommentCounts(ids),
    ]);
    document.getElementById("featured").innerHTML = featuredMarkup(posts, counts, cc);
  } catch (e) {
    document.getElementById("featured").innerHTML = errorMarkup();
  }
}

/* ---------- 视图：全部记录 ---------- */

function postsHeadMarkup() {
  const cta = currentSession
    ? '<a class="btn" href="#/new">＋ 发布新记录</a>'
    : '<a class="btn" href="#/login">登录后发布</a>';
  return `
    <section class="container page-head">
      <span class="label">全部记录 · Archive</span>
      <h1 class="page-title">我们的时光</h1>
      <div class="page-head-row">
        <p class="sub italic" id="postCount"></p>
        ${cta}
      </div>
    </section>`;
}

function postRow(p, i, likes, comments) {
  const img = p.images && p.images.length ? p.images[0] : null;
  const author = postAuthor(p);
  const thumb = img
    ? `<div class="row-thumb"><img src="${escapeHtml(img)}" alt="" loading="lazy"></div>`
    : "";
  return `
    <article class="post-row">
      <a class="post-row-inner" href="#/post/${p.id}">
        <span class="row-num">${pad(i + 1)}</span>
        <div class="row-text">
          <span class="label">${author ? escapeHtml(author) + " · " : ""}${formatDate(p.created_at)}</span>
          <h3 class="row-title">${escapeHtml(displayTitle(p))}</h3>
          <p class="row-excerpt">${escapeHtml(excerpt(p.body, 160))}</p>
          <span class="row-meta">♥ ${likes} · ${comments} 条评论</span>
        </div>
        ${thumb}
      </a>
    </article>`;
}

function groupPostsByMonth(posts) {
  const years = [];
  const yearMap = new Map();
  for (const p of posts) {
    const d = new Date(p.created_at);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (!yearMap.has(y)) {
      const yg = { year: y, months: [] };
      yearMap.set(y, yg);
      years.push(yg);
    }
    const yg = yearMap.get(y);
    let mg = yg.months.find((x) => x.month === m);
    if (!mg) {
      mg = { month: m, posts: [] };
      yg.months.push(mg);
    }
    mg.posts.push(p);
  }
  return years;
}

function archiveMarkup(posts, counts, cc) {
  const groups = groupPostsByMonth(posts);
  let n = 0;
  return groups.map((yg) => `
    <div class="archive-year">
      <h2 class="archive-year-title">${yg.year}</h2>
      ${yg.months.map((mg) => `
        <div class="archive-month">
          <div class="archive-month-head"><span class="label">${mg.month} 月 · ${mg.posts.length} 篇</span></div>
          ${mg.posts.map((p) => postRow(p, n++, counts[p.id] || 0, cc[p.id] || 0)).join("")}
        </div>
      `).join("")}
    </div>
  `).join("");
}

async function postsPage() {
  app.innerHTML =
    postsHeadMarkup() +
    `<section class="container"><div id="postList">${loading()}</div></section>`;
  try {
    const posts = await fetchPosts();
    const ids = posts.map((p) => p.id);
    const [{ counts, mine }, cc] = await Promise.all([
      fetchLikeMeta(ids),
      fetchCommentCounts(ids),
    ]);
    const countEl = document.getElementById("postCount");
    if (countEl) countEl.textContent = `共 ${posts.length} 篇记录`;
    document.getElementById("postList").innerHTML = posts.length
      ? archiveMarkup(posts, counts, cc)
      : `<div class="empty">
           <p class="empty-text">还没有任何记录。</p>
           <p class="empty-hint italic">登录后写下第一篇吧。</p>
         </div>`;
  } catch (e) {
    document.getElementById("postList").innerHTML = errorMarkup();
  }
}

/* ---------- 视图：照片墙 ---------- */

function galleryItem(it) {
  return `
    <figure class="gallery-item">
      <a class="gallery-media" href="#/post/${it.postId}">
        <img src="${escapeHtml(it.url)}" alt="${escapeHtml(it.title)}" loading="lazy">
      </a>
      <figcaption class="gallery-caption">
        <span class="gallery-title">${escapeHtml(it.title)}</span>
        <span class="label">${formatDate(it.date)}</span>
      </figcaption>
    </figure>`;
}

function galleryMarkup(items) {
  if (!items.length) {
    return `
      <section class="container">
        <div class="empty">
          <span class="label">Gallery · 照片墙</span>
          <p class="empty-text">还没有照片。</p>
          <p class="empty-hint italic">发布带图片的文章后，照片会出现在这里。</p>
          <a class="btn-ghost" href="#/posts">去记录页看看</a>
        </div>
      </section>`;
  }
  return `
    <section class="container page-head">
      <span class="label">Gallery · 照片墙</span>
      <h1 class="page-title">我们的照片</h1>
      <div class="page-head-row">
        <p class="sub italic">共 ${items.length} 张照片</p>
      </div>
    </section>
    <section class="container">
      <div class="gallery-grid">${items.map(galleryItem).join("")}</div>
    </section>`;
}

async function galleryPage() {
  app.innerHTML = `<section class="container">${loading()}</section>`;
  try {
    const posts = await fetchPosts();
    const items = [];
    for (const p of posts) {
      for (const u of (p.images || [])) {
        items.push({ url: u, postId: p.id, title: displayTitle(p), date: p.created_at });
      }
    }
    app.innerHTML = galleryMarkup(items);
  } catch (e) {
    app.innerHTML = `<section class="container">${errorMarkup()}</section>`;
  }
}

/* ---------- 视图：详情 ---------- */

function commentItem(c) {
  const author = (c.author_name || "").trim();
  const del = currentSession
    ? `<button class="comment-del" data-del-comment="${c.id}" aria-label="删除评论">删除</button>`
    : "";
  return `
    <div class="comment">
      <div class="comment-head">
        ${author ? `<span class="comment-author">${escapeHtml(author)}</span>` : ""}
        <span class="comment-time label">${timeAgo(c.created_at)}</span>
      </div>
      <p class="comment-text">${bodyHtml(c.content)}</p>
      ${del ? `<div class="comment-foot">${del}</div>` : ""}
    </div>`;
}

function postDetailMarkup(p, comments, likes, liked) {
  const author = postAuthor(p);
  const images = (p.images || [])
    .map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy">`)
    .join("");
  const auth = currentSession
    ? `
      <a class="btn-ghost" href="#/edit/${p.id}">编辑</a>
      <button class="danger-btn" id="deleteBtn" data-confirm="0">删除</button>`
    : "";
  return `
    <section class="container">
      <article class="article">
        <header class="article-head">
          <span class="label">${author ? escapeHtml(author) + " · " : ""}${formatDate(p.created_at)}${p.featured ? " · 精选" : ""}</span>
          <h1 class="article-title">${escapeHtml(displayTitle(p))}</h1>
        </header>
        <div class="article-body">${bodyHtml(p.body)}</div>
        ${images ? `<div class="article-images">${images}</div>` : ""}
        <div class="article-actions">
          <button class="like-btn" id="likeBtn" data-liked="${liked ? 1 : 0}">
            ${liked ? "♥" : "♡"} 喜欢 · ${likes}
          </button>
          ${auth}
        </div>
      </article>
      <section class="comments">
        <div class="comments-head">
          <h3 class="section-title">评论 · ${comments.length}</h3>
        </div>
        <form class="comment-form" id="commentForm">
          <div class="field">
            <input id="cContent" type="text" placeholder=" " class="peer" autocomplete="off" maxlength="500">
            <label for="cContent">说点什么…（不会显示名字）</label>
          </div>
          <button class="btn-ghost" type="submit">发送</button>
        </form>
        <div class="comment-list" id="commentList">
          ${comments.length
            ? comments.map(commentItem).join("")
            : '<p class="empty-text italic">还没有评论，来抢沙发。</p>'}
        </div>
      </section>
    </section>`;
}

async function postPage(id) {
  app.innerHTML = `<section class="container">${loading()}</section>`;
  let p;
  try {
    p = await fetchPost(id);
  } catch (e) {
    app.innerHTML = errorMarkup();
    return;
  }
  if (!p) {
    app.innerHTML = `
      <section class="container">
        <div class="empty">
          <span class="label">404</span>
          <p class="empty-text">这篇记录不存在，或已被删除。</p>
          <a class="btn-ghost" href="#/posts">返回记录</a>
        </div>
      </section>`;
    return;
  }
  const [comments, { counts, mine }] = await Promise.all([
    fetchComments(id),
    fetchLikeMeta([id]),
  ]);
  const liked = mine.has(id);
  const likes = counts[id] || 0;
  app.innerHTML = postDetailMarkup(p, comments, likes, liked);
  bindPostDetail(p.id);
}

function bindPostDetail(postId) {
  const likeBtn = document.getElementById("likeBtn");
  if (likeBtn) {
    likeBtn.addEventListener("click", async () => {
      const liked = likeBtn.dataset.liked === "1";
      likeBtn.disabled = true;
      try {
        await toggleLike(postId, liked);
        const { counts } = await fetchLikeMeta([postId]);
        const n = counts[postId] || 0;
        likeBtn.dataset.liked = liked ? "0" : "1";
        likeBtn.innerHTML = `${liked ? "♡" : "♥"} 喜欢 · ${n}`;
      } catch (e) {
        toast("操作失败，请稍后重试");
      }
      likeBtn.disabled = false;
    });
  }

  const deleteBtn = document.getElementById("deleteBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (deleteBtn.dataset.confirm === "0") {
        deleteBtn.dataset.confirm = "1";
        deleteBtn.textContent = "确认删除？";
        setTimeout(() => {
          if (deleteBtn.dataset.confirm === "1") {
            deleteBtn.dataset.confirm = "0";
            deleteBtn.textContent = "删除";
          }
        }, 3000);
        return;
      }
      deleteBtn.disabled = true;
      deleteBtn.textContent = "删除中…";
      const { error } = await sb.from("posts").delete().eq("id", postId);
      if (error) {
        toast("删除失败");
        deleteBtn.disabled = false;
        deleteBtn.dataset.confirm = "0";
        deleteBtn.textContent = "删除";
      } else {
        toast("已删除");
        location.hash = "#/posts";
      }
    });
  }

  const form = document.getElementById("commentForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("cContent");
      const content = input.value.trim();
      if (!content) return;
      const btn = form.querySelector("button");
      btn.disabled = true;
      const { error } = await sb
        .from("comments").insert({ post_id: postId, content });
      if (error) {
        toast("评论失败，请稍后重试");
        btn.disabled = false;
      } else {
        input.value = "";
        btn.disabled = false;
        refreshComments(postId);
      }
    });
  }

  const commentList = document.getElementById("commentList");
  if (commentList) {
    commentList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-comment]");
      if (!btn) return;
      const id = btn.dataset.delComment;
      btn.disabled = true;
      btn.textContent = "删除中…";
      const { error } = await sb.from("comments").delete().eq("id", id);
      if (error) {
        toast("删除失败");
        btn.disabled = false;
        btn.textContent = "删除";
      } else {
        toast("已删除");
        refreshComments(postId);
      }
    });
  }
}

async function refreshComments(postId) {
  const comments = await fetchComments(postId);
  const list = document.getElementById("commentList");
  if (list) {
    list.innerHTML = comments.length
      ? comments.map(commentItem).join("")
      : '<p class="empty-text italic">还没有评论，来抢沙发。</p>';
  }
  const head = document.querySelector(".comments-head h3");
  if (head) head.textContent = `评论 · ${comments.length}`;
}

/* ---------- 视图：发布 / 编辑 ---------- */

function composeMarkup(s) {
  const isEdit = !!s.id;
  const previews = (s.existing || [])
    .map((u) => `
      <div class="preview">
        <img src="${escapeHtml(u)}" alt="">
        <button type="button" class="preview-remove" data-type="existing" data-url="${escapeHtml(u)}" aria-label="移除图片">×</button>
      </div>`)
    .join("");
  return `
    <section class="container">
      <form class="compose" id="postForm">
        <h1 class="page-title">${isEdit ? "编辑记录" : "发布新记录"}</h1>
        <p class="sub italic">${isEdit ? "修改这段回忆。" : "记录下此刻的我们。"}</p>

        <div class="field">
          <input id="pTitle" type="text" placeholder=" " class="peer" autocomplete="off" maxlength="80" value="${escapeHtml(s.title || "")}">
          <label for="pTitle">标题（可选）</label>
        </div>

        <div class="field">
          <textarea id="pBody" placeholder=" " class="peer">${escapeHtml(s.body || "")}</textarea>
          <label for="pBody">写下此刻…</label>
        </div>

        <div class="field-upload">
          <span class="label">配图</span>
          <label class="upload-box" for="pImages">
            <input type="file" id="pImages" accept="image/*" multiple hidden>
            <span>＋ 添加图片</span>
          </label>
          <div class="previews" id="previews">${previews}</div>
        </div>

        <label class="check">
          <input type="checkbox" id="pFeatured" ${s.featured ? "checked" : ""}>
          <span>精选 —— 显示在首页</span>
        </label>

        <div class="form-actions">
          <button class="btn" type="submit">${isEdit ? "保存" : "发布"}</button>
          <a class="btn-ghost" href="#/posts">取消</a>
        </div>
      </form>
    </section>`;
}

function newPostPage() {
  if (!currentSession) {
    toast("请先登录");
    location.hash = "#/login";
    return;
  }
  composeState = { id: null, existing: [], newFiles: [], removed: [] };
  app.innerHTML = composeMarkup({ id: null, title: "", body: "", featured: false, existing: [] });
  bindCompose();
}

async function editPostPage(id) {
  if (!currentSession) {
    toast("请先登录");
    location.hash = "#/login";
    return;
  }
  app.innerHTML = `<section class="container">${loading()}</section>`;
  const p = await fetchPost(id);
  if (!p) {
    app.innerHTML = `
      <section class="container"><div class="empty">
        <span class="label">404</span><p class="empty-text">这篇记录不存在。</p>
        <a class="btn-ghost" href="#/posts">返回记录</a>
      </div></section>`;
    return;
  }
  composeState = { id: p.id, existing: p.images || [], newFiles: [], removed: [] };
  app.innerHTML = composeMarkup({
    id: p.id, title: p.title || "", body: p.body || "", featured: !!p.featured, existing: p.images || [],
  });
  bindCompose();
}

function renderPreviews() {
  const wrap = document.getElementById("previews");
  if (!wrap) return;
  const kept = composeState.existing.filter((u) => !composeState.removed.includes(u));
  let html = kept
    .map((u) => `
      <div class="preview">
        <img src="${escapeHtml(u)}" alt="">
        <button type="button" class="preview-remove" data-type="existing" data-url="${escapeHtml(u)}" aria-label="移除图片">×</button>
      </div>`)
    .join("");
  html += composeState.newFiles
    .map((x, i) => `
      <div class="preview">
        <img src="${escapeHtml(x.url)}" alt="">
        <button type="button" class="preview-remove" data-type="new" data-idx="${i}" aria-label="移除图片">×</button>
      </div>`)
    .join("");
  wrap.innerHTML = html;
}

function bindCompose() {
  const form = document.getElementById("postForm");
  const fileInput = document.getElementById("pImages");
  const previews = document.getElementById("previews");

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);
    fileInput.value = "";
    for (const f of files) {
      const compressed = await compressImage(f);
      composeState.newFiles.push({ file: compressed, url: URL.createObjectURL(compressed) });
      renderPreviews();
    }
  });

  previews.addEventListener("click", (e) => {
    const btn = e.target.closest(".preview-remove");
    if (!btn) return;
    if (btn.dataset.type === "existing") {
      composeState.removed.push(btn.dataset.url);
    } else {
      const idx = Number(btn.dataset.idx);
      const [item] = composeState.newFiles.splice(idx, 1);
      if (item) URL.revokeObjectURL(item.url);
    }
    renderPreviews();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("pTitle").value.trim();
    const body = document.getElementById("pBody").value;
    const featured = document.getElementById("pFeatured").checked;
    const kept = composeState.existing.filter((u) => !composeState.removed.includes(u));

    if (!body.trim() && !kept.length && !composeState.newFiles.length) {
      toast("写点内容，或添加一张图片吧");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "发布中…";
    try {
      const urls = [...kept];
      if (composeState.newFiles.length) {
        const up = await uploadImages(composeState.newFiles.map((x) => x.file));
        urls.push(...up);
      }
      const payload = { title, body, images: urls, featured };
      let id = composeState.id;
      if (id) {
        await sb.from("posts").update(payload).eq("id", id);
      } else {
        const { data, error } = await sb
          .from("posts").insert(payload).select().single();
        if (error) throw error;
        id = data.id;
      }
      toast(composeState.id ? "已更新" : "已发布");
      location.hash = `#/post/${id}`;
    } catch (err) {
      toast("保存失败：" + (err.message || err));
      btn.disabled = false;
      btn.textContent = composeState.id ? "保存" : "发布";
    }
  });
}

/* ---------- 视图：登录 ---------- */

function loginPage() {
  if (currentSession) {
    app.innerHTML = `
      <section class="container">
        <div class="empty">
          <span class="label">已登录</span>
          <p class="empty-text">你已经登录了。</p>
          <a class="btn" href="#/new">去发布</a>
        </div>
      </section>`;
    return;
  }
  app.innerHTML = `
    <section class="container">
      <form class="login" id="loginForm">
        <h1 class="page-title">登录</h1>
        <p class="sub italic">这里只有我们两个人能编辑。</p>
        <div class="field">
          <input id="lEmail" type="email" placeholder=" " class="peer" autocomplete="username" required>
          <label for="lEmail">邮箱 Email</label>
        </div>
        <div class="field">
          <input id="lPassword" type="password" placeholder=" " class="peer" autocomplete="current-password" required>
          <label for="lPassword">密码 Password</label>
        </div>
        <p class="form-error" id="loginError"></p>
        <button class="btn" type="submit">登录</button>
      </form>
    </section>`;
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("lEmail").value.trim();
    const password = document.getElementById("lPassword").value;
    const errEl = document.getElementById("loginError");
    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "登录中…";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = "登录失败，请检查邮箱和密码。";
      btn.disabled = false;
      btn.textContent = "登录";
    } else {
      location.hash = "#/";
    }
  });
}

/* ---------- 视图：账户（设置显示名字） ---------- */

function accountMarkup(email) {
  return `
    <section class="container">
      <form class="login" id="accountForm">
        <h1 class="page-title">账户</h1>
        <p class="sub italic">${escapeHtml(email)}</p>
        <div class="field">
          <input id="aName" type="text" placeholder=" " class="peer" autocomplete="off" maxlength="30">
          <label for="aName">显示名字</label>
        </div>
        <p class="form-error" id="acctMsg"></p>
        <div class="form-actions">
          <button class="btn" type="submit">保存名字</button>
          <button class="btn-ghost" type="button" id="logoutBtn">退出登录</button>
        </div>
      </form>
    </section>`;
}

function accountPage() {
  if (!currentSession) {
    toast("请先登录");
    location.hash = "#/login";
    return;
  }
  const user = currentSession.user;
  app.innerHTML = accountMarkup(user.email || "");
  bindAccount(user);
}

function bindAccount(user) {
  const nameInput = document.getElementById("aName");
  sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    .then(({ data }) => { nameInput.value = (data && data.display_name) || ""; })
    .catch(() => {});

  document.getElementById("accountForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const msg = document.getElementById("acctMsg");
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await sb.from("profiles").upsert({ id: user.id, display_name: name });
    if (error) {
      msg.textContent = "保存失败：" + (error.message || error);
      btn.disabled = false;
    } else {
      toast("名字已保存");
      btn.disabled = false;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.hash = "#/";
  });
}

/* ---------- 视图：未配置 / 404 ---------- */

function setupMarkup() {
  return `
    <section class="container">
      <div class="setup-box">
        <span class="label">Setup</span>
        <h1>还差一步</h1>
        <p>打开项目根目录下的 <code>config.js</code>，填入你的 Supabase 项目信息（Project URL 和 anon key），然后按 README 完成初始化。</p>
        <p class="italic">具体步骤见 README.md。</p>
      </div>
    </section>`;
}

function urlHintMarkup() {
  return `
    <section class="container">
      <div class="setup-box">
        <span class="label">配置有误</span>
        <h1>URL 写错了</h1>
        <p><code>config.js</code> 里的 <code>SUPABASE_URL</code> 带了 <code>/rest/v1/</code> 后缀。</p>
        <p>请把它改成不带路径的地址，例如 <code>https://xxxx.supabase.co</code>。</p>
      </div>
    </section>`;
}

function notFoundMarkup() {
  return `
    <section class="container">
      <div class="empty">
        <span class="label">404</span>
        <p class="empty-text">这里什么都没有。</p>
        <a class="btn-ghost" href="#/">回到首页</a>
      </div>
    </section>`;
}

/* ---------- 路由 ---------- */

async function render() {
  highlightActiveNav();
  if (!isConfigured()) {
    app.innerHTML = setupMarkup();
    return;
  }
  const parts = parseHash();
  const seg = parts[0];
  const id = parts[1];

  if (!seg) return home();
  if (seg === "gallery") return galleryPage();
  if (seg === "posts") return postsPage();
  if (seg === "post" && id) return postPage(id);
  if (seg === "new") return newPostPage();
  if (seg === "edit" && id) return editPostPage(id);
  if (seg === "account") return accountPage();
  if (seg === "login") return loginPage();
  return (app.innerHTML = notFoundMarkup());
}

/* ---------- 初始化 ---------- */

async function init() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  sb.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    updateNavAuth();
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      render();
    }
  });

  const { data } = await sb.auth.getSession();
  currentSession = data.session;
  updateNavAuth();

  window.addEventListener("hashchange", render);
  render();
}

function sdkMissingMarkup() {
  return `
    <section class="container">
      <div class="setup-box">
        <span class="label">加载失败</span>
        <h1>Supabase SDK 没加载到</h1>
        <p>很可能是网络屏蔽了所有 CDN。请检查网络后按 <code>Ctrl+Shift+R</code> 强制刷新重试。</p>
        <p>如果一直不行，可以把 supabase-js 的 UMD 文件放到项目 <code>vendor/supabase.min.js</code>，页面会自动改用本地文件。</p>
      </div>
    </section>`;
}

function bootstrap() {
  document.getElementById("year").textContent = new Date().getFullYear();
  initNav();

  if (!isConfigured()) {
    app.innerHTML = setupMarkup();
    return;
  }
  if (/\/rest\/v1\/?$/.test(SUPABASE_URL)) {
    app.innerHTML = urlHintMarkup();
    return;
  }

  // 等待 SDK 就绪（多源容灾加载可能需要一点时间）
  var tries = 0;
  (function waitSdk() {
    if (window.supabase) {
      init();
      return;
    }
    if (tries++ > 80) {
      app.innerHTML = sdkMissingMarkup();
      return;
    }
    setTimeout(waitSdk, 100);
  })();
}

document.addEventListener("DOMContentLoaded", bootstrap);
