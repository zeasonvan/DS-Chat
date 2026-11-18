package io.example.chatdemo;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * 用 Android Keystore 保存 API Key：
 * 密钥不可导出，SharedPreferences 只保存 AES-GCM 密文与 IV。
 */
@CapacitorPlugin(name = "SecureKeyStore")
public class SecureKeyStorePlugin extends Plugin {

    private static final String ALIAS = "ds_chat_master_key";
    private static final String PREFS = "ds_secure_store";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
    }

    private SecretKey masterKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (!keyStore.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                "AndroidKeyStore"
            );
            generator.init(
                new KeyGenParameterSpec.Builder(
                    ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            );
            generator.generateKey();
        }
        return (SecretKey) keyStore.getKey(ALIAS, null);
    }

    private String encrypt(String plain) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, masterKey());
        byte[] iv = cipher.getIV();
        byte[] cipherText = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
            Base64.encodeToString(cipherText, Base64.NO_WRAP);
    }

    private String decrypt(String stored) throws Exception {
        int split = stored.indexOf(':');
        if (split <= 0) {
            throw new IllegalArgumentException("invalid stored value");
        }
        byte[] iv = Base64.decode(stored.substring(0, split), Base64.NO_WRAP);
        byte[] cipherText = Base64.decode(stored.substring(split + 1), Base64.NO_WRAP);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, masterKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
        return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("key is required");
            return;
        }
        JSObject result = new JSObject();
        String stored = prefs().getString(key, null);
        if (stored == null) {
            result.put("value", (String) null);
            call.resolve(result);
            return;
        }
        try {
            result.put("value", decrypt(stored));
            call.resolve(result);
        } catch (Exception error) {
            // 密钥失效或密文损坏时清掉，避免一直失败
            prefs().edit().remove(key).apply();
            call.reject("secure read failed", error);
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("key and value are required");
            return;
        }
        try {
            prefs().edit().putString(key, encrypt(value)).apply();
            call.resolve();
        } catch (Exception error) {
            call.reject("secure write failed", error);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("key is required");
            return;
        }
        prefs().edit().remove(key).apply();
        call.resolve();
    }
}
