# Countdown App ⏳

A premium, feature-rich React Native app built with [Expo SDK 52](https://expo.dev) for tracking everything that matters — from birthdays and trips to daily milestones. Ships with a suite of location-aware tools: a hardware-fused Qiblah compass, a live GPS dashboard, a Leaflet-powered map, and a waypoint navigator.

---

## ✨ Features

### Core
- **Countdown & Count-Up Timers** — Set future dates to count down, or past dates to track milestones (e.g. "Days since I quit smoking")
- **Pinning & Categories** — Pin priority countdowns to the top; filter by Personal, Work, Birthday, Travel, or Other
- **Undo Delete** — Accidental deletes are recoverable via a 4-second undo snackbar
- **Custom Accent Colors & Photos** — Assign a custom color or full-bleed background photo to each countdown card
- **Notes** — Attach free-text notes to any countdown (shown as a snippet on the card)
- **Repeat Intervals** — Weekly, monthly, or yearly auto-renew for recurring events
- **Smart Alarm** — Plays a bundled sound when a countdown hits zero; duration configurable per-card (15–60 s)

### Notifications
- **Daily reminders** at 9 AM for every remaining day ("3 days to go")
- **Completion alert** fires at the exact moment the countdown hits zero
- **Background top-up** — notification slots are refreshed every 14 days to stay within OS limits (iOS: 30 concurrent, Android: 490)
- **App icon badge** reflects active countdown count

### Sharing
- **Deep Link Viral Sharing** — Long-press any card → "Share" generates a `countdownapp://import?...` deep link. Recipients tap it to instantly add the countdown to their own app

### Navigation & Tools (Drawer screens)
| Screen | Description |
|--------|-------------|
| **Live Map** | Leaflet-powered WebView map with Street / Satellite / Terrain tile layers, pulsing current-location dot, address reverse-geocoding, one-tap recenter |
| **Waypoint Tracker** | Save up to 20 named locations (car, tent, hotel, flag, star icons). Live bearing arrow rotates to point toward the active waypoint; "You've Arrived!" alert at < 20 m |
| **Trip Dashboard** | Real-time GPS speedometer with animated arc gauge, altitude trend, heading compass, distance accumulator, average speed, and session max speed |
| **Compass & Qiblah** | Hardware-fused magnetic/true-north compass with 360 tick dial. Switch to Qiblah mode for a cyan crescent marker showing the direction of Mecca, automatically calculated from your GPS position |

### UX Polish
- **Dark / Light / System theme** — toggle cycles through all three
- **Swipe-to-archive/delete** on countdown cards and waypoints
- **Haptic feedback** on actions and tab presses
- **Onboarding flow** shown once on first launch
- **Error Boundary** — resets corrupted app data gracefully

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76 + Expo SDK 52 |
| Routing | Expo Router 4 (file-based, Drawer + Stack + Tabs) |
| Animations | `react-native-reanimated` 3 (spring physics, shared values) |
| Gestures | `react-native-gesture-handler` (swipeable cards, drawer) |
| State | React Context API + `@react-native-async-storage/async-storage` |
| Notifications | `expo-notifications` (local scheduling, channels, badge) |
| Location | `expo-location` (GPS, heading, reverse-geocoding) |
| Audio | `expo-av` (alarm sound playback) |
| Maps | Leaflet 1.9.4 via `react-native-webview` (CartoDB & Esri tiles) |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons, Ionicons) + SF Symbols on iOS |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`) **or** use `npx`
- [Expo Go](https://expo.dev/go) on your iOS / Android device for quick testing

### 1. Clone & Install

```bash
git clone https://github.com/Goldenprince4u/countdown-app.git
cd countdown-app
npm install
```

### 2. Start the Dev Server

```bash
npx expo start
```

Scan the QR code with Expo Go. For full notification support on Android (lock screen, alarm channel), build a dev client:

```bash
npx expo run:android   # or run:ios
```

### 3. Optional: EAS Build (production APK / IPA)

```bash
eas build --platform android --profile development
```

---

## 📁 Project Structure

```
countdown-app/
├── app/
│   ├── _layout.tsx              # Root layout: providers + error boundary
│   ├── modal.tsx                # Add/Edit countdown modal
│   └── (drawer)/
│       ├── _layout.tsx          # Drawer navigator
│       ├── compass.tsx          # Compass & Qiblah screen
│       ├── dashboard.tsx        # Trip Dashboard (speedometer)
│       ├── map.tsx              # Live Map (Leaflet WebView)
│       ├── waypoint.tsx         # Waypoint Tracker
│       └── (tabs)/
│           ├── _layout.tsx      # Tab bar
│           ├── index.tsx        # Timers (main screen)
│           └── explore.tsx      # Archive screen
├── components/
│   ├── countdown-card.tsx       # Animated, swipeable countdown card
│   ├── haptic-tab.tsx           # Haptic tab bar button
│   └── ui/
│       ├── icon-symbol.tsx      # Cross-platform icon (SF Symbols / MaterialIcons)
│       └── icon-symbol.ios.tsx  # iOS native SF Symbols variant
├── context/
│   ├── countdown-context.tsx    # Countdown CRUD context
│   ├── theme-context.tsx        # Dark/Light/System theme context
│   └── ticker-context.tsx       # Centralized 1-second timer
├── hooks/
│   ├── use-alarm.ts             # Expo AV alarm playback
│   ├── use-countdowns.ts        # AsyncStorage persistence + notification scheduling
│   ├── use-notifications.ts     # Channel setup, schedule/cancel helpers
│   └── use-color-scheme.ts      # Web-safe color scheme hook
├── types/
│   └── countdown.ts             # Types, constants, getTimeRemaining, migrateSchema
├── constants/
│   └── theme.ts                 # Design tokens: colors, spacing, radius, fonts
└── assets/
    ├── images/                  # App icons, splash screen
    └── sounds/
        └── alarm.wav            # Bundled alarm sound
```

---

## 🔒 Security & Safety Notes

- Deep link import validates that the `date` query param is a real parseable date before showing any UI
- Alarm duration is clamped to 60 seconds both in the modal and in persistent storage migrations
- Background image files are cleaned up from `documentDirectory` when a countdown is deleted or its photo replaced
- The single-instance alarm sound is guarded against concurrent playback via `isPlayingRef`
- All GPS/location subscriptions are cleaned up on AppState background and component unmount

---

*Designed & developed for managing the moments that matter, no matter how far away they are.*
