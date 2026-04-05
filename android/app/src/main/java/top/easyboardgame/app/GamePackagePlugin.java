package top.easyboardgame.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipException;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "GamePackage",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = GamePackagePlugin.NOTIFICATION_PERMISSION_ALIAS),
    }
)
public class GamePackagePlugin extends Plugin {

    private static final String TAG = "GamePackagePlugin";
    static final String NOTIFICATION_PERMISSION_ALIAS = "notifications";
    private static final String ROOT_DIR = "game-packages";
    private static final String CURRENT_DIR = "current";
    private static final String STAGING_DIR = "staging";
    private static final String ASSETS_DIR = "assets";
    private static final String ARCHIVE_FILE = "package.zip";
    private static final String ARCHIVE_PART_FILE = "package.zip.part";
    private static final String METADATA_FILE = "metadata.json";
    private static final String STATE_FILE = "install-state.json";
    private static final int HTTP_RANGE_NOT_SATISFIABLE = 416;
    private static final int BUFFER_SIZE = 16 * 1024;
    private static final String ERROR_NETWORK_TIMEOUT = "network-timeout";
    private static final String ERROR_HTTP = "http-error";
    private static final String ERROR_RESUME_NOT_SUPPORTED = "resume-not-supported";
    private static final String ERROR_CHECKSUM = "checksum-mismatch";
    private static final String ERROR_INSUFFICIENT_STORAGE = "insufficient-storage";
    private static final String ERROR_ARCHIVE_INVALID = "archive-invalid";
    private static final String ERROR_FILE_IO = "file-io";
    private static final String ERROR_CANCELLED = "cancelled";
    private static final String ERROR_UNKNOWN = "unknown";
    private static final String STALE_IN_PROGRESS_ERROR_MESSAGE = "上次下载未完成，请重新发起。";
    private static final String NOTIFICATION_PERMISSION_REQUIRED_MESSAGE = "请先允许通知权限，否则后台下载通知不会显示。";
    private static final String NOTIFICATION_PERMISSION_DENIED_MESSAGE = "通知权限已被拒绝，请到系统设置中开启后再重试下载。";

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final GamePackageInstallEventHub.Listener installEventListener = payload -> mainHandler.post(() -> {
        JSObject result = new JSObject();
        copyJsonValue(payload, result, "gameId");
        copyJsonValue(payload, result, "status");
        copyJsonValue(payload, result, "progressPercent");
        copyJsonValue(payload, result, "progressMode");
        copyJsonValue(payload, result, "errorCode");
        copyJsonValue(payload, result, "errorMessage");
        copyJsonValue(payload, result, "assetPackVersion");
        copyJsonValue(payload, result, "assetRootPath");
        copyJsonValue(payload, result, "installedAt");
        copyJsonValue(payload, result, "updatedAt");
        notifyListeners("installStateChanged", result);
    });
    private AndroidDownloadTaskStore taskStore;

    @Override
    public void load() {
        super.load();
        taskStore = new AndroidDownloadTaskStore(getContext());
        GamePackageInstallEventHub.register(installEventListener);
    }

    @Override
    protected void handleOnDestroy() {
        GamePackageInstallEventHub.unregister(installEventListener);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void listInstalledPackages(PluginCall call) {
        try {
            JSArray packages = new JSArray();
            File rootDir = getRootDir();
            Log.i(TAG, "listInstalledPackages rootDir=" + rootDir.getAbsolutePath());
            File[] gameDirs = rootDir.listFiles(File::isDirectory);
            if (gameDirs != null) {
                for (File gameDir : gameDirs) {
                    File metadataFile = new File(new File(gameDir, CURRENT_DIR), METADATA_FILE);
                    if (!metadataFile.exists()) {
                        continue;
                    }

                    JSONObject metadata = readJsonFile(metadataFile);
                    File assetRootDir = new File(new File(gameDir, CURRENT_DIR), ASSETS_DIR);
                    if (!assetRootDir.exists()) {
                        continue;
                    }

                    JSObject item = new JSObject();
                    item.put("gameId", metadata.optString("gameId", gameDir.getName()));
                    item.put("runtimeChannel", metadata.optString("runtimeChannel", "stable"));
                    item.put("installedAt", metadata.optLong("installedAt", 0L));
                    item.put("assetPackVersion", metadata.optString("assetPackVersion", ""));
                    item.put("assetRootPath", buildAssetRootPath(assetRootDir));
                    packages.put(item);
                }
            }

            JSObject result = new JSObject();
            result.put("packages", packages);
            Log.i(TAG, "listInstalledPackages success count=" + packages.length());
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "listInstalledPackages failed", error);
            call.reject("读取已安装游戏包失败", error);
        }
    }

    @PluginMethod
    public void logDiagnostic(PluginCall call) {
        String message = call.getString("message", "");
        Log.i(TAG, "logDiagnostic invoked length=" + message.length());
        Log.i(TAG, "[JS-DIAG] " + message);
        call.resolve();
    }

    @PluginMethod
    public void getNotificationPermissionStatus(PluginCall call) {
        call.resolve(buildNotificationPermissionResult(false));
    }

    @PluginMethod
    public void ensureNotificationPermission(PluginCall call) {
        JSObject currentState = buildNotificationPermissionResult(false);
        if (currentState.optBoolean("granted", false) || !currentState.optBoolean("required", false)) {
            call.resolve(currentState);
            return;
        }

        Log.w(TAG, "ensureNotificationPermission requesting POST_NOTIFICATIONS");
        requestPermissionForAlias(NOTIFICATION_PERMISSION_ALIAS, call, "handleNotificationPermissionResult");
    }

    @PermissionCallback
    private void handleNotificationPermissionResult(PluginCall call) {
        JSObject result = buildNotificationPermissionResult(true);
        Log.i(TAG, "handleNotificationPermissionResult result=" + result);
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            } else {
                intent = new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", context.getPackageName(), null)
                );
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            Log.e(TAG, "openNotificationSettings failed", error);
            call.reject("打开通知设置失败", error);
        }
    }

    @PluginMethod
    public void fetchRemoteJson(PluginCall call) {
        String urlValue = normalizeNonEmpty(call.getString("url"));
        if (urlValue == null) {
            call.reject("缺少 url");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(urlValue).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("Accept", "application/json");

                int responseCode = connection.getResponseCode();
                InputStream inputStream = responseCode >= 200 && responseCode < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();

                JSObject result = new JSObject();
                result.put("status", responseCode);
                result.put("body", inputStream != null ? readInputStream(inputStream) : "");
                String contentType = normalizeNonEmpty(connection.getContentType());
                if (contentType != null) {
                    result.put("contentType", contentType);
                }

                Log.i(
                    TAG,
                    "fetchRemoteJson success url=" + urlValue
                        + " status=" + responseCode
                        + " contentType=" + (contentType != null ? contentType : "")
                );
                resolveOnMainThread(call, result);
            } catch (Exception error) {
                Log.e(TAG, "fetchRemoteJson failed url=" + urlValue, error);
                rejectOnMainThread(call, "拉取远程 JSON 失败", error);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void cancelInstall(PluginCall call) {
        String gameId = normalizeNonEmpty(call.getString("gameId"));
        if (gameId == null) {
            call.reject("缺少 gameId");
            return;
        }

        AndroidDownloadTaskRecord record = taskStore.getLatestByTarget(AndroidDownloadTaskRecord.KIND_GAME_PACKAGE, gameId);
        if (record != null && !record.isTerminal()) {
            Log.w(TAG, "cancelInstall gameId=" + gameId + " taskId=" + record.taskId);
            AndroidDownloadForegroundService.startManagedIntent(
                getContext(),
                AndroidDownloadForegroundService.buildCancelIntent(getContext(), record.taskId)
            );
        }
        call.resolve();
    }

    @PluginMethod
    public void getInstallState(PluginCall call) {
        String gameId = normalizeNonEmpty(call.getString("gameId"));
        if (gameId == null) {
            call.reject("缺少 gameId");
            return;
        }

        try {
            JSONObject payload = readJsonFile(resolveStateFile(gameId));
            JSObject result = new JSObject();
            AndroidDownloadTaskRecord taskRecord = taskStore.getLatestByTarget(AndroidDownloadTaskRecord.KIND_GAME_PACKAGE, gameId);
            boolean taskRunning = taskRecord != null && taskRecord.isActive();
            result.put("taskRunning", taskRunning);
            if (payload == null) {
                Log.i(TAG, "getInstallState empty gameId=" + gameId + " taskRunning=" + taskRunning);
                result.put("exists", false);
                call.resolve(result);
                return;
            }

            payload = normalizeStaleInstallState(gameId, payload, taskRunning, taskRecord);

            result.put("exists", true);
            copyJsonValue(payload, result, "gameId");
            copyJsonValue(payload, result, "status");
            copyJsonValue(payload, result, "progressPercent");
            copyJsonValue(payload, result, "progressMode");
            copyJsonValue(payload, result, "errorCode");
            copyJsonValue(payload, result, "errorMessage");
            copyJsonValue(payload, result, "assetPackVersion");
            copyJsonValue(payload, result, "assetRootPath");
            copyJsonValue(payload, result, "installedAt");
            copyJsonValue(payload, result, "updatedAt");
            Log.i(TAG, "getInstallState success gameId=" + gameId + " taskRunning=" + taskRunning + " payload=" + payload);
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "getInstallState failed gameId=" + gameId, error);
            call.reject("读取安装任务状态失败", error);
        }
    }

    private JSONObject normalizeStaleInstallState(String gameId, JSONObject payload, boolean taskRunning, AndroidDownloadTaskRecord taskRecord) {
        if (payload == null || taskRunning) {
            return payload;
        }

        String status = normalizeNonEmpty(payload.optString("status", null));
        if (!isInProgressStatus(status)) {
            return payload;
        }

        if (taskRecord != null && !taskRecord.isTerminal()) {
            return payload;
        }

        try {
            JSONObject normalizedPayload = new JSONObject(payload.toString());
            normalizedPayload.put("status", "failed");
            normalizedPayload.remove("progressPercent");
            normalizedPayload.remove("progressMode");
            normalizedPayload.put("errorCode", ERROR_UNKNOWN);
            normalizedPayload.put("errorMessage", STALE_IN_PROGRESS_ERROR_MESSAGE);
            normalizedPayload.put("updatedAt", System.currentTimeMillis());
            persistInstallState(gameId, normalizedPayload);
            Log.w(TAG, "normalizeStaleInstallState gameId=" + gameId + " previousStatus=" + status + " normalizedPayload=" + normalizedPayload);
            return normalizedPayload;
        } catch (Exception error) {
            Log.w(TAG, "normalizeStaleInstallState failed gameId=" + gameId + " status=" + status, error);
            return payload;
        }
    }

    @PluginMethod
    public void installGamePackage(PluginCall call) {
        JSObject notificationPermission = buildNotificationPermissionResult(false);
        if (notificationPermission.optBoolean("required", false) && !notificationPermission.optBoolean("granted", false)) {
            Log.w(TAG, "installGamePackage missing notification permission gameId=" + call.getString("gameId", ""));
            requestPermissionForAlias(NOTIFICATION_PERMISSION_ALIAS, call, "handleInstallNotificationPermissionResult");
            return;
        }

        enqueueInstallGamePackage(call);
    }

    @PermissionCallback
    private void handleInstallNotificationPermissionResult(PluginCall call) {
        JSObject permissionState = buildNotificationPermissionResult(true);
        if (!permissionState.optBoolean("granted", false)) {
            String message = permissionState.optString("message", NOTIFICATION_PERMISSION_REQUIRED_MESSAGE);
            Log.w(TAG, "installGamePackage notification permission denied message=" + message);
            call.reject(message);
            return;
        }

        enqueueInstallGamePackage(call);
    }

    private void enqueueInstallGamePackage(PluginCall call) {
        String gameId = normalizeNonEmpty(call.getString("gameId"));
        String runtimeChannel = normalizeNonEmpty(call.getString("runtimeChannel"));
        String assetPackId = normalizeNonEmpty(call.getString("assetPackId"));
        String assetPackVersion = normalizeNonEmpty(call.getString("assetPackVersion"));
        String assetPackUrl = normalizeNonEmpty(call.getString("assetPackUrl"));
        String assetPackChecksum = normalizeChecksum(call.getString("assetPackChecksum"));
        Log.i(
            TAG,
            "installGamePackage requested gameId=" + gameId
                + " runtimeChannel=" + runtimeChannel
                + " assetPackId=" + assetPackId
                + " assetPackVersion=" + assetPackVersion
                + " assetPackUrl=" + assetPackUrl
                + " assetPackChecksum=" + (assetPackChecksum != null ? assetPackChecksum : "")
        );

        if (gameId == null) {
            call.reject("缺少 gameId");
            return;
        }
        final String resolvedRuntimeChannel = runtimeChannel != null ? runtimeChannel : "stable";
        if (assetPackUrl == null) {
            call.reject("缺少 assetPackUrl");
            return;
        }
        String resolvedAssetPackId = assetPackId != null ? assetPackId : gameId;
        String resolvedAssetPackVersion = assetPackVersion != null ? assetPackVersion : "unknown";
        File gameDir = new File(getRootDir(), gameId);
        File stagingDir = new File(new File(gameDir, STAGING_DIR), sanitizeFileSegment(resolvedAssetPackVersion));
        File archiveFile = new File(stagingDir, ARCHIVE_FILE);
        File archivePartFile = new File(stagingDir, ARCHIVE_PART_FILE);
        AndroidDownloadForegroundService.startManagedIntent(
            getContext(),
            AndroidDownloadForegroundService.buildEnqueueIntent(
                getContext(),
                AndroidDownloadTaskRecord.KIND_GAME_PACKAGE,
                gameId,
                gameId,
                resolvedRuntimeChannel,
                resolvedAssetPackId,
                resolvedAssetPackVersion,
                assetPackUrl,
                assetPackChecksum,
                archiveFile.getAbsolutePath(),
                archivePartFile.getAbsolutePath()
            )
        );
        AndroidDownloadTaskRecord record = taskStore.enqueueOrReuse(
            AndroidDownloadTaskRecord.KIND_GAME_PACKAGE,
            gameId,
            gameId,
            resolvedRuntimeChannel,
            resolvedAssetPackId,
            resolvedAssetPackVersion,
            assetPackUrl,
            assetPackChecksum,
            archiveFile.getAbsolutePath(),
            archivePartFile.getAbsolutePath()
        );
        JSObject result = new JSObject();
        result.put("accepted", true);
        result.put("taskId", record.taskId);
        result.put("status", record.status);
        result.put("gameId", gameId);
        result.put("runtimeChannel", resolvedRuntimeChannel);
        result.put("assetPackVersion", resolvedAssetPackVersion);
        call.resolve(result);
    }

    private File getRootDir() {
        File rootDir = new File(getContext().getFilesDir(), ROOT_DIR);
        if (!rootDir.exists()) {
            rootDir.mkdirs();
        }
        return rootDir;
    }

    private String buildAssetRootPath(File assetRootDir) {
        return assetRootDir.getAbsolutePath();
    }

    private void downloadArchive(
        String urlValue,
        File targetFile,
        File partFile,
        String expectedChecksum,
        AtomicBoolean cancelFlag,
        String gameId,
        String assetPackVersion
    ) throws Exception {
        if (targetFile.exists() && isChecksumMatch(targetFile, expectedChecksum)) {
            emitInstallState(gameId, "downloading", 100, "determinate", null, assetPackVersion, null, null);
            return;
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept", "application/zip,application/octet-stream");
        long resumedBytes = partFile.exists() ? partFile.length() : 0L;
        if (resumedBytes > 0) {
            connection.setRequestProperty("Range", "bytes=" + resumedBytes + "-");
        }
        Log.i(
            TAG,
            "downloadArchive start gameId=" + gameId
                + " version=" + assetPackVersion
                + " url=" + urlValue
                + " resumedBytes=" + resumedBytes
                + " partExists=" + partFile.exists()
        );

        try {
            int responseCode = connection.getResponseCode();
            boolean appendMode = false;
            if (resumedBytes > 0 && responseCode == HttpURLConnection.HTTP_PARTIAL) {
                appendMode = true;
                Log.i(TAG, "downloadArchive resume-accepted gameId=" + gameId + " resumedBytes=" + resumedBytes);
            } else if (resumedBytes > 0 && responseCode == HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "downloadArchive resume-reset gameId=" + gameId + " resumedBytes=" + resumedBytes);
                if (!partFile.delete() && partFile.exists()) {
                    throw new IOException("重置续传文件失败");
                }
                resumedBytes = 0L;
            } else if (resumedBytes > 0 && responseCode == HTTP_RANGE_NOT_SATISFIABLE) {
                Log.w(TAG, "downloadArchive resume-range-not-satisfiable gameId=" + gameId + " resumedBytes=" + resumedBytes);
                if (isChecksumMatch(partFile, expectedChecksum)) {
                    if (targetFile.exists() && !targetFile.delete()) {
                        throw new IOException("清理旧安装包失败");
                    }
                    if (!partFile.renameTo(targetFile)) {
                        throw new IOException("恢复已完成资源包失败");
                    }
                    emitInstallState(gameId, "downloading", 100, "determinate", null, assetPackVersion, null, null);
                    return;
                }
                if (!partFile.delete() && partFile.exists()) {
                    throw new IOException("重置不可续传文件失败");
                }
                throw new IOException("服务端拒绝续传，且本地临时资源包校验失败");
            }
            Log.i(
                TAG,
                "downloadArchive response gameId=" + gameId
                    + " version=" + assetPackVersion
                    + " code=" + responseCode
                    + " contentLength=" + connection.getContentLengthLong()
                    + " contentRange=" + connection.getHeaderField("Content-Range")
                    + " resumedBytes=" + resumedBytes
                    + " appendMode=" + appendMode
            );
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
            int lastLoggedBucket = -1;

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

                    if (totalBytes > 0) {
                        int percent = (int) Math.max(0, Math.min(100, Math.round((downloadedBytes * 100f) / totalBytes)));
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            emitInstallState(gameId, "downloading", percent, "determinate", null, assetPackVersion, null, null);
                            int currentBucket = percent / 10;
                            if (currentBucket != lastLoggedBucket || percent == 100) {
                                lastLoggedBucket = currentBucket;
                                Log.i(
                                    TAG,
                                    "downloadArchive progress gameId=" + gameId
                                        + " version=" + assetPackVersion
                                        + " percent=" + percent
                                        + " downloadedBytes=" + downloadedBytes
                                        + " totalBytes=" + totalBytes
                                );
                            }
                        }
                    } else {
                        emitInstallState(gameId, "downloading", null, "indeterminate", null, assetPackVersion, null, null);
                    }
                }
            }

            String actualChecksum = bytesToHex(digest.digest());
            if (expectedChecksum != null && !expectedChecksum.equalsIgnoreCase(actualChecksum)) {
                throw new IOException("下载包校验失败");
            }
            if (targetFile.exists() && !targetFile.delete()) {
                throw new IOException("清理旧安装包失败");
            }
            if (!partFile.renameTo(targetFile)) {
                throw new IOException("写入安装包失败");
            }
            Log.i(
                TAG,
                "downloadArchive finished gameId=" + gameId
                    + " version=" + assetPackVersion
                    + " checksumOk=" + (expectedChecksum == null || expectedChecksum.equalsIgnoreCase(actualChecksum))
                    + " actualChecksum=" + actualChecksum
            );
        } finally {
            connection.disconnect();
        }
    }

    private void extractArchive(File archiveFile, File outputDir, AtomicBoolean cancelFlag) throws IOException {
        String outputRoot = outputDir.getCanonicalPath();
        Log.i(TAG, "extractArchive start archive=" + archiveFile.getAbsolutePath() + " outputDir=" + outputRoot);
        try (ZipInputStream zipInputStream = new ZipInputStream(new BufferedInputStream(new FileInputStream(archiveFile)))) {
            ZipEntry entry;
            int fileCount = 0;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                if (cancelFlag.get()) {
                    throw new IOException("安装已取消");
                }

                File targetFile = new File(outputDir, entry.getName());
                String canonicalTargetPath = targetFile.getCanonicalPath();
                if (!canonicalTargetPath.startsWith(outputRoot + File.separator) && !canonicalTargetPath.equals(outputRoot)) {
                    throw new IOException("压缩包路径非法: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    if (!targetFile.mkdirs() && !targetFile.exists()) {
                        throw new IOException("创建目录失败: " + targetFile.getAbsolutePath());
                    }
                    continue;
                }

                File parent = targetFile.getParentFile();
                if (parent != null && !parent.mkdirs() && !parent.exists()) {
                    throw new IOException("创建目录失败: " + parent.getAbsolutePath());
                }

                try (BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(targetFile))) {
                    byte[] buffer = new byte[BUFFER_SIZE];
                    int read;
                    while ((read = zipInputStream.read(buffer)) != -1) {
                        if (cancelFlag.get()) {
                            throw new IOException("安装已取消");
                        }
                        output.write(buffer, 0, read);
                    }
                }
                fileCount += 1;
            }
            Log.i(TAG, "extractArchive finished outputDir=" + outputRoot + " fileCount=" + fileCount);
        }
    }

    private void writeMetadata(
        File targetFile,
        String gameId,
        String runtimeChannel,
        String assetPackId,
        String assetPackVersion,
        long installedAt
    ) throws IOException, JSONException {
        JSONObject metadata = new JSONObject();
        metadata.put("gameId", gameId);
        metadata.put("runtimeChannel", runtimeChannel);
        metadata.put("assetPackId", assetPackId);
        metadata.put("assetPackVersion", assetPackVersion);
        metadata.put("installedAt", installedAt);

        File parent = targetFile.getParentFile();
        if (parent != null && !parent.mkdirs() && !parent.exists()) {
            throw new IOException("创建元数据目录失败");
        }

        try (FileOutputStream output = new FileOutputStream(targetFile)) {
            output.write((metadata.toString(2) + "\n").getBytes(StandardCharsets.UTF_8));
        }
    }

    private JSONObject readJsonFile(File file) throws IOException, JSONException {
        if (file == null || !file.exists()) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return new JSONObject(builder.toString());
    }

    private String readInputStream(InputStream inputStream) throws IOException {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private void emitInstallState(
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
        JSObject payload = new JSObject();
        payload.put("gameId", gameId);
        payload.put("status", status);
        if (progressPercent != null) {
            payload.put("progressPercent", progressPercent);
        }
        if (progressMode != null) {
            payload.put("progressMode", progressMode);
        }
        if (errorCode != null && !errorCode.isEmpty()) {
            payload.put("errorCode", errorCode);
        }
        if (errorMessage != null && !errorMessage.isEmpty()) {
            payload.put("errorMessage", errorMessage);
        }
        if (assetPackVersion != null && !assetPackVersion.isEmpty()) {
            payload.put("assetPackVersion", assetPackVersion);
        }
        if (assetRootPath != null && !assetRootPath.isEmpty()) {
            payload.put("assetRootPath", assetRootPath);
        }
        if (installedAt != null) {
            payload.put("installedAt", installedAt);
        }

        payload.put("updatedAt", System.currentTimeMillis());
        persistInstallState(gameId, payload);
        Log.i(TAG, "emitInstallState payload=" + payload.toString());
        mainHandler.post(() -> notifyListeners("installStateChanged", payload));
    }

    private void emitInstallState(
        String gameId,
        String status,
        Integer progressPercent,
        String progressMode,
        String errorMessage,
        String assetPackVersion,
        String assetRootPath,
        Long installedAt
    ) {
        emitInstallState(gameId, status, progressPercent, progressMode, null, errorMessage, assetPackVersion, assetRootPath, installedAt);
    }

    private void resolveOnMainThread(PluginCall call, JSObject result) {
        mainHandler.post(() -> call.resolve(result));
    }

    private void rejectOnMainThread(PluginCall call, String message, Exception error) {
        mainHandler.post(() -> call.reject(message, error));
    }

    private String normalizeNonEmpty(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeChecksum(String value) {
        String normalized = normalizeNonEmpty(value);
        if (normalized == null) {
            return null;
        }
        if (normalized.startsWith("sha256-")) {
            return normalized.substring("sha256-".length());
        }
        return normalized;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }

    private boolean isChecksumMatch(File file, String checksum) throws Exception {
        if (!file.exists()) {
            return false;
        }
        if (checksum == null || checksum.isEmpty()) {
            return true;
        }

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream inputStream = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return checksum.equalsIgnoreCase(bytesToHex(digest.digest()));
    }

    private long resolveTotalBytes(HttpURLConnection connection, long resumedBytes, int responseCode) {
        long contentLength = connection.getContentLengthLong();
        if (responseCode != HttpURLConnection.HTTP_PARTIAL) {
            return contentLength;
        }

        String contentRange = connection.getHeaderField("Content-Range");
        if (contentRange != null) {
            int slashIndex = contentRange.lastIndexOf('/');
            if (slashIndex >= 0 && slashIndex + 1 < contentRange.length()) {
                String totalText = contentRange.substring(slashIndex + 1).trim();
                try {
                    long parsed = Long.parseLong(totalText);
                    if (parsed > 0) {
                        return parsed;
                    }
                } catch (NumberFormatException ignored) {
                    // fallback below
                }
            }
        }

        return contentLength > 0 ? resumedBytes + contentLength : contentLength;
    }

    private File resolveStateFile(String gameId) {
        return new File(new File(getRootDir(), gameId), STATE_FILE);
    }

    private boolean isTaskRunning(String gameId) {
        AndroidDownloadTaskRecord record = taskStore.getLatestByTarget(AndroidDownloadTaskRecord.KIND_GAME_PACKAGE, gameId);
        return record != null && record.isActive();
    }

    private boolean isInProgressStatus(String status) {
        return "queued".equals(status)
            || "manifest".equals(status)
            || "downloading".equals(status)
            || "verifying".equals(status);
    }

    private void persistInstallState(String gameId, JSONObject payload) {
        try {
            File stateFile = resolveStateFile(gameId);
            File parent = stateFile.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) {
                throw new IOException("创建安装状态目录失败");
            }
            try (FileOutputStream outputStream = new FileOutputStream(stateFile)) {
                outputStream.write((payload.toString() + "\n").getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception error) {
            Log.w(TAG, "persistInstallState failed gameId=" + gameId, error);
        }
    }

    private void copyJsonValue(JSONObject source, JSObject target, String key) {
        if (!source.has(key) || source.isNull(key)) {
            return;
        }
        target.put(key, source.opt(key));
    }

    private JSObject buildNotificationPermissionResult(boolean requested) {
        JSObject result = new JSObject();
        boolean required = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU;
        result.put("required", required);
        result.put("requested", requested);
        if (!required) {
            result.put("granted", true);
            result.put("state", PermissionState.GRANTED.toString());
            result.put("canPrompt", false);
            return result;
        }

        PermissionState permissionState = getPermissionState(NOTIFICATION_PERMISSION_ALIAS);
        if (permissionState == null) {
            permissionState = PermissionState.PROMPT;
        }
        boolean granted = permissionState == PermissionState.GRANTED;
        boolean canPrompt = permissionState == PermissionState.PROMPT
            || permissionState == PermissionState.PROMPT_WITH_RATIONALE;
        result.put("granted", granted);
        result.put("state", permissionState.toString());
        result.put("canPrompt", canPrompt);
        if (!granted) {
            result.put("message", canPrompt ? NOTIFICATION_PERMISSION_REQUIRED_MESSAGE : NOTIFICATION_PERMISSION_DENIED_MESSAGE);
        }
        return result;
    }

    private String sanitizeFileSegment(String value) {
        return value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String classifyInstallErrorCode(Exception error) {
        if (error == null) {
            return ERROR_UNKNOWN;
        }

        if (error instanceof SocketTimeoutException) {
            return ERROR_NETWORK_TIMEOUT;
        }
        if (error instanceof ZipException) {
            return ERROR_ARCHIVE_INVALID;
        }

        String message = error.getMessage() != null ? error.getMessage() : "";
        String lowerMessage = message.toLowerCase();

        if (lowerMessage.contains("http ")) {
            return ERROR_HTTP;
        }
        if (message.contains("续传")) {
            return ERROR_RESUME_NOT_SUPPORTED;
        }
        if (message.contains("校验")) {
            return ERROR_CHECKSUM;
        }
        if (
            lowerMessage.contains("enospc")
            || lowerMessage.contains("no space left")
            || message.contains("空间不足")
        ) {
            return ERROR_INSUFFICIENT_STORAGE;
        }
        if (message.contains("取消")) {
            return ERROR_CANCELLED;
        }
        if (message.contains("压缩包") || message.contains("路径非法")) {
            return ERROR_ARCHIVE_INVALID;
        }
        if (error instanceof IOException) {
            return ERROR_FILE_IO;
        }

        return ERROR_UNKNOWN;
    }

    private void deleteRecursively(File target) {
        if (target == null || !target.exists()) {
            return;
        }

        File[] children = target.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteRecursively(child);
            }
        }

        if (!target.delete() && target.exists()) {
            Log.w(TAG, "deleteRecursively failed: " + target.getAbsolutePath());
        }
    }
}
