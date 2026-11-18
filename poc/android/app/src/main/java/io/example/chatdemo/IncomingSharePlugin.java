package io.example.chatdemo;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** 接收其他 App 分享过来的文字或图片，也处理划词菜单的 PROCESS_TEXT */
@CapacitorPlugin(name = "IncomingShare")
public class IncomingSharePlugin extends Plugin {

    private static final int MAX_IMAGE_BYTES = 12 * 1024 * 1024;

    @PluginMethod
    public void getPending(PluginCall call) {
        call.resolve(readIntent(getActivity().getIntent()));
    }

    @Override
    public void handleOnNewIntent(Intent intent) {
        notifyListeners("incomingShare", readIntent(intent));
    }

    private JSObject readIntent(Intent intent) {
        JSObject result = new JSObject();
        if (intent == null) {
            return result;
        }
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null && !text.isEmpty()) {
                result.put("text", text);
            }
            Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream != null) {
                try {
                    JSObject image = readImage(stream);
                    if (image != null) {
                        result.put("image", image);
                    }
                } catch (Exception ignored) {
                    // 读不到图片时只消费文字，避免分享入口整个失败
                }
            }
        } else if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
            CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            if (text != null && text.length() > 0) {
                result.put("text", text.toString());
            }
        }
        return result;
    }

    private JSObject readImage(Uri uri) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        String mime = resolver.getType(uri);
        if (mime == null) {
            mime = "image/jpeg";
        }
        InputStream input = resolver.openInputStream(uri);
        if (input == null) {
            return null;
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) > 0) {
            total += read;
            if (total > MAX_IMAGE_BYTES) {
                input.close();
                return null;
            }
            output.write(buffer, 0, read);
        }
        input.close();
        String dataUrl = "data:" + mime + ";base64," +
            Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        JSObject image = new JSObject();
        image.put("dataUrl", dataUrl);
        image.put("name", queryName(resolver, uri, mime));
        image.put("mimeType", mime);
        return image;
    }

    private String queryName(ContentResolver resolver, Uri uri, String mime) {
        String name = null;
        try (Cursor cursor = resolver.query(
            uri,
            new String[] { OpenableColumns.DISPLAY_NAME },
            null,
            null,
            null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    name = cursor.getString(index);
                }
            }
        } catch (Exception ignored) {
            // 某些 content provider 不支持查询，退回默认文件名
        }
        if (name == null || name.trim().isEmpty()) {
            String ext = mime.contains("/") ? mime.substring(mime.indexOf('/') + 1) : "jpg";
            name = "shared-" + System.currentTimeMillis() + "." + ext;
        }
        return name;
    }
}
