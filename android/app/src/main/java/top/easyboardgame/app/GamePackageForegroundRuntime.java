package top.easyboardgame.app;

import android.content.Context;
import android.util.Log;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;
import org.json.JSONObject;

final class GamePackageForegroundRuntime {

    private static final String TAG = "GamePkgFgRuntime";
    private static final String ROOT_DIR = "game-packages";
    private static final String CURRENT_DIR = "current";
    private static final String STAGING_DIR = "staging";
    private static final String ASSETS_DIR = "assets";
    private static final String ARCHIVE_FILE = "package.zip";
    private static final String STATE_FILE = "install-state.json";
    private static final String METADATA_FILE = "metadata.json";
    private static final int HTTP_RANGE_NOT_SATISFIABLE = 416;
    private static final int BUFFER_SIZE = 16 * 1024;

    private GamePackageForegroundRuntime() {}

    static void runTask(
        Context context,
        AndroidDownloadTaskStore taskStore,
        AndroidDownloadTaskRecord task,
        AtomicBoolean cancelFlag,
        Runnable onProgress
    ) {
        try {
            executeGamePackageTask(context, taskStore, task, cancelFlag, onProgress);
        } catch (Exception error) {
            Log.e(TAG, "runTask failed taskId=" + task.taskId + " logicalId=" + task.logicalId, error);
            taskStore.markFailed(task.taskId, classifyInstallErrorCode(error), error.getMessage(), System.currentTimeMillis());
            emitInstallState(context, task.logicalId, "failed", null, null, classifyInstallErrorCode(error), error.getMessage(), task.packageVersion, null, null);
        }
    }

    static void emitQueuedOrRunningState(Context context, AndroidDownloadTaskRecord record) {
        if (record == null) {
            return;
        }
        boolean active = AndroidDownloadTaskRecord.STATUS_RUNNING.equals(record.status) || AndroidDownloadTaskRecord.STATUS_VERIFYING.equals(record.status);
        emitInstallState(context, record.logicalId, active ? "manifest" : "queued", null, "indeterminate", null, null, record.packageVersion, null, null);
    }

    static void emitCancelledState(Context context, AndroidDownloadTaskRecord record) {
        if (record == null) {
            return;
        }
        emitInstallState(context, record.logicalId, "failed", null, null, "cancelled", "下载已取消", record.packageVersion, null, null);
    }

    static String buildNotificationText(AndroidDownloadTaskRecord activeTask, int queuedCount) {
        if (activeTask == null) {
            return String.format(Locale.ROOT, "队列中还有 %d 个任务等待执行", queuedCount);
        }
        int percent = activeTask.totalBytes > 0
            ? (int) Math.max(0, Math.min(100, Math.round((activeTask.downloadedBytes * 100f) / activeTask.totalBytes)))
            : -1;
        if (percent < 0) {
            return queuedCount > 0 ? String.format(Locale.ROOT, "正在准备下载，后面还有 %d 个任务排队", queuedCount) : "正在准备下载";
        }
        return queuedCount > 0
            ? String.format(Locale.ROOT, "当前 %d%%，后面还有 %d 个任务排队", percent, queuedCount)
            : String.format(Locale.ROOT, "当前 %d%%", percent);
    }

    private static void executeGamePackageTask(
        Context context,
        AndroidDownloadTaskStore taskStore,
        AndroidDownloadTaskRecord task,
        AtomicBoolean cancelFlag,
        Runnable onProgress
    ) throws Exception {
        if (!AndroidDownloadTaskRecord.KIND_GAME_PACKAGE.equals(task.kind)) {
            throw new IOException("当前仅支持游戏包下载任务");
        }

        String gameId = task.logicalId;
        File gameDir = new File(getRootDir(context), gameId);
        File stagingDir = new File(new File(gameDir, STAGING_DIR), sanitizeFileSegment(safe(task.packageVersion, "unknown")));
        File archiveFile = new File(task.destinationPath != null ? task.destinationPath : new File(stagingDir, ARCHIVE_FILE).getAbsolutePath());
        File archivePartFile = new File(task.partialPath != null ? task.partialPath : new File(stagingDir, ARCHIVE_FILE + ".part").getAbsolutePath());
        File stagingAssetsDir = new File(stagingDir, ASSETS_DIR);
        File currentDir = new File(gameDir, CURRENT_DIR);
        File currentAssetsDir = new File(currentDir, ASSETS_DIR);
        long installedAt = System.currentTimeMillis();

        if (!stagingDir.exists() && !stagingDir.mkdirs()) {
            throw new IOException("创建临时目录失败");
        }
        if (!stagingAssetsDir.exists() && !stagingAssetsDir.mkdirs()) {
            throw new IOException("创建临时目录失败");
        }

        emitInstallState(context, gameId, "manifest", null, "indeterminate", null, null, task.packageVersion, null, null);
        downloadArchive(context, taskStore, task, archiveFile, archivePartFile, cancelFlag, onProgress);
        taskStore.markVerifying(task.taskId, System.currentTimeMillis());
        emitInstallState(context, gameId, "verifying", 100, "indeterminate", null, null, task.packageVersion, null, null);

        deleteRecursively(stagingAssetsDir);
        if (!stagingAssetsDir.mkdirs() && !stagingAssetsDir.exists()) {
            throw new IOException("创建解压目录失败");
        }
        extractArchive(archiveFile, stagingAssetsDir, cancelFlag);
        if (cancelFlag.get()) {
            throw new IOException("安装已取消");
        }

        deleteRecursively(currentDir);
        if (!currentDir.mkdirs() && !currentDir.exists()) {
            throw new IOException("创建安装目录失败");
        }
        Files.move(stagingAssetsDir.toPath(), currentAssetsDir.toPath(), StandardCopyOption.REPLACE_EXISTING);
        writeMetadata(new File(currentDir, METADATA_FILE), gameId, safe(task.runtimeChannel, "stable"), safe(task.packageId, gameId), safe(task.packageVersion, "unknown"), installedAt);

        taskStore.markCompleted(task.taskId, archiveFile.length(), System.currentTimeMillis());
        emitInstallState(context, gameId, "installed", null, null, null, null, task.packageVersion, currentAssetsDir.getAbsolutePath(), installedAt);
        deleteRecursively(stagingDir);
        onProgress.run();
    }

    private static void downloadArchive(
        Context context,
        AndroidDownloadTaskStore taskStore,
        AndroidDownloadTaskRecord task,
        File targetFile,
        File partFile,
        AtomicBoolean cancelFlag,
        Runnable onProgress
    ) throws Exception {
        if (targetFile.exists() && isChecksumMatch(targetFile, task.checksum)) {
            taskStore.updateRunningProgress(task.taskId, targetFile.length(), targetFile.length(), AndroidDownloadTaskRecord.STATUS_RUNNING, System.currentTimeMillis());
            emitInstallState(context, task.logicalId, "downloading", 100, "determinate", null, null, task.packageVersion, null, null);
            return;
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(task.sourceUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept", "application/zip,application/octet-stream");
        long resumedBytes = partFile.exists() ? partFile.length() : 0L;
        if (resumedBytes > 0) {
            connection.setRequestProperty("Range", "bytes=" + resumedBytes + "-");
        }

        try {
            int responseCode = connection.getResponseCode();
            boolean appendMode = false;
            if (resumedBytes > 0 && responseCode == HttpURLConnection.HTTP_PARTIAL) {
                appendMode = true;
            } else if (resumedBytes > 0 && responseCode == HttpURLConnection.HTTP_OK) {
                if (!partFile.delete() && partFile.exists()) {
                    throw new IOException("重置续传文件失败");
                }
                resumedBytes = 0L;
            } else if (resumedBytes > 0 && responseCode == HTTP_RANGE_NOT_SATISFIABLE) {
                if (isChecksumMatch(partFile, task.checksum)) {
                    if (targetFile.exists() && !targetFile.delete()) {
                        throw new IOException("清理旧安装包失败");
                    }
                    if (!partFile.renameTo(targetFile)) {
                        throw new IOException("恢复已完成资源包失败");
                    }
                    taskStore.updateRunningProgress(task.taskId, targetFile.length(), targetFile.length(), AndroidDownloadTaskRecord.STATUS_RUNNING, System.currentTimeMillis());
                    emitInstallState(context, task.logicalId, "downloading", 100, "determinate", null, null, task.packageVersion, null, null);
                    return;
                }
                if (!partFile.delete() && partFile.exists()) {
                    throw new IOException("重置不可续传文件失败");
                }
                throw new IOException("服务端拒绝续传，且本地临时资源包校验失败");
            }
            if (responseCode < 200 || responseCode >= 300) {
                throw new IOException("下载失败，HTTP " + responseCode);
            }

            long totalBytes = resolveTotalBytes(connection, resumedBytes, responseCode);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            if (appendMode) {
                try (InputStream existingInput = new BufferedInputStream(new FileInputStream(partFile))) {
                    byte[] existingBuffer = new byte[BUFFER_SIZE];
                    int existingRead;
                    while ((existingRead = existingInput.read(existingBuffer)) != -1) {
                        digest.update(existingBuffer, 0, existingRead);
                    }
                }
            }

            long downloadedBytes = resumedBytes;
            int lastPercent = -1;
            try (
                InputStream rawInput = new BufferedInputStream(connection.getInputStream());
                BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(partFile, appendMode))
            ) {
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = rawInput.read(buffer)) != -1) {
                    if (cancelFlag.get()) {
                        throw new IOException("安装已取消");
                    }
                    output.write(buffer, 0, read);
                    digest.update(buffer, 0, read);
                    downloadedBytes += read;
                    taskStore.updateRunningProgress(task.taskId, downloadedBytes, totalBytes, AndroidDownloadTaskRecord.STATUS_RUNNING, System.currentTimeMillis());
                    if (totalBytes > 0) {
                        int percent = (int) Math.max(0, Math.min(100, Math.round((downloadedBytes * 100f) / totalBytes)));
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            emitInstallState(context, task.logicalId, "downloading", percent, "determinate", null, null, task.packageVersion, null, null);
                            onProgress.run();
                        }
                    } else {
                        emitInstallState(context, task.logicalId, "downloading", null, "indeterminate", null, null, task.packageVersion, null, null);
                    }
                }
            }

            String actualChecksum = bytesToHex(digest.digest());
            if (task.checksum != null && !task.checksum.equalsIgnoreCase(actualChecksum)) {
                throw new IOException("下载包校验失败");
            }
            if (targetFile.exists() && !targetFile.delete()) {
                throw new IOException("清理旧安装包失败");
            }
            if (!partFile.renameTo(targetFile)) {
                throw new IOException("写入安装包失败");
            }
        } finally {
            connection.disconnect();
        }
    }

    private static void emitInstallState(
        Context context,
        String gameId,
        String status,
        Integer progressPercent,
        String progressMode,
        String errorCode,
        String errorMessage,
        String assetPackVersion,
        String assetRootPath,
        Long installedAt
    ) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("gameId", gameId);
            payload.put("status", status);
            if (progressPercent != null) payload.put("progressPercent", progressPercent.intValue());
            if (progressMode != null) payload.put("progressMode", progressMode);
            if (errorCode != null && !errorCode.isEmpty()) payload.put("errorCode", errorCode);
            if (errorMessage != null && !errorMessage.isEmpty()) payload.put("errorMessage", errorMessage);
            if (assetPackVersion != null && !assetPackVersion.isEmpty()) payload.put("assetPackVersion", assetPackVersion);
            if (assetRootPath != null && !assetRootPath.isEmpty()) payload.put("assetRootPath", assetRootPath);
            if (installedAt != null) payload.put("installedAt", installedAt.longValue());
            payload.put("updatedAt", System.currentTimeMillis());
            persistInstallState(context, gameId, payload);
            GamePackageInstallEventHub.dispatch(payload);
        } catch (Exception error) {
            Log.w(TAG, "emitInstallState failed gameId=" + gameId, error);
        }
    }

    private static void persistInstallState(Context context, String gameId, JSONObject payload) throws IOException {
        File stateFile = new File(new File(getRootDir(context), gameId), STATE_FILE);
        File parent = stateFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("创建安装状态目录失败");
        }
        try (FileOutputStream output = new FileOutputStream(stateFile)) {
            output.write((payload.toString() + "\n").getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void extractArchive(File archiveFile, File outputDir, AtomicBoolean cancelFlag) throws IOException {
        String outputRoot = outputDir.getCanonicalPath();
        try (ZipInputStream zipInputStream = new ZipInputStream(new BufferedInputStream(new FileInputStream(archiveFile)))) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                if (cancelFlag.get()) throw new IOException("安装已取消");
                File targetFile = new File(outputDir, entry.getName());
                String canonicalTargetPath = targetFile.getCanonicalPath();
                if (!canonicalTargetPath.startsWith(outputRoot + File.separator) && !canonicalTargetPath.equals(outputRoot)) throw new IOException("压缩包路径非法: " + entry.getName());
                if (entry.isDirectory()) {
                    if (!targetFile.mkdirs() && !targetFile.exists()) throw new IOException("创建目录失败: " + targetFile.getAbsolutePath());
                    continue;
                }
                File parent = targetFile.getParentFile();
                if (parent != null && !parent.mkdirs() && !parent.exists()) throw new IOException("创建目录失败: " + parent.getAbsolutePath());
                try (BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(targetFile))) {
                    byte[] buffer = new byte[BUFFER_SIZE];
                    int read;
                    while ((read = zipInputStream.read(buffer)) != -1) {
                        if (cancelFlag.get()) throw new IOException("安装已取消");
                        output.write(buffer, 0, read);
                    }
                }
            }
        }
    }

    private static void writeMetadata(File targetFile, String gameId, String runtimeChannel, String assetPackId, String assetPackVersion, long installedAt) throws Exception {
        JSONObject metadata = new JSONObject();
        metadata.put("gameId", gameId);
        metadata.put("runtimeChannel", runtimeChannel);
        metadata.put("assetPackId", assetPackId);
        metadata.put("assetPackVersion", assetPackVersion);
        metadata.put("installedAt", installedAt);
        File parent = targetFile.getParentFile();
        if (parent != null && !parent.mkdirs() && !parent.exists()) throw new IOException("创建元数据目录失败");
        try (FileOutputStream output = new FileOutputStream(targetFile)) {
            output.write((metadata.toString(2) + "\n").getBytes(StandardCharsets.UTF_8));
        }
    }

    private static File getRootDir(Context context) {
        File rootDir = new File(context.getFilesDir(), ROOT_DIR);
        if (!rootDir.exists()) rootDir.mkdirs();
        return rootDir;
    }

    private static long resolveTotalBytes(HttpURLConnection connection, long resumedBytes, int responseCode) {
        long contentLength = connection.getContentLengthLong();
        if (responseCode != HttpURLConnection.HTTP_PARTIAL) return contentLength;
        String contentRange = connection.getHeaderField("Content-Range");
        if (contentRange != null) {
            int slashIndex = contentRange.lastIndexOf('/');
            if (slashIndex >= 0 && slashIndex + 1 < contentRange.length()) {
                try {
                    long parsed = Long.parseLong(contentRange.substring(slashIndex + 1).trim());
                    if (parsed > 0) return parsed;
                } catch (NumberFormatException ignored) {}
            }
        }
        return contentLength > 0 ? resumedBytes + contentLength : contentLength;
    }

    private static boolean isChecksumMatch(File file, String checksum) throws Exception {
        if (!file.exists()) return false;
        if (checksum == null || checksum.isEmpty()) return true;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream inputStream = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = inputStream.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        return checksum.equalsIgnoreCase(bytesToHex(digest.digest()));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) builder.append(String.format("%02x", value));
        return builder.toString();
    }

    private static String classifyInstallErrorCode(Exception error) {
        if (error == null) return "unknown";
        if (error instanceof SocketTimeoutException) return "network-timeout";
        if (error instanceof ZipException) return "archive-invalid";
        String message = error.getMessage() != null ? error.getMessage() : "";
        String lower = message.toLowerCase(Locale.ROOT);
        if (lower.contains("http ")) return "http-error";
        if (message.contains("续传")) return "resume-not-supported";
        if (message.contains("校验")) return "checksum-mismatch";
        if (lower.contains("enospc") || lower.contains("no space left") || message.contains("空间不足")) return "insufficient-storage";
        if (message.contains("取消")) return "cancelled";
        if (message.contains("压缩包") || message.contains("路径非法")) return "archive-invalid";
        if (error instanceof IOException) return "file-io";
        return "unknown";
    }

    private static void deleteRecursively(File target) {
        if (target == null || !target.exists()) return;
        File[] children = target.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        if (!target.delete() && target.exists()) Log.w(TAG, "deleteRecursively failed: " + target.getAbsolutePath());
    }

    private static String sanitizeFileSegment(String value) {
        return value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
