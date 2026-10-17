import http from "node:http";
import {randomBytes,scryptSync,timingSafeEqual,createHash} from "node:crypto";
import {writeFile,rename} from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.AI_API_KEY || process.env.TOTU_API_KEY || process.env.OPENAI_API_KEY;
const BASE_URL = (process.env.AI_BASE_URL || "https://totu-ai.com/v1").replace(/\/+$/, "");
const DEFAULT_MODEL = process.env.AI_MODEL || "gpt-4.1-mini";
const MAX_BODY = 7_000_000; // Cho phép ảnh nén tối đa 5 MB dạng data URL.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = Math.max(1, Math.min(30, Number(process.env.RATE_LIMIT_PER_MINUTE || 12)));
const hits = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type, "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", "Cache-Control": "no-store",
    "Content-Security-Policy": "frame-ancestors 'none'"
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function allowedByRateLimit(ip) {
  const now = Date.now();
  const current = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (current.length >= MAX_REQUESTS_PER_WINDOW) { hits.set(ip, current); return false; }
  current.push(now); hits.set(ip, current); return true;
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw Object.assign(new Error("Nội dung gửi lên quá dài."), { status: 413 });
  }
  try { return JSON.parse(raw || "{}"); }
  catch { throw Object.assign(new Error("Dữ liệu JSON không hợp lệ."), { status: 400 }); }
}
const modeInstructions = {
  tutor: "Giải thích như một gia sư: từng bước, rõ ràng, có ví dụ dễ hiểu khi phù hợp.",
  short: "Trả lời ngắn gọn, đi thẳng vào ý chính.",
  quiz: "Biến chủ đề thành bộ câu hỏi trắc nghiệm 4 lựa chọn, nêu đáp án và giải thích.",
  translate: "Dịch chính xác, giải thích từ vựng và ngữ pháp khi phù hợp.",
  plan: "Lập kế hoạch học tập thực tế theo từng bước, có mục tiêu và thời lượng."
};
const DB_FILE=path.join(ROOT,'studyflow-users.json');
let db={users:[]};try{db=JSON.parse(await readFile(DB_FILE,'utf8'));if(!Array.isArray(db.users))db={users:[]}}catch{}
let writeQueue=Promise.resolve();function persistDb(){const snapshot=JSON.stringify(db);writeQueue=writeQueue.then(async()=>{const tmp=DB_FILE+'.tmp';await writeFile(tmp,snapshot,{mode:0o600});await rename(tmp,DB_FILE)});return writeQueue}
const sessions=new Map();const authHits=new Map();
function hashPassword(p,salt){return scryptSync(p,salt,64).toString('hex')}
function authenticated(req){const token=(req.headers.authorization||'').replace(/^Bearer /,'');const entry=sessions.get(createHash('sha256').update(token).digest('hex'));if(!entry||entry.exp<Date.now())return null;return db.users.find(u=>u.id===entry.id)||null}
function authLimit(req){const ip=req.socket.remoteAddress||'unknown';const now=Date.now();let arr=(authHits.get(ip)||[]).filter(x=>now-x<60000);if(arr.length>=12)return false;arr.push(now);authHits.set(ip,arr);return true}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if(url.pathname==='/api/leaderboard'&&req.method==='GET')return send(res,200,{rows:db.users.map(u=>({username:u.username,points:u.points||0})).filter(u=>u.points>0).sort((a,b)=>b.points-a.points).slice(0,50)});
    if(url.pathname.startsWith('/api/auth/')&&req.method==='POST'){
      if(!authLimit(req))return send(res,429,{error:'Quá nhiều lần thử. Vui lòng chờ.'});
      const action=url.pathname.split('/').pop();if(action==='logout'){const token=(req.headers.authorization||'').replace(/^Bearer /,'');sessions.delete(createHash('sha256').update(token).digest('hex'));return send(res,200,{ok:true})}
      if(!['login','register'].includes(action))return send(res,404,{error:'Không tìm thấy'});
      const body=await readJson(req);const username=String(body.username||'').trim();const password=String(body.password||'');
      if(!/^[a-zA-Z0-9_]{3,32}$/.test(username)||password.length<8||password.length>128)return send(res,400,{error:'Tên tài khoản 3–32 ký tự (chữ, số, _) và mật khẩu 8–128 ký tự.'});
      let user=db.users.find(u=>u.username.toLowerCase()===username.toLowerCase());
      if(action==='register'){if(user)return send(res,409,{error:'Tên tài khoản đã tồn tại'});const salt=randomBytes(16).toString('hex');user={id:randomBytes(16).toString('hex'),username,salt,hash:hashPassword(password,salt),points:0,lastCheckin:''};db.users.push(user);await persistDb()}
      else {const computed=hashPassword(password,user?.salt||'00000000000000000000000000000000');const valid=user&&timingSafeEqual(Buffer.from(computed,'hex'),Buffer.from(user.hash,'hex'));if(!valid)return send(res,401,{error:'Sai tài khoản hoặc mật khẩu'})}
      const token=randomBytes(32).toString('hex');sessions.set(createHash('sha256').update(token).digest('hex'),{id:user.id,exp:Date.now()+86400000});return send(res,200,{token,username:user.username});
    }
    if(url.pathname==='/api/checkin'&&req.method==='POST'){
      const user=authenticated(req);if(!user)return send(res,401,{error:'Bạn cần đăng nhập trên máy chủ'});
      const today=new Date().toISOString().slice(0,10);if(user.lastCheckin===today)return send(res,409,{error:'Bạn đã điểm danh hôm nay (theo UTC)'});
      user.lastCheckin=today;user.points=(user.points||0)+10;await persistDb();return send(res,200,{points:user.points});
    }
    if (url.pathname === "/api/health" && req.method === "GET") {
      return send(res, 200, {
        ok: true, configured: Boolean(API_KEY), baseUrl: BASE_URL,
        defaultModel: DEFAULT_MODEL,
        message: API_KEY ? "Máy chủ đã có khóa API. Có thể thử gửi câu hỏi." : "Máy chủ chạy nhưng chưa cấu hình khóa API."
      });
    }
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
      if (!allowedByRateLimit(ip)) return send(res, 429, { error: "Bạn gửi quá nhiều yêu cầu. Hãy chờ một phút rồi thử lại." });
      if (!API_KEY) return send(res, 503, { error: "Chưa cấu hình khóa API trong Environment/Secrets của máy chủ." });
      const body = await readJson(req);
      if (body.action === "health") return send(res, 200, { ok: true, message: "Máy chủ AI đã sẵn sàng." });
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return send(res, 400, { error: "Thiếu câu hỏi." });
      if (prompt.length > 8000) return send(res, 413, { error: "Câu hỏi quá dài (tối đa 8.000 ký tự)." });
      let imageData = typeof body.imageData === "string" ? body.imageData : "";
      if (imageData) {
        if (imageData.length > 6_800_000) return send(res, 413, { error: "Ảnh quá lớn. Giới hạn 5 MB." });
        const match = imageData.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
        if (!match) return send(res, 400, { error: "Ảnh không hợp lệ. Chỉ nhận PNG, JPEG, WEBP hoặc GIF dạng base64." });
        if (Buffer.from(match[2], "base64").length > 5 * 1024 * 1024) return send(res, 413, { error: "Ảnh vượt giới hạn 5 MB." });
        imageData = { mime: match[1], data: match[2] };
      }
      const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
      const model = requestedModel && requestedModel !== "custom" ? requestedModel : DEFAULT_MODEL;
      if (model.length > 120 || !/^[a-zA-Z0-9._:/-]+$/.test(model)) return send(res, 400, { error: "Tên mô hình không hợp lệ." });
      const mode = modeInstructions[body.mode] || modeInstructions.tutor;
      const upstream = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `Bạn là trợ lý học tập StudyFlow. Trả lời bằng tiếng Việt rõ ràng, chính xác. ${mode} Nếu không chắc, hãy nói rõ.` },
            { role: "user", content: imageData ? [
              { type: "text", text: prompt || "Đọc nội dung ảnh đề bài và giải từng bước bằng tiếng Việt. Nếu ảnh mờ hoặc thiếu dữ kiện, hãy nêu rõ." },
              { type: "image_url", image_url: { url: `data:${imageData.mime};base64,${imageData.data}` } }
            ] : prompt }
          ],
          temperature: 0.5,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(60_000)
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const detail = result?.error?.message || result?.message || `Nhà cung cấp AI trả về HTTP ${upstream.status}.`;
        const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 502;
        return send(res, status, { error: `Lỗi dịch vụ AI: ${detail}` });
      }
      const answer = result?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) return send(res, 502, { error: "Nhà cung cấp AI trả về kết quả rỗng hoặc không đúng định dạng chat completions." });
      return send(res, 200, { answer: answer.trim(), model });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Phương thức không được hỗ trợ." });
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.resolve(ROOT, "." + requested);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, "index.html")) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600"
    });
    if (req.method === "HEAD") return res.end();
    return res.end(data);
  } catch (error) {
    if (res.headersSent) return res.end();
    return send(res, error.status || 500, { error: error.status ? error.message : "Máy chủ gặp lỗi. Hãy kiểm tra log máy chủ." });
  }
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`StudyFlow V6.1 đang chạy tại http://localhost:${PORT}`);
  console.log(`AI base URL: ${BASE_URL}; model: ${DEFAULT_MODEL}; API key configured: ${Boolean(API_KEY)}`);
});
