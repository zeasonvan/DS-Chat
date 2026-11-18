package io.example.chatdemo;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 朗读开始时拉起前台服务，让 WebView 的音频在后台尽量不被挂起 */
@CapacitorPlugin(name = "MediaKeepAlive")
public class MediaKeepAlivePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaKeepAliveService.class);
        intent.putExtra("title", call.getString("title", "正在朗读"));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("foreground service failed", error);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MediaKeepAliveService.class));
        call.resolve();
    }
}
