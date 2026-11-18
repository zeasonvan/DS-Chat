package io.example.chatdemo;

import android.content.Intent;
import android.net.Uri;
import android.service.quicksettings.TileService;

/** 下拉快捷开关里的「新建对话」 */
public class NewChatTileService extends TileService {

    @Override
    public void onClick() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("dschat://chat/new"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivityAndCollapse(intent);
    }
}
