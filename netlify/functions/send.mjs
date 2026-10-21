// Принимает заявки с сайта и отправляет их администратору в Telegram.
// Токен бота хранится в настройках Netlify (Environment variables) и не виден на сайте.
// Нужны переменные: BOT_TOKEN и ADMIN_CHAT_ID.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  let data;
  try { data = JSON.parse(await req.text()); } catch { return json({ ok: false, error: "json" }, 400); }

  if (data.website) return json({ ok: true }); // ловушка для ботов

  const team = String(data.team || "").trim().slice(0, 40);
  const nick = String(data.nick || "").trim();
  const gameId = String(data.gameId || "").trim();
  const tg = String(data.telegram || "").trim().replace(/^@+/, "");
  const slot = Number(data.slot);
  const seed = Number(data.seed);

  if (!team || nick.length < 2 || nick.length > 24) return json({ ok: false, error: "nick" }, 400);
  if (!/^\d{4,12}$/.test(gameId)) return json({ ok: false, error: "gameId" }, 400);
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(tg)) return json({ ok: false, error: "telegram" }, 400);
  if (!Number.isInteger(slot) || slot < 1 || slot > 20) return json({ ok: false, error: "slot" }, 400);

  const token = process.env.BOT_TOKEN;
  const chatId = process.env.ADMIN_CHAT_ID;
  if (!token || !chatId) return json({ ok: false, error: "not_configured" }, 500);

  const when = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" });
  const text =
    "🆕 <b>Новая заявка на турнир</b>\n\n" +
    `Команда: <b>${esc(team)}</b>${Number.isInteger(seed) ? ` (№${seed})` : ""}\n` +
    `Место: <b>${slot}</b>\n` +
    `Ник: <b>${esc(nick)}</b>\n` +
    `Игровой ID: <code>${esc(gameId)}</code>\n` +
    `Telegram: @${esc(tg)}\n` +
    `Время: ${esc(when)}`;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: "Написать игроку", url: `https://t.me/${tg}` }]] },
    }),
  });
  if (!r.ok) return json({ ok: false, error: "telegram_api" }, 502);
  return json({ ok: true });
};

export const config = { path: "/api/send" };
