package com.voicemailapp

import android.media.MediaRecorder
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Stratégie d'enregistrement, dans l'ordre :
 *   1. AudioSource.VOICE_CALL — capte directement le flux d'appel.
 *      Fonctionne sur AOSP/Pixel. Échoue silencieusement sur Samsung/Xiaomi/Huawei.
 *   2. Fallback AudioSource.MIC — combiné à CallAutoSpeakerService.kt qui force
 *      le haut-parleur, le micro capte les deux voix. Fonctionne partout, qualité
 *      un peu plus faible. C'est la technique des vraies apps du marché.
 *
 * Pour que le fallback fonctionne, l'utilisateur doit activer le service
 * d'accessibilité de l'app une fois (Réglages > Accessibilité > Messagerie
 * Vocale > Activer) — geste qu'aucune app ne peut faire à sa place.
 */
class CallScreeningModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var recorder: MediaRecorder? = null
    private var currentFilePath: String? = null

    override fun getName() = "CallScreeningModule"

    @ReactMethod
    fun startListening() {
        val telephonyManager =
            reactApplicationContext.getSystemService(android.content.Context.TELEPHONY_SERVICE) as TelephonyManager

        telephonyManager.listen(object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                when (state) {
                    TelephonyManager.CALL_STATE_RINGING -> {
                        sendEvent("onIncomingCall", phoneNumber ?: "Numéro inconnu")
                    }
                    TelephonyManager.CALL_STATE_OFFHOOK -> {
                        startRecording(phoneNumber ?: "unknown")
                    }
                    TelephonyManager.CALL_STATE_IDLE -> {
                        stopRecording()
                    }
                }
            }
        }, PhoneStateListener.LISTEN_CALL_STATE)
    }

    private fun startRecording(callerNumber: String) {
        val dir = File(reactApplicationContext.filesDir, "voicemail")
        if (!dir.exists()) dir.mkdirs()
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val filePath = File(dir, "call_${callerNumber}_$timestamp.m4a").absolutePath
        currentFilePath = filePath

        recorder = MediaRecorder().apply {
            var usingVoiceCall = true
            try {
                setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
            } catch (e: Exception) {
                usingVoiceCall = false
                setAudioSource(MediaRecorder.AudioSource.MIC)
            }
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setOutputFile(filePath)
            try {
                prepare()
                start()
                Log.d("CallScreening", "Enregistrement démarré (source: ${if (usingVoiceCall) "VOICE_CALL" else "MIC"})")
            } catch (e: Exception) {
                // VOICE_CALL a été accepté à la déclaration mais refuse au démarrage
                // (comportement typique Samsung/Xiaomi) → on recrée avec MIC
                Log.w("CallScreening", "VOICE_CALL a échoué au démarrage, retry avec MIC")
                retryWithMic(filePath)
            }
        }
    }

    private fun retryWithMic(filePath: String) {
        recorder?.release()
        recorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setOutputFile(filePath)
            try {
                prepare()
                start()
            } catch (e: Exception) {
                Log.e("CallScreening", "Échec total de l'enregistrement: ${e.message}")
            }
        }
    }

    private fun stopRecording() {
        try {
            recorder?.stop()
            recorder?.release()
        } catch (e: Exception) {
            Log.e("CallScreening", "Erreur à l'arrêt: ${e.message}")
        }
        recorder = null
        currentFilePath?.let { sendEvent("onRecordingSaved", it) }
        currentFilePath = null
    }

    private fun sendEvent(eventName: String, data: String) {
        reactApplicationContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }
}
