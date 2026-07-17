# Messagerie Vocale — App Android native (React Native)

## ⚠️ À lire avant de commencer

Enregistrer l'audio d'un appel GSM sans opérateur/Twilio a des limites
réelles sur Android moderne, et ce projet contient **deux stratégies** :

### Stratégie 1 — `VOICE_CALL` (idéal, mais pas garanti)
Capte directement le flux d'appel. Fonctionne sur AOSP/Pixel. **Bloqué
silencieusement** sur Samsung, Xiaomi, Huawei depuis Android 10 (protection
vie privée de l'appelant, aucune app tierce ne peut la lever sans root).

### Stratégie 2 — Contournement haut-parleur + micro (fonctionne partout)
C'est la technique utilisée par les vraies apps du marché (Cube ACR,
Boldbeast...) :
1. `CallAutoSpeakerService.kt` (service d'accessibilité) détecte la prise
   d'appel et force le haut-parleur.
2. `CallScreeningModule.kt` enregistre alors avec la source `MIC`, qui capte
   les deux voix à travers le haut-parleur.

**Compromis** : qualité audio un peu plus faible, le haut-parleur s'allume
visiblement pendant l'appel, et **l'utilisateur doit activer manuellement**
le service dans *Réglages > Accessibilité > Messagerie Vocale > Activer* —
Android ne permet à aucune app de s'auto-accorder cette permission, c'est
une protection anti-abus volontaire du système.

Le code essaie automatiquement `VOICE_CALL` puis bascule sur le fallback
`MIC` si `VOICE_CALL` échoue au démarrage.

**Si tu veux une fiabilité 100% sans dépendre du modèle de téléphone ni
d'une activation manuelle**, la seule solution reste le renvoi d'appel vers
un numéro Twilio (solution évoquée plus tôt dans la conversation).

## Structure du dossier

```
voicemail-app/
├── package.json
├── README.md
├── src/
│   ├── App.tsx                 # navigation (Messages / Accueil)
│   └── screens/
│       ├── HomeScreen.tsx      # liste + lecture des messages reçus
│       └── GreetingScreen.tsx  # enregistrer le message d'accueil
└── android-native/
    ├── AndroidManifest-additions.xml
    ├── res/
    │   ├── xml/accessibility_service_config.xml
    │   └── values/strings-additions.xml
    └── src/main/java/com/voicemailapp/
        ├── CallScreeningModule.kt      # détection appel + enregistrement
        ├── CallScreeningPackage.kt     # enregistrement du module RN
        └── CallAutoSpeakerService.kt   # contournement haut-parleur
```

## Setup (sur ta machine — Android Studio + Node requis)

```bash
npx react-native init VoicemailApp
cd VoicemailApp

# Remplace le contenu généré par celui de ce dossier :
cp -r chemin/vers/voicemail-app/src ./src
cp voicemail-app/android-native/src/main/java/com/voicemailapp/*.kt \
   android/app/src/main/java/com/voicemailapp/
cp voicemail-app/android-native/res/xml/accessibility_service_config.xml \
   android/app/src/main/res/xml/
# Fusionne à la main :
#  - android-native/AndroidManifest-additions.xml → android/app/src/main/AndroidManifest.xml
#  - android-native/res/values/strings-additions.xml → android/app/src/main/res/values/strings.xml

npm install react-native-sound react-native-audio-recorder-player react-native-fs
```

Dans `android/app/src/main/java/com/voicemailapp/MainApplication.kt`, ajoute
le package :
```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(CallScreeningPackage())
    }
```

Puis lance :
```bash
npx react-native run-android
```

## Générer l'APK à installer en sideload

```bash
cd android
./gradlew assembleRelease
# APK dans android/app/build/outputs/apk/release/app-release.apk
```

Transfère-le sur ton téléphone et installe-le en autorisant "sources
inconnues" dans les réglages Android.

## Étapes après installation (à faire à la main sur le téléphone)

1. Accorder les permissions micro / téléphone / notifications au premier
   lancement.
2. Aller dans *Réglages > Accessibilité > Messagerie Vocale* et **activer**
   le service (nécessaire pour le contournement haut-parleur).
3. Enregistrer ton message d'accueil dans l'onglet "Accueil".
4. Tester un appel réel pour vérifier quelle stratégie (`VOICE_CALL` ou
   fallback) fonctionne sur ton téléphone — regarde les logs Android
   (`adb logcat | grep CallScreening`) pendant le test.

## Rappel légal

Informer l'appelant qu'un appel peut être enregistré (via ton message
d'accueil) évite les problèmes juridiques liés à l'enregistrement sans
consentement, selon le contexte d'usage.

## Prochaines étapes possibles
- Notification native Android à la réception d'un message
- Suppression / partage des messages depuis l'écran d'accueil
- Vérifier le comportement exact sur ton modèle de téléphone
