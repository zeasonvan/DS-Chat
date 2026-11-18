package com.zeasonvan.dschat;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 窗口底色：启动页阶段状态栏区域显示的是窗口背景，
 * 网页渲染完成后由前端把窗口底色切回应用背景色，避免状态栏留一条异色条。
 */
@CapacitorPlugin(name = "UiTheme")
public class UiThemePlugin extends Plugin {

    /** 网页已渲染：放行系统启动页 */
    @PluginMethod
    public void hideSplash(PluginCall call) {
        MainActivity.markWebReady();
        call.resolve();
    }

    @PluginMethod
    public void setWindowBackground(PluginCall call) {
        String color = call.getString("color");
        if (color == null) {
            call.reject("color is required");
            return;
        }
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException error) {
            call.reject("invalid color: " + color);
            return;
        }
        getActivity().runOnUiThread(() -> getActivity().getWindow().setBackgroundDrawable(new ColorDrawable(parsed)));
        JSObject result = new JSObject();
        result.put("applied", color);
        call.resolve(result);
    }
}
