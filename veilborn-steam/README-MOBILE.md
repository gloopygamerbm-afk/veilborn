# Veilborn — Mobile Porting Guide (iOS & Android)

Because **Veilborn** is built with HTML5 / Phaser 3 with 100% self-contained local assets, porting to iOS and Android is straightforward using **Capacitor** (the industry-standard open-source wrapper by Ionic) or by running it as an instant **Progressive Web App (PWA)**.

---

## ⚡ Option 1: Instant Mobile Play / PWA (30 Seconds, No Installs, $0 Fees)
Before compiling native app packages, you can test and play the full game on any iPhone, iPad, or Android phone immediately:
1. Host your `veilborn-steam` folder online (free on [GitHub Pages](https://pages.github.com/), [Vercel](https://vercel.com/), or [Netlify](https://www.netlify.com/)).
2. Open the URL in **Safari (iOS)** or **Chrome (Android)**.
3. Tap **Share** (Safari) or **⋮ Menu** (Chrome) → **"Add to Home Screen"**.
4. The game opens full-screen like a native mobile app with touch controls and zero browser bars!

---

## 📱 Option 2: Native Android (.APK / .AAB for Google Play Store)
*You can build for Android on **Windows, Mac, or Linux**.*

### Step 1: Install Prerequisites
1. **Node.js LTS** (if not already installed): https://nodejs.org
2. **Android Studio**: https://developer.android.com/studio
   - During install, ensure **Android SDK**, **Android SDK Command-line Tools**, and **Android Virtual Device (AVD)** are checked.

### Step 2: Initialize Capacitor
In this folder (`C:\Users\emili\.gemini\antigravity\scratch\veilborn-steam`):
```bash
# 1. Install Capacitor CLI and Core
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Add the Android native project folder
npx cap add android

# 3. Copy game files into the Android project
npx cap sync
```

### Step 3: Run & Build in Android Studio
```bash
# Opens the native Android project in Android Studio
npx cap open android
```
- **To test on your phone via USB**: Enable *Developer Options* and *USB Debugging* on your Android phone, plug it into your PC, and press the green **Run (▶)** button in Android Studio.
- **To build an installable `.apk`**: Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
- **To publish to Google Play Store**:
  1. Register a Google Play Developer account ($25 one-time fee) at https://play.google.com/console
  2. In Android Studio, go to **Build** → **Generate Signed Bundle / APK** → select **Android App Bundle (.aab)**.
  3. Create a keystore key, build the `.aab`, and upload it to your Google Play Console dashboard.

---

## 🍏 Option 3: Native iOS (.IPA for Apple App Store / TestFlight)
*Apple requires **macOS** with **Xcode** to compile iOS apps.*

### Step 1: Install Prerequisites on Mac
1. Install **Xcode** from the Mac App Store.
2. Install CocoaPods: `sudo gem install cocoapods`

### Step 2: Initialize Capacitor for iOS
Copy the `veilborn-steam` folder to your Mac (or push to GitHub and clone it):
```bash
# 1. Install Capacitor iOS platform
npm install @capacitor/ios

# 2. Add the iOS native project
npx cap add ios

# 3. Sync files
npx cap sync
```

### Step 3: Run & Build in Xcode
```bash
# Opens the native project in Xcode
npx cap open ios
```
- In Xcode:
  1. Click the top-level **App** project in the left sidebar.
  2. Under **Signing & Capabilities**, select your Apple ID team.
  3. Select your connected iPhone or a simulator (e.g., iPhone 15 Pro).
  4. Press the **Play (▶)** button to install and run the game directly on your device.
- **To publish to the App Store**:
  1. Enroll in the Apple Developer Program ($99/year) at https://developer.apple.com.
  2. In Xcode, set the target device to **Any iOS Device (arm64)**.
  3. Click **Product** → **Archive** → **Distribute App** to upload to **TestFlight** and the **App Store**.

---

## 🎮 Mobile Features Already Configured in Veilborn

1. **Auto-Detecting On-Screen Touch Controls**:
   - **Left / Right (`◀` / `▶`)**: Directional D-pad for running.
   - **`JUMP`**: Large responsive button supporting tap-to-jump and mid-air double-jump.
   - **`ATK`**: Casts equipped spell in the direction faced or aimed.
   - **`[E]`**: Contextual interact button to enter dungeon doors and read signs.
   - **`BAG [F]`**: Quick-access touch button on the HUD to open the inventory and pause the game.
   - **Spell Icon**: Tapping the top-right spellbook cycles spell elements on the fly.
2. **Notch & Dynamic Island Friendly**:
   - `viewport-fit=cover` and CSS touch-action isolation are pre-set so swiping never accidentally closes or reloads the game.
3. **Landscape Orientation**:
   - The game canvas auto-scales smoothly to any phone/tablet screen ratio (16:9, 19.5:9, 20:9).

---

## 🔄 Keeping Native Builds Updated
Whenever you tweak art, levels, or code in `js/`:
```bash
npx cap sync
```
This instantly copies all changes into both the `android/` and `ios/` folders!
