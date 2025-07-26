import dotenv from "dotenv";
import { createBot } from "./bot.js";

dotenv.config();

const bot = createBot(process.env.TELEGRAM_BOT_TOKEN!);

bot.start();
