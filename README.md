# Countdown App ⏳

A modern, highly-polished React Native application built with [Expo SDK 52](https://expo.dev) that lets you create, track, and manage all your important upcoming events—and even track milestones from the past!

## ✨ Features

- **Global Ticking Architecture**: Built with a centralized `TickerProvider` to update all active timers smoothly on the UI thread without destroying battery life.
- **Count-Up Milestones**: Set a date in the past (e.g., "Days since I quit smoking") to track your progressing milestones.
- **Dynamic Theming**: True Light, Dark, and System default global theme switching that dynamically alters the entire UI, including the Android OS navigation bar.
- **Deep Link Sharing**: Built-in viral loop! Long-press any countdown to generate an Expo Deep Link that you can text to friends to import into their own app.
- **Smart Notifications**: 
  - Daily "polite" reminders (e.g., "5 days to go") scheduled at 9:00 AM using a custom beep channel.
  - Urgent exact-time alarms the moment an event reaches zero.
  - Background-fetch resilience to automatically "top-up" local notifications and bypass the iOS 64-notification limit.
- **Persistent Media Caching**: Select gallery images for your countdown backgrounds. The app securely moves the volatile cache into the permanent `documentDirectory` and actively cleans up orphaned images to prevent storage bloat over time.
- **Auto-Archiving**: Countdowns that reach zero (and don't have a recurring schedule) automatically move onto a dedicated "Archive" tab.

## 🛠 Tech Stack

- **Framework**: React Native 0.76 with [Expo SDK 52](https://expo.dev/)
- **Routing**: Expo Router (File-based navigation)
- **State/Data**: Context API + `@react-native-async-storage/async-storage`
- **Animations**: `react-native-reanimated` + `expo-haptics`
- **Native Modules**: `expo-file-system`, `expo-image-picker`, `expo-notifications`, `expo-av`, `expo-navigation-bar`, `expo-linking`

---

## 🚀 Getting Started

This project is fully compatible with **Expo Go** (SDK 52), meaning you can run it immediately without needing an EAS custom dev client (though native Android features like `fullScreenIntent` for alarms over the lock-screen require a custom build).

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Goldenprince4u/countdown-app.git
cd countdown-app
npm install
```

### 2. Run the Development Server

Start the Metro Bundler:

```bash
npx expo start
```

Open the **Expo Go** app on your Android or iOS device and scan the QR code displayed in your terminal.

---

## 📁 Project Structure

```text
countdown-app/
├── app/                  # Expo Router file-based navigation (Timers, Archive, Modal)
├── components/           # Reusable UI components (CountdownCard, HapticTab)
├── context/              # Global state (Countdown, Ticker, Theme)
├── hooks/                # Local storage CRUD & background notification schedulers
├── types/                # TypeScript interfaces
├── constants/            # Dynamic theme palettes & styling tokens
└── assets/               # Sound files, splash screens, and icons
```

---

*Designed & developed for managing the moments that matter.*
