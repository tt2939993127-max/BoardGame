package top.easyboardgame.app;

import android.content.Context;
import android.util.Log;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

final class AndroidDownloadTaskStore {

    private static final String TAG = "AndroidDownloadStore";
    private static final String ROOT_DIR = "android-download-runtime";
    private static final String REGISTRY_FILE = "task-registry.json";

    private final Context appContext;
    private final Object lock = new Object();

    AndroidDownloadTaskStore(Context context) {
        this.appContext = context.getApplicationContext();
    }

    List<AndroidDownloadTaskRecord> readAll() {
        synchronized (lock) {
            return readAllLocked();
        }
    }

    AndroidDownloadTaskRecord enqueueOrReuse(
        String kind,
        String logicalId,
        String displayName,
        String sourceUrl,
        String checksum,
        String destinationPath,
        String partialPath
    ) {
        synchronized (lock) {
            long now = System.currentTimeMillis();
            List<AndroidDownloadTaskRecord> records = readAllLocked();
            for (AndroidDownloadTaskRecord record : records) {
                if (record.matchesTarget(kind, logicalId) && !record.isTerminal()) {
                    Log.i(TAG, "enqueueOrReuse reuse taskId=" + record.taskId + " status=" + record.status);
                    return record;
                }
            }

            AndroidDownloadTaskRecord record = AndroidDownloadTaskRecord.create(
                UUID.randomUUID().toString(),
                kind,
                logicalId,
                displayName,
                sourceUrl,
                checksum,
                destinationPath,
                partialPath,
                now
            );
            records.add(record);

            if (!hasActiveTask(records)) {
                record.markRunning(now);
            }

            writeAllLocked(records);
            Log.i(TAG, "enqueueOrReuse created taskId=" + record.taskId + " status=" + record.status + " logicalId=" + logicalId);
            return record;
        }
    }

    AndroidDownloadTaskRecord cancelTask(String taskId) {
        synchronized (lock) {
            long now = System.currentTimeMillis();
            List<AndroidDownloadTaskRecord> records = readAllLocked();
            AndroidDownloadTaskRecord cancelled = null;
            for (AndroidDownloadTaskRecord record : records) {
                if (!safeEquals(record.taskId, taskId)) {
                    continue;
                }
                record.markCancelled(now);
                cancelled = record;
                break;
            }

            if (cancelled != null && cancelled.isActive()) {
                promoteNextQueuedLocked(records, now);
            }

            writeAllLocked(records);
            return cancelled;
        }
    }

    AndroidDownloadTaskRecord getActiveTask() {
        synchronized (lock) {
            List<AndroidDownloadTaskRecord> records = readAllLocked();
            for (AndroidDownloadTaskRecord record : records) {
                if (record.isActive()) {
                    return record;
                }
            }
            return null;
        }
    }

    int countQueuedTasks() {
        synchronized (lock) {
            int count = 0;
            for (AndroidDownloadTaskRecord record : readAllLocked()) {
                if (AndroidDownloadTaskRecord.STATUS_QUEUED.equals(record.status)) {
                    count += 1;
                }
            }
            return count;
        }
    }

    void reconcileTransientTasks() {
        synchronized (lock) {
            long now = System.currentTimeMillis();
            List<AndroidDownloadTaskRecord> records = readAllLocked();
            boolean changed = false;
            for (AndroidDownloadTaskRecord record : records) {
                if (!record.isActive()) {
                    continue;
                }
                record.markQueued(now);
                changed = true;
            }

            if (changed) {
                promoteNextQueuedLocked(records, now);
                writeAllLocked(records);
            }
        }
    }

    private List<AndroidDownloadTaskRecord> readAllLocked() {
        List<AndroidDownloadTaskRecord> records = new ArrayList<>();
        File registryFile = resolveRegistryFile();
        if (!registryFile.exists()) {
            return records;
        }

        try {
            JSONObject root = new JSONObject(readText(registryFile));
            JSONArray tasks = root.optJSONArray("tasks");
            if (tasks == null) {
                return records;
            }
            for (int index = 0; index < tasks.length(); index += 1) {
                JSONObject payload = tasks.optJSONObject(index);
                if (payload == null) {
                    continue;
                }
                records.add(AndroidDownloadTaskRecord.fromJson(payload));
            }
        } catch (Exception error) {
            Log.w(TAG, "readAllLocked failed", error);
        }
        return records;
    }

    private void writeAllLocked(List<AndroidDownloadTaskRecord> records) {
        try {
            File registryFile = resolveRegistryFile();
            File parent = registryFile.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) {
                throw new IOException("创建下载注册表目录失败");
            }

            JSONArray tasks = new JSONArray();
            for (AndroidDownloadTaskRecord record : records) {
                tasks.put(record.toJson());
            }

            JSONObject root = new JSONObject();
            root.put("tasks", tasks);
            try (FileOutputStream output = new FileOutputStream(registryFile)) {
                output.write((root.toString(2) + "\n").getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception error) {
            Log.w(TAG, "writeAllLocked failed", error);
        }
    }

    private void promoteNextQueuedLocked(List<AndroidDownloadTaskRecord> records, long now) {
        if (hasActiveTask(records)) {
            return;
        }
        for (AndroidDownloadTaskRecord record : records) {
            if (!AndroidDownloadTaskRecord.STATUS_QUEUED.equals(record.status)) {
                continue;
            }
            record.markRunning(now);
            Log.i(TAG, "promoteNextQueuedLocked taskId=" + record.taskId + " logicalId=" + record.logicalId);
            return;
        }
    }

    private boolean hasActiveTask(List<AndroidDownloadTaskRecord> records) {
        for (AndroidDownloadTaskRecord record : records) {
            if (record.isActive()) {
                return true;
            }
        }
        return false;
    }

    private File resolveRegistryFile() {
        return new File(new File(appContext.getFilesDir(), ROOT_DIR), REGISTRY_FILE);
    }

    private String readText(File file) throws IOException {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private boolean safeEquals(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }
}
