# Countdown App ⏳ & Qiblah Compass 🧭

A modern, highly-polished React Native application built with [Expo SDK 52](https://expo.dev) that lets you create, track, and manage all your important upcoming events, alongside a meticulously calibrated hardware Qiblah Compass.

## ✨ Features

- **Global Ticking Architecture**: Built with a centralized `TickerProvider` to gracefully update all active timers on the UI thread without destroying battery life.
- **Hardware-Fused Qiblah Tracker**: Includes a buttery-smooth compass dial that leverages the native OS sensor fusion (`Location.watchHeadingAsync`) to continuously stabilize the needle against the device's tilt, isolating True North explicitly for exact geographical Qiblah alignment.
- **AMOLED Pitch-Black Theming**: An ultra-premium UI adorned with deep slate surfaces and high-contrast Neon Cyan accents, supported by crisp `@expo/vector-icons`.
- **Count-Up Milestones**: Set a date in the past to track your persisting milestones (e.g. "Days since I quit smoking").
- **Smart Notifications**: 
  - Daily scheduled local reminders using a custom notification sound channel.
  - Background-fetch resilience to instantly "top-up" local notifications.
- **Deep Link Viral Sharing**: Long-press any countdown card to magically generate a deep link that you can text to friends to import into their own app!
- **Auto-Archiving**: Countdowns that reach zero (and don't have a recurring schedule) naturally transition onto a dedicated Archive screen.

## 🛠 Tech Stack

- **Framework**: React Native 0.76 with [Expo SDK 52](https://expo.dev/)
- **Routing**: Expo Router (File-based navigation)
- **State/Data**: Context API + `@react-native-async-storage/async-storage`
- **Animations**: `react-native-reanimated` (Spring physics Engine)
- **Hardware Integrations**: `expo-location` (Sensor heading fusion), `expo-notifications`, `expo-haptics`, `expo-file-system`, `expo-image-picker`

---

## 🚀 Getting Started

This project is fully compatible with **Expo Go** ensuring zero friction to start. 

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Goldenprince4u/countdown-app.git
cd countdown-app
npm install
```

### 2. Run the Server

Start the Metro Bundler:

```bash
npx expo start
```

Open the **Expo Go** app on your device (iOS or Android) and scan the massive QR code displayed in your terminal. For notifications to work reliably over the lock screen on Android, a custom dev client profile may be built (`npx expo run:android`).

---

## 📁 Project Structure

```text
countdown-app/
├── app/                  # Expo Router file-based (Drawer, Timers, Archive, Modal)
├── components/           # Generous HitSlop-enabled UI pieces (CountdownCard)
├── context/              # Centralized global contexts (Ticker, Theme)
├── hooks/                # Async local storage handling & persistent notification loop
├── types/                # Strict typed schemas
├── constants/            # Dynamic theme palettes & styling tokens
└── assets/               # Local app manifest resources
```

---

*Designed & developed for managing the moments that matter, no matter how far away they are.*
