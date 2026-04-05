package top.easyboardgame.app;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import org.json.JSONObject;

final class GamePackageInstallEventHub {

    interface Listener {
        void onInstallStateChanged(JSONObject payload);
    }

    private static final Set<Listener> LISTENERS = new CopyOnWriteArraySet<>();

    private GamePackageInstallEventHub() {}

    static void register(Listener listener) {
        if (listener != null) {
            LISTENERS.add(listener);
        }
    }

    static void unregister(Listener listener) {
        if (listener != null) {
            LISTENERS.remove(listener);
        }
    }

    static void dispatch(JSONObject payload) {
        if (payload == null) {
            return;
        }
        for (Listener listener : LISTENERS) {
            listener.onInstallStateChanged(payload);
        }
    }
}
