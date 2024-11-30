import logging
import threading
import asyncio
from flask import Flask, jsonify
from flask_cors import CORS
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv
import os

# Загрузка переменных окружения из .env файла
load_dotenv()

# Логгирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получаем BOT_TOKEN из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Проверяем, что BOT_TOKEN был загружен
if not BOT_TOKEN:
    logger.error("BOT_TOKEN не найден в переменных окружения!")
    exit(1)

app = Flask(__name__)

# Разрешаем CORS для всех доменов
CORS(app)

# В памяти храним файлы, привязанные к user_id
user_files = {}

# Telegram Bot Handlers
telegram_app = ApplicationBuilder().token(BOT_TOKEN).build()

# Асинхронный обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    await update.message.reply_text(
        f"Привет! Ваш Telegram ID: {user_id}\n"
        "Отправьте файл, чтобы загрузить его."
    )

# Асинхронный обработчик документов
async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    document = update.message.document

    if document:
        file_id = document.file_id
        file_name = document.file_name

        if user_id not in user_files:
            user_files[user_id] = []
        user_files[user_id].append({"file_id": file_id, "file_name": file_name})

        logger.info(f"Files for user {user_id}: {user_files[user_id]}")

        button = InlineKeyboardButton(
            "Перейти на сайт", url=f"http://localhost:3000/?start={user_id}"
        )
        keyboard = InlineKeyboardMarkup([[button]])

        await update.message.reply_text(
            f"Файл '{file_name}' успешно загружен!", reply_markup=keyboard
        )
    else:
        await update.message.reply_text("Пожалуйста, отправьте документ.")

# Добавляем обработчики
telegram_app.add_handler(CommandHandler("start", start))
telegram_app.add_handler(MessageHandler(filters.Document.ALL, handle_file))

# Flask API для получения списка файлов
@app.route("/get_files/<int:user_id>", methods=["GET"])
def get_user_files(user_id):
    logger.info(f"Получение файлов для пользователя {user_id}")
    if user_id in user_files:
        return jsonify({"files": user_files[user_id]})
    return jsonify({"error": "Файлы не найдены"}), 404

# Flask API для получения ссылки на файл
@app.route("/get_file_link/<file_id>", methods=["GET"])
def get_file_link(file_id):
    async def fetch_file_link():
        try:
            file = await telegram_app.bot.get_file(file_id)
            
            # Проверяем, содержит ли file.file_path базовый URL
            if file.file_path.startswith("https://"):
                file_link = file.file_path  # Используем полный URL напрямую
            else:
                # Строим ссылку вручную, если путь относительный
                file_link = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file.file_path}"
            
            return {"file_link": file_link}
        except Exception as e:
            return {"error": str(e)}

    # Выполнение асинхронной функции в loop бота
    future = asyncio.run_coroutine_threadsafe(fetch_file_link(), bot_loop)
    result = future.result()  # Ожидаем выполнения
    return jsonify(result)


# Запуск Telegram Bot в отдельном потоке
def run_telegram_bot():
    global bot_loop
    bot_loop = asyncio.new_event_loop()  # Создаем отдельный event loop
    asyncio.set_event_loop(bot_loop)  # Устанавливаем его как текущий
    bot_loop.run_until_complete(telegram_app.run_polling())  # Запускаем бота

# Запуск Flask приложения
def run_flask():
    app.run(host="0.0.0.0", port=5000)

if __name__ == "__main__":
    logger.info("Запуск приложения...")

    # Запуск Telegram Bot и Flask в отдельных потоках
    threading.Thread(target=run_telegram_bot, daemon=True).start()
    run_flask()
