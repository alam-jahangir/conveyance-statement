# Conveyance Statement – offline Android WebView app (SQLite)

Fully local: no internet permission, no Firebase. The HTML/CSS/JS in `app/src/main/assets/web/` runs in a WebView and
talks to SQLite (`Database.kt`) through the `window.ConveyanceDb` JS bridge.
DB file on the phone: `databases/conveyance.db` (tables `entries`, `profile`).

## Get the installable APK
**A. Android Studio:** File > Open this folder > wait for Gradle sync > Build > Build APK(s)
   -> `app/build/outputs/apk/debug/app-debug.apk`. Copy it to the phone and open it (allow "install unknown apps").
   Or plug in the phone (USB debugging on) and press Run.
**B. No Android Studio:** push this folder to a GitHub repo > Actions tab > "Build APK" > Run workflow > download the
   `conveyance-apk` artifact (contains app-debug.apk).
**C. Command line** (JDK 17 + Android SDK + Gradle 8.7): `gradle :app:assembleDebug`

## Preview the UI on a PC
`cd app/src/main/assets/web && python3 -m http.server 8000` -> http://localhost:8000 (uses localStorage instead of SQLite).

## Defaults
Edit the default company name in `app.js` (`state.profile`) or in the Profile tab inside the app.
