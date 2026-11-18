package io.example.chatdemo;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/** 朗读期间保持进程与音频活跃；通知本身也提供回到 App 的入口。 */
public class MediaKeepAliveService extends Service {

    private static final String CHANNEL_ID = "ds_tts_playback";
    private static final int NOTIFICATION_ID = 2107;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        String title = intent != null ? intent.getStringExtra("title") : null;
        if (title == null || title.isEmpty()) {
            title = "正在朗读";
        }
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            this,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("点击回到对话")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
        startForeground(NOTIFICATION_ID, notification);
        return START_NOT_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "语音朗读",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("朗读回复时保持播放");
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
