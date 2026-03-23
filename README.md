# Countdown App ⏳

A modern, beautifully designed React Native application built with [Expo](https://expo.dev) that lets you create, track, and manage all your important upcoming events.

## Features

- **Live Ticking Timers**: Events count down in real-time (Days, Hours, Minutes, Seconds).
- **Progress Tracking**: Visual progress bars show how close you are from the moment you created the event.
- **Persistent Storage**: All countdowns are saved locally on your device using `AsyncStorage` and remain available offline.
- **Smart Notifications**: 
  - Daily reminders every morning at 9:00 AM for active countdowns.
  - An exact-time alert the moment an event reaches zero.
  - Automatically cancels alerts when an event is deleted or archived.
- **Auto-Archiving**: Completed events automatically move off your active timeline and into a dedicated "Archive" tab.
- **Modern Dark Theme**: Stunning dark mode UI featuring category-specific neon accent colors and smooth spring animations.

## Tech Stack

- **Framework**: React Native with [Expo SDK 54](https://expo.dev/)
- **Routing**: Expo Router (File-based navigation)
- **State/Data**: React Context + `@react-native-async-storage/async-storage`
- **Animations**: `react-native-reanimated` 3.x
- **Date/Time Picker**: `@react-native-community/datetimepicker`
- **Notifications**: `expo-notifications`

---

## 🚀 Getting Started

Because this project utilizes custom Native Modules (like AsyncStorage and Notifications) and uses Expo SDK 54, it requires a **Development Build** rather than the standard Expo Go app.

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Goldenprince4u/countdown-app.git
cd countdown-app
npm install
```

### 2. Build the Dev Client (Android)

You must build the custom development application APK so that the native modules are compiled into your app binary.

*Ensure you are logged into EAS CLI (`npx eas-cli login`) first.*

```bash
npm run build:android
```

Once the build finishes in the Expo cloud, download the provided `.apk` link to your Android device and install it.

### 3. Run the Development Server

Start the Metro Bundler:

```bash
npm start
```

Open the newly installed "Countdown" dev client app on your Android device and scan the QR code displayed in your terminal.

---

## Project Structure

```text
countdown-app/
├── app/                  # Expo Router file-based navigation
│   ├── (tabs)/           # Tab navigator (Timers & Archive)
│   ├── _layout.tsx       # Root layout & context provider
│   └── modal.tsx         # Add/Edit Countdown form
├── components/           # Reusable UI components
│   └── countdown-card.tsx# Main live-ticking timer card
├── context/              # React Context for global state
├── hooks/                # Custom React hooks
│   ├── use-countdowns.ts # CRUD logic for AsyncStorage
│   └── use-notifications.ts # Daily & completion push logic
├── types/                # TypeScript interfaces
└── constants/            # Theme, Spacing, & Color tokens
```

## Troubleshooting

**Error: Unable to resolve module ../../App**
This happens if Expo caches the old boilerplate entry point. Stop the server and start it with the clear cache flag:
```bash
npm start -- --clear
```

**App crashes immediately on launch**
You are likely using a Dev Client APK that does not have the native code for `expo-notifications` or `async-storage` built into it. Ensure you run `npm run build:android` and install the latest APK on your device.

---

*Designed & developed for managing the moments that matter.*
