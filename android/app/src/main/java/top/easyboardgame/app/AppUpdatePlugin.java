package top.easyboardgame.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String TAG = "AppUpdatePlugin";
    private static final String ROOT_DIR = "app-updates";
    private static final int BUFFER_SIZE = 16 * 1024;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean taskRunning = new AtomicBoolean(false);

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageInfo packageInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("packageName", context.getPackageName());
            result.put("versionName", packageInfo.versionName != null ? packageInfo.versionName : "");
            result.put(
                "versionCode",
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? packageInfo.getLongVersionCode()
                    : packageInfo.versionCode
            );
            result.put("canRequestPackageInstalls", canRequestPackageInstalls());
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "getAppInfo failed", error);
            call.reject("读取 App 版本信息失败", error);
        }
    }

    @PluginMethod
    public void openUnknownSourcesSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                call.resolve();
                return;
            }

            Context context = getContext();
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + context.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            Log.e(TAG, "openUnknownSourcesSettings failed", error);
            call.reject("打开安装授权页失败", error);
        }
    }

    @PluginMethod
    public void prepareUpdateInstall(PluginCall call) {
        String version = normalizeNonEmpty(call.getString("version"));
        String downloadUrl = normalizeNonEmpty(call.getString("url"));
        String checksum = normalizeChecksum(call.getString("checksum"));

        if (version == null) {
            call.reject("缺少 version");
            return;
        }
        if (downloadUrl == null) {
            call.reject("缺少 url");
            return;
        }
        if (!taskRunning.compareAndSet(false, true)) {
            call.reject("当前已有安装任务正在进行");
            return;
        }

        executor.execute(() -> {
            File apkFile = resolveApkFile(version);
            try {
                File parentDir = apkFile.getParentFile();
                if (parentDir != null && !parentDir.exists() && !parentDir.mkdirs()) {
                    throw new IOException("创建更新目录失败");
                }

                emitUpdateState(version, "queued", null, "indeterminate", null, apkFile.getAbsolutePath());

                if (!apkFile.exists() || !isChecksumMatch(apkFile, checksum)) {
                    downloadApk(downloadUrl, apkFile, checksum, version);
                } else {
                    emitUpdateState(version, "verifying", 100, "indeterminate", null, apkFile.getAbsolutePath());
                }

                if (!canRequestPackageInstalls()) {
                    emitUpdateState(
                        version,
                        "permission-required",
                        100,
                        "indeterminate",
                        "请先允许当前 App 安装更新包，然后返回继续安装。",
                        apkFile.getAbsolutePath()
                    );
                    JSObject result = new JSObject();
                    result.put("status", "permission-required");
                    result.put("version", version);
                    result.put("apkFilePath", apkFile.getAbsolutePath());
                    resolveOnMainThread(call, result);
                    return;
                }

                launchInstaller(apkFile);
                emitUpdateState(version, "installing", 100, "indeterminate", null, apkFile.getAbsolutePath());

                JSObject result = new JSObject();
                result.put("status", "installer-launched");
                result.put("version", version);
                result.put("apkFilePath", apkFile.getAbsolutePath());
                resolveOnMainThread(call, result);
            } catch (Exception error) {
                Log.e(TAG, "prepareUpdateInstall failed version=" + version, error);
                emitUpdateState(
                    version,
                    "error",
                    null,
                    null,
                    error.getMessage() != null ? error.getMessage() : "准备更新安装失败",
                    apkFile.getAbsolutePath()
                );
                rejectOnMainThread(call, error.getMessage() != null ? error.getMessage() : "准备更新安装失败", error);
            } finally {
                taskRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void installPreparedUpdate(PluginCall call) {
        String version = normalizeNonEmpty(call.getString("version"));
        if (version == null) {
            call.reject("缺少 version");
            return;
        }

        try {
            File apkFile = resolveApkFile(version);
            if (!apkFile.exists()) {
                call.reject("未找到已下载的更新包，请先重新下载");
                return;
            }

            if (!canRequestPackageInstalls()) {
                emitUpdateState(
                    version,
                    "permission-required",
                    100,
                    "indeterminate",
                    "请先允许当前 App 安装更新包，然后返回继续安装。",
                    apkFile.getAbsolutePath()
                );
                JSObject result = new JSObject();
                result.put("status", "permission-required");
                result.put("version", version);
                result.put("apkFilePath", apkFile.getAbsolutePath());
                call.resolve(result);
                return;
            }

            launchInstaller(apkFile);
            emitUpdateState(version, "installing", 100, "indeterminate", null, apkFile.getAbsolutePath());

            JSObject result = new JSObject();
            result.put("status", "installer-launched");
            result.put("version", version);
            result.put("apkFilePath", apkFile.getAbsolutePath());
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "installPreparedUpdate failed version=" + version, error);
            call.reject("启动安装失败", error);
        }
    }

    private void downloadApk(String downloadUrl, File apkFile, String checksum, String version) throws Exception {
        emitUpdateState(version, "downloading", 0, "determinate", null, apkFile.getAbsolutePath());

        HttpURLConnection connection = null;
        File tempFile = new File(apkFile.getParentFile(), apkFile.getName() + ".download");
        if (tempFile.exists() && !tempFile.delete()) {
            throw new IOException("清理旧下载临时文件失败");
        }

        try {
            connection = (HttpURLConnection) new URL(downloadUrl).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(120000);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");

            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                throw new IOException("下载更新包失败，HTTP " + responseCode);
            }

            int totalBytes = connection.getContentLength();
            int lastPercent = -1;
            long downloadedBytes = 0L;

            try (
                InputStream inputStream = new BufferedInputStream(connection.getInputStream());
                FileOutputStream fileOutputStream = new FileOutputStream(tempFile);
                BufferedOutputStream outputStream = new BufferedOutputStream(fileOutputStream)
            ) {
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read);
                    downloadedBytes += read;

                    if (totalBytes > 0) {
                        int percent = (int) Math.max(0, Math.min(100, Math.round((downloadedBytes * 100f) / totalBytes)));
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            emitUpdateState(version, "downloading", percent, "determinate", null, apkFile.getAbsolutePath());
                        }
                    } else if (lastPercent != 0) {
                        lastPercent = 0;
                        emitUpdateState(version, "downloading", null, "indeterminate", null, apkFile.getAbsolutePath());
                    }
                }
            }

            if (apkFile.exists() && !apkFile.delete()) {
                throw new IOException("清理旧更新包失败");
            }
            if (!tempFile.renameTo(apkFile)) {
                throw new IOException("写入更新包失败");
            }

            emitUpdateState(version, "verifying", 100, "indeterminate", null, apkFile.getAbsolutePath());
            if (!isChecksumMatch(apkFile, checksum)) {
                throw new IOException("更新包校验失败，请重新下载");
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
            if (tempFile.exists() && !tempFile.equals(apkFile)) {
                tempFile.delete();
            }
        }
    }

    private void launchInstaller(File apkFile) {
        Context context = getContext();
        Uri contentUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(intent);
    }

    private boolean canRequestPackageInstalls() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private File resolveApkFile(String version) {
        return new File(new File(getContext().getCacheDir(), ROOT_DIR), sanitizeFileSegment(version) + ".apk");
    }

    private String sanitizeFileSegment(String value) {
        return value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private boolean isChecksumMatch(File file, String checksum) throws Exception {
        if (checksum == null || checksum.isEmpty()) {
            return file.exists();
        }
        if (!file.exists()) {
            return false;
        }
        return checksum.equalsIgnoreCase(calculateSha256(file));
    }

    private String calculateSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream inputStream = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return bytesToHex(digest.digest());
    }

    private void emitUpdateState(
        String version,
        String status,
        Integer progressPercent,
        String progressMode,
        String errorMessage,
        String apkFilePath
    ) {
        JSObject payload = new JSObject();
        payload.put("version", version);
        payload.put("status", status);
        if (progressPercent != null) {
            payload.put("progressPercent", progressPercent);
        }
        if (progressMode != null && !progressMode.isEmpty()) {
            payload.put("progressMode", progressMode);
        }
        if (errorMessage != null && !errorMessage.isEmpty()) {
            payload.put("errorMessage", errorMessage);
        }
        if (apkFilePath != null && !apkFilePath.isEmpty()) {
            payload.put("apkFilePath", apkFilePath);
        }

        Log.i(TAG, "emitUpdateState payload=" + payload.toString());
        mainHandler.post(() -> notifyListeners("updateStateChanged", payload));
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
}
