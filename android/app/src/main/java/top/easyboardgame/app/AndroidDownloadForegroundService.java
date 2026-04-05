package top.easyboardgame.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AndroidDownloadForegroundService extends Service {

    private static final String CHANNEL_ID = "boardgame-downloads";
    private static final int NOTIFICATION_ID = 41001;

    private static final String ACTION_ENQUEUE = "top.easyboardgame.app.action.DOWNLOAD_ENQUEUE";
    private static final String ACTION_CANCEL = "top.easyboardgame.app.action.DOWNLOAD_CANCEL";
    private static final String ACTION_RECONCILE = "top.easyboardgame.app.action.DOWNLOAD_RECONCILE";

    private static final String EXTRA_KIND = "kind";
    private static final String EXTRA_LOGICAL_ID = "logicalId";
    private static final String EXTRA_DISPLAY_NAME = "displayName";
    private static final String EXTRA_SOURCE_URL = "sourceUrl";
    private static final String EXTRA_CHECKSUM = "checksum";
    private static final String EXTRA_DESTINATION_PATH = "destinationPath";
    private static final String EXTRA_PARTIAL_PATH = "partialPath";
    private static final String EXTRA_TASK_ID = "taskId";

    private AndroidDownloadTaskStore taskStore;

    public static Intent buildEnqueueIntent(
        Context context,
        String kind,
        String logicalId,
        String displayName,
        String sourceUrl,
        String checksum,
        String destinationPath,
        String partialPath
    ) {
        Intent intent = new Intent(context, AndroidDownloadForegroundService.class);
        intent.setAction(ACTION_ENQUEUE);
        intent.putExtra(EXTRA_KIND, kind);
        intent.putExtra(EXTRA_LOGICAL_ID, logicalId);
        intent.putExtra(EXTRA_DISPLAY_NAME, displayName);
        intent.putExtra(EXTRA_SOURCE_URL, sourceUrl);
        intent.putExtra(EXTRA_CHECKSUM, checksum);
        intent.putExtra(EXTRA_DESTINATION_PATH, destinationPath);
        intent.putExtra(EXTRA_PARTIAL_PATH, partialPath);
        return intent;
    }

    public static Intent buildCancelIntent(Context context, String taskId) {
        Intent intent = new Intent(context, AndroidDownloadForegroundService.class);
        intent.setAction(ACTION_CANCEL);
        intent.putExtra(EXTRA_TASK_ID, taskId);
        return intent;
    }

    public static Intent buildReconcileIntent(Context context) {
        Intent intent = new Intent(context, AndroidDownloadForegroundService.class);
        intent.setAction(ACTION_RECONCILE);
        return intent;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        taskStore = new AndroidDownloadTaskStore(getApplicationContext());
        taskStore.reconcileTransientTasks();
        ensureNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_ENQUEUE.equals(action)) {
                handleEnqueue(intent);
            } else if (ACTION_CANCEL.equals(action)) {
                handleCancel(intent);
            } else if (ACTION_RECONCILE.equals(action)) {
                taskStore.reconcileTransientTasks();
            }
        }

        refreshForegroundState();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void handleEnqueue(Intent intent) {
        String kind = intent.getStringExtra(EXTRA_KIND);
        String logicalId = intent.getStringExtra(EXTRA_LOGICAL_ID);
        String displayName = intent.getStringExtra(EXTRA_DISPLAY_NAME);
        String sourceUrl = intent.getStringExtra(EXTRA_SOURCE_URL);
        String checksum = intent.getStringExtra(EXTRA_CHECKSUM);
        String destinationPath = intent.getStringExtra(EXTRA_DESTINATION_PATH);
        String partialPath = intent.getStringExtra(EXTRA_PARTIAL_PATH);

        taskStore.enqueueOrReuse(
            kind != null ? kind : AndroidDownloadTaskRecord.KIND_GAME_PACKAGE,
            logicalId != null ? logicalId : "",
            displayName != null ? displayName : "",
            sourceUrl != null ? sourceUrl : "",
            checksum,
            destinationPath,
            partialPath
        );
    }

    private void handleCancel(Intent intent) {
        String taskId = intent.getStringExtra(EXTRA_TASK_ID);
        if (taskId == null || taskId.trim().isEmpty()) {
            return;
        }
        taskStore.cancelTask(taskId.trim());
    }

    private void refreshForegroundState() {
        AndroidDownloadTaskRecord activeTask = taskStore.getActiveTask();
        int queuedCount = taskStore.countQueuedTasks();
        if (activeTask == null && queuedCount == 0) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return;
        }
        NotificationCompat.Builder builder = createNotificationBuilder(activeTask, queuedCount);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, builder.build());
        }
    }

    private android.app.Notification buildNotification() {
        AndroidDownloadTaskRecord activeTask = taskStore.getActiveTask();
        return createNotificationBuilder(activeTask, taskStore.countQueuedTasks()).build();
    }

    private NotificationCompat.Builder createNotificationBuilder(
        AndroidDownloadTaskRecord activeTask,
        int queuedCount
    ) {
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | pendingIntentImmutableFlag()
        );

        String title = activeTask != null
            ? String.format(Locale.ROOT, "下载中：%s", activeTask.displayName == null || activeTask.displayName.isEmpty() ? activeTask.logicalId : activeTask.displayName)
            : "下载队列待处理";
        String text = activeTask != null
            ? buildActiveTaskSummary(activeTask, queuedCount)
            : String.format(Locale.ROOT, "队列中还有 %d 个任务等待执行", queuedCount);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setContentIntent(contentIntent);
    }

    private String buildActiveTaskSummary(AndroidDownloadTaskRecord activeTask, int queuedCount) {
        String statusLabel = AndroidDownloadTaskRecord.STATUS_VERIFYING.equals(activeTask.status)
            ? "校验中"
            : "等待接管下载执行器";
        if (queuedCount <= 0) {
            return statusLabel;
        }
        return String.format(Locale.ROOT, "%s，后面还有 %d 个任务排队", statusLabel, queuedCount);
    }

    private int pendingIntentImmutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "下载任务",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("用于托管 Android 原生下载任务与队列状态。");
        manager.createNotificationChannel(channel);
    }
}
