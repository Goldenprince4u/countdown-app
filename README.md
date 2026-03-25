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

- **Framework**: React Native with [Expo SDK 52](https://expo.dev/)
- **Routing**: Expo Router (File-based navigation)
- **State/Data**: React Context + `@react-native-async-storage/async-storage`
- **Animations**: `react-native-reanimated`
- **Date/Time Picker**: `@react-native-community/datetimepicker`
- **Notifications**: `expo-notifications`

---

## 🚀 Getting Started

This project is built with **Expo SDK 52** and is fully compatible with the standard **Expo Go** app on your phone. No custom development build is required!

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
npm start
```

Open the **Expo Go** app on your Android or iOS device and scan the QR code displayed in your terminal.

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
Ensure you are using an Expo Go version that supports SDK 52, or build your own custom dev client using `npm run start:dev` and EAS.

---

*Designed & developed for managing the moments that matter.*
