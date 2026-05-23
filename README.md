<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Q7l-QzBvmPewhDAjeBTzS2tUwGGvCd6S

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android APKs por rol

El proyecto Android tiene dos flavors: `cliente` y `delivery`. Para generar solo las APKs Android separadas por rol:

```powershell
npm run build:android
```

Esto compila las variantes debug instalables y copia los archivos a:

```text
dist/android/rapidingo-cliente-debug.apk
dist/android/rapidingo-delivery-debug.apk
```

Para release:

```powershell
npm run build:android:release
```
