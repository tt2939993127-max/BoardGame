package top.easyboardgame.app;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
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
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "GamePackage")
public class GamePackagePlugin extends Plugin {

    private static final String TAG = "GamePackagePlugin";
    private static final String ROOT_DIR = "game-packages";
    private static final String CURRENT_DIR = "current";
    private static final String STAGING_DIR = "staging";
    private static final String ASSETS_DIR = "assets";
    private static final String ARCHIVE_FILE = "package.zip";
    private static final String METADATA_FILE = "metadata.json";
    private static final int BUFFER_SIZE = 16 * 1024;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Map<String, AtomicBoolean> cancelRegistry = new ConcurrentHashMap<>();

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
                    item.put("assetRootPath", assetRootDir.toURI().toString());
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
    public void cancelInstall(PluginCall call) {
        String gameId = normalizeNonEmpty(call.getString("gameId"));
        if (gameId == null) {
            call.reject("缺少 gameId");
            return;
        }

        AtomicBoolean cancelled = cancelRegistry.get(gameId);
        if (cancelled != null) {
            cancelled.set(true);
            Log.w(TAG, "cancelInstall gameId=" + gameId);
        }
        call.resolve();
    }

    @PluginMethod
    public void installGamePackage(PluginCall call) {
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

        AtomicBoolean cancelFlag = new AtomicBoolean(false);
        AtomicBoolean previous = cancelRegistry.putIfAbsent(gameId, cancelFlag);
        if (previous != null) {
            call.reject("当前游戏已有安装任务正在进行");
            return;
        }

        String resolvedAssetPackId = assetPackId != null ? assetPackId : gameId;
        String resolvedAssetPackVersion = assetPackVersion != null ? assetPackVersion : "unknown";

        executor.execute(() -> {
            File gameDir = new File(getRootDir(), gameId);
            File stagingDir = new File(new File(gameDir, STAGING_DIR), resolvedAssetPackVersion + "-" + System.currentTimeMillis());
            File archiveFile = new File(stagingDir, ARCHIVE_FILE);
            File stagingAssetsDir = new File(stagingDir, ASSETS_DIR);
            File currentDir = new File(gameDir, CURRENT_DIR);
            File currentAssetsDir = new File(currentDir, ASSETS_DIR);
            long installedAt = System.currentTimeMillis();

            try {
                Log.i(
                    TAG,
                    "installGamePackage start gameId=" + gameId
                        + " stagingDir=" + stagingDir.getAbsolutePath()
                        + " archiveFile=" + archiveFile.getAbsolutePath()
                );
                deleteRecursively(stagingDir);
                if (!stagingAssetsDir.mkdirs() && !stagingAssetsDir.exists()) {
                    throw new IOException("创建临时目录失败");
                }

                emitInstallState(gameId, "queued", null, "indeterminate", null, resolvedAssetPackVersion, null, null);
                emitInstallState(gameId, "manifest", null, "indeterminate", null, resolvedAssetPackVersion, null, null);

                downloadArchive(assetPackUrl, archiveFile, assetPackChecksum, cancelFlag, gameId, resolvedAssetPackVersion);

                emitInstallState(gameId, "verifying", 100, "indeterminate", null, resolvedAssetPackVersion, null, null);
                extractArchive(archiveFile, stagingAssetsDir, cancelFlag);

                if (cancelFlag.get()) {
                    throw new IOException("安装已取消");
                }

                deleteRecursively(currentDir);
                if (!currentDir.mkdirs() && !currentDir.exists()) {
                    throw new IOException("创建安装目录失败");
                }

                Files.move(
                    stagingAssetsDir.toPath(),
                    currentAssetsDir.toPath(),
                    StandardCopyOption.REPLACE_EXISTING
                );

                writeMetadata(
                    new File(currentDir, METADATA_FILE),
                    gameId,
                    resolvedRuntimeChannel,
                    resolvedAssetPackId,
                    resolvedAssetPackVersion,
                    installedAt
                );

                JSObject result = new JSObject();
                result.put("gameId", gameId);
                result.put("runtimeChannel", resolvedRuntimeChannel);
                result.put("installedAt", installedAt);
                result.put("assetPackVersion", resolvedAssetPackVersion);
                result.put("assetRootPath", currentAssetsDir.toURI().toString());

                emitInstallState(
                    gameId,
                    "installed",
                    null,
                    null,
                    null,
                    resolvedAssetPackVersion,
                    currentAssetsDir.toURI().toString(),
                    installedAt
                );
                Log.i(
                    TAG,
                    "installGamePackage success gameId=" + gameId
                        + " installedAt=" + installedAt
                        + " currentAssetsDir=" + currentAssetsDir.getAbsolutePath()
                );
                resolveOnMainThread(call, result);
            } catch (Exception error) {
                Log.e(TAG, "installGamePackage failed", error);
                emitInstallState(
                    gameId,
                    "failed",
                    null,
                    null,
                    error.getMessage(),
                    resolvedAssetPackVersion,
                    null,
                    null
                );
                rejectOnMainThread(call, error.getMessage() != null ? error.getMessage() : "安装失败", error);
            } finally {
                cancelRegistry.remove(gameId);
                deleteRecursively(stagingDir);
            }
        });
    }

    private File getRootDir() {
        File rootDir = new File(getContext().getFilesDir(), ROOT_DIR);
        if (!rootDir.exists()) {
            rootDir.mkdirs();
        }
        return rootDir;
    }

    private void downloadArchive(
        String urlValue,
        File targetFile,
        String expectedChecksum,
        AtomicBoolean cancelFlag,
        String gameId,
        String assetPackVersion
    ) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept", "application/zip,application/octet-stream");
        Log.i(TAG, "downloadArchive start gameId=" + gameId + " version=" + assetPackVersion + " url=" + urlValue);

        try {
            int responseCode = connection.getResponseCode();
            Log.i(
                TAG,
                "downloadArchive response gameId=" + gameId
                    + " version=" + assetPackVersion
                    + " code=" + responseCode
                    + " contentLength=" + connection.getContentLengthLong()
            );
            if (responseCode < 200 || responseCode >= 300) {
                throw new IOException("下载失败，HTTP " + responseCode);
            }

            long totalBytes = connection.getContentLengthLong();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long downloadedBytes = 0L;
            int lastPercent = -1;
            int lastLoggedBucket = -1;

            try (
                InputStream rawInput = new BufferedInputStream(connection.getInputStream());
                BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(targetFile))
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
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return new JSONObject(builder.toString());
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
        JSObject payload = new JSObject();
        payload.put("gameId", gameId);
        payload.put("status", status);
        if (progressPercent != null) {
            payload.put("progressPercent", progressPercent);
        }
        if (progressMode != null) {
            payload.put("progressMode", progressMode);
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

        Log.i(TAG, "emitInstallState payload=" + payload.toString());
        mainHandler.post(() -> notifyListeners("installStateChanged", payload));
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
