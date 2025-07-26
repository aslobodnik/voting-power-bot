import { webhookCallback } from "grammy";
import { createBot } from "./bot.js";

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return new Response("TELEGRAM_BOT_TOKEN is not defined", { status: 500 });
    }

    const bot = createBot(token);

    // Use the 'cloudflare-mod' adapter for better integration
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");

    return handleUpdate(request);
  },
};
