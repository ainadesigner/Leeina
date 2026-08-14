# AI Contest Hub Android build

The Android app reuses the existing HTML/CSS/JavaScript UI and the existing Supabase backend. Capacitor only provides the native Android shell.

## Prerequisites

- Node.js 22 or newer
- Android Studio with current Android SDK
- JDK required by the installed Android Gradle Plugin

## First-time Android project creation

```bash
npm install
npm run android:init
```

This prepares the web assets in `www/` and generates the native `android/` project.

## After changing the web app

```bash
npm run android:sync
npm run android:open
```

## Release bundle

Open the generated `android/` project in Android Studio, then use **Build > Generate Signed Bundle / APK > Android App Bundle**. Create or select an upload keystore and generate a signed `.aab` for Google Play Console.

## Architecture notes

- Existing production website: `https://ai-contest-hub-v12.vercel.app`
- Existing `/supa` Vercel proxy remains the only Supabase gateway used by the app.
- `native-bridge.js` rewrites native WebView `/supa` requests to the production Vercel proxy.
- Email confirmation and password-recovery redirect URLs are rewritten to the production web origin so emailed links remain valid.
- The production web files are not changed by the Android preparation process. `scripts/prepare-capacitor.mjs` creates an Android-only `www/` copy and injects the bridge there.

## Play submission note

Before release, verify the generated Android project targets the API level currently required by Google Play and test sign-in, password recovery, saved opportunities, daily check-in, reward claims, award proof upload, external links, and back navigation on a physical Android device.
