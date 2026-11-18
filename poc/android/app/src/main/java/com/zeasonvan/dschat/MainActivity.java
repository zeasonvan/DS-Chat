package com.zeasonvan.dschat;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** 网页渲染完成后由 UiTheme 插件置位，系统启动页随之退场 */
    private static volatile boolean webReady = false;

    public static void markWebReady() {
        webReady = true;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 系统启动页保持到网页首帧：整屏覆盖，状态栏区域也是启动图的一部分
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        splash.setKeepOnScreenCondition(() -> !webReady);
        // 必须在 super.onCreate 之前注册，BridgeActivity 会在 onCreate 里创建 Bridge
        registerPlugin(SecureKeyStorePlugin.class);
        registerPlugin(IncomingSharePlugin.class);
        registerPlugin(MediaKeepAlivePlugin.class);
        registerPlugin(FileSaverPlugin.class);
        registerPlugin(UiThemePlugin.class);
        super.onCreate(savedInstanceState);
        // 兜底：网页脚本异常时 10 秒后也放行，避免一直停在启动页
        getWindow().getDecorView().postDelayed(MainActivity::markWebReady, 10_000);
    }
}
