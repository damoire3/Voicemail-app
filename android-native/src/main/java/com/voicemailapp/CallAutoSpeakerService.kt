package com.voicemailapp

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.media.AudioManager
import android.telephony.TelephonyManager
import android.view.accessibility.AccessibilityEvent
import android.util.Log

/**
 * CONTOURNEMENT du blocage AudioSource.VOICE_CALL sur Samsung / Xiaomi / Huawei.
 *
 * Ces fabricants empêchent les apps tierces de capter directement le flux audio
 * d'un appel (protection vie privée introduite en Android 10). La technique
 * utilisée par la plupart des vraies apps d'enregistrement d'appel (Cube ACR,
 * Boldbeast, etc.) :
 *
 *   1. Ce service (avec la permission Accessibilité, accordée manuellement par
 *      l'utilisateur dans les réglages) détecte quand un appel passe à l'état
 *      "décroché" (OFFHOOK).
 *   2. Il force le passage en haut-parleur via AudioManager.
 *   3. Le module CallScreeningModule.kt enregistre alors avec la source MIC —
 *      le micro capte les deux voix à travers le haut-parleur.
 *
 * Compromis à connaître :
 *   - Qualité audio plus faible qu'un enregistrement direct du flux d'appel.
 *   - Le haut-parleur s'allume visiblement pendant l'appel (l'appelant peut
 *     entendre l'écho ambiant, et toi tu dois tenir le tél. à distance).
 *   - Nécessite que l'utilisateur active manuellement "Service d'accessibilité"
 *     pour cette app dans Réglages > Accessibilité — Android ne permet pas de
 *     l'activer automatiquement par code, pour des raisons de sécurité.
 */
class CallAutoSpeakerService : AccessibilityService() {

    private var lastState = TelephonyManager.CALL_STATE_IDLE

    override fun onServiceConnected() {
        super.onServiceConnected()
        val telephonyManager =
            getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        telephonyManager.listen(object : android.telephony.PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                if (state == TelephonyManager.CALL_STATE_OFFHOOK && lastState != state) {
                    enableSpeaker()
                }
                if (state == TelephonyManager.CALL_STATE_IDLE) {
                    disableSpeaker()
                }
                lastState = state
            }
        }, android.telephony.PhoneStateListener.LISTEN_CALL_STATE)
    }

    private fun enableSpeaker() {
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_IN_CALL
            audioManager.isSpeakerphoneOn = true
        } catch (e: Exception) {
            Log.e("CallAutoSpeaker", "Impossible d'activer le haut-parleur: ${e.message}")
        }
    }

    private fun disableSpeaker() {
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.isSpeakerphoneOn = false
            audioManager.mode = AudioManager.MODE_NORMAL
        } catch (e: Exception) {
            Log.e("CallAutoSpeaker", "Erreur: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Non utilisé ici — on s'appuie uniquement sur PhoneStateListener,
        // mais un AccessibilityService doit implémenter cette méthode.
    }

    override fun onInterrupt() {}
}
