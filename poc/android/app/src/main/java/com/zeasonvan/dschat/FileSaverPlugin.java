package com.zeasonvan.dschat;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 分块接收 JS 传来的 Base64，先写入 App cache，避免大文件在 WebView 内做整块 Base64 拷贝。
 * publish 再把 cache 文件复制到系统下载目录（Android 10+ 用 MediaStore）。
 */
@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    private static final int COPY_BUFFER = 128 * 1024;

    private FileOutputStream output;
    private File file;

    @PluginMethod
    public synchronized void begin(PluginCall call) {
        String name = call.getString("name", "export.bin");
        closeQuietly();
        File directory = new File(getContext().getCacheDir(), "exports");
        if (!directory.exists() && !directory.mkdirs()) {
            call.reject("cannot create export directory");
            return;
        }
        file = new File(directory, safeName(name));
        try {
            output = new FileOutputStream(file, false);
            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("cannot open export file", error);
        }
    }

    @PluginMethod
    public synchronized void append(PluginCall call) {
        String data = call.getString("data");
        if (output == null || data == null) {
            call.reject("file not opened");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            output.write(bytes);
            call.resolve();
        } catch (Exception error) {
            call.reject("write failed", error);
        }
    }

    @PluginMethod
    public synchronized void finish(PluginCall call) {
        if (output == null || file == null) {
            call.reject("file not opened");
            return;
        }
        try {
            output.close();
            output = null;
            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("close failed", error);
        }
    }

    /** 复制到系统下载目录；成功后删除 cache 副本 */
    @PluginMethod
    public synchronized void publish(PluginCall call) {
        if (file == null || !file.exists()) {
            call.reject("file not ready");
            return;
        }
        String name = safeName(call.getString("name", file.getName()));
        String mimeType = call.getString("mimeType", "application/zip");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                publishWithMediaStore(name, mimeType, call);
            } else {
                publishLegacy(name, call);
            }
        } catch (Exception error) {
            call.reject("publish failed", error);
        }
    }

    private void publishWithMediaStore(String name, String mimeType, PluginCall call)
        throws Exception {
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = getContext()
            .getContentResolver()
            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            throw new IllegalStateException("cannot create download entry");
        }
        try (InputStream in = new FileInputStream(file); OutputStream out = getContext()
            .getContentResolver()
            .openOutputStream(uri)) {
            if (out == null) {
                throw new IllegalStateException("cannot open download stream");
            }
            copy(in, out);
        } catch (Exception error) {
            getContext().getContentResolver().delete(uri, null, null);
            throw error;
        }
        values.clear();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContext().getContentResolver().update(uri, values, null, null);
        JSObject result = new JSObject();
        result.put("name", name);
        result.put("uri", uri.toString());
        cleanupCache();
        call.resolve(result);
    }

    private void publishLegacy(String name, PluginCall call) throws Exception {
        File directory = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS
        );
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("cannot create downloads directory");
        }
        File destination = new File(directory, name);
        try (InputStream in = new FileInputStream(file); OutputStream out = new FileOutputStream(
            destination,
            false
        )) {
            copy(in, out);
        }
        JSObject result = new JSObject();
        result.put("name", name);
        result.put("path", destination.getAbsolutePath());
        cleanupCache();
        call.resolve(result);
    }

    private void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buffer = new byte[COPY_BUFFER];
        int read;
        while ((read = in.read(buffer)) > 0) {
            out.write(buffer, 0, read);
        }
        out.flush();
    }

    @PluginMethod
    public synchronized void abort(PluginCall call) {
        closeQuietly();
        if (file != null) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            file = null;
        }
        call.resolve();
    }

    private void cleanupCache() {
        if (file != null) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            file = null;
        }
    }

    private void closeQuietly() {
        if (output != null) {
            try {
                output.close();
            } catch (Exception ignored) {
                // 关闭失败时继续清理
            }
            output = null;
        }
    }

    private String safeName(String name) {
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("^\\.+", "");
        if (cleaned.isEmpty()) {
            cleaned = "export.bin";
        }
        return cleaned.length() > 120 ? cleaned.substring(0, 120) : cleaned;
    }
}
