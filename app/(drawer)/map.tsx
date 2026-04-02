import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

type MapLayer = 'street' | 'satellite' | 'terrain';

export default function MapScreen() {
  const { lat: pLat, lng: pLng, name: pName } = useLocalSearchParams();
  const targetLat = pLat ? parseFloat(pLat as string) : null;
  const targetLng = pLng ? parseFloat(pLng as string) : null;
  const targetName = (pName as string) || 'Waypoint';

  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const isDark = effectiveTheme === 'dark';

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    targetLat && targetLng ? { lat: targetLat, lng: targetLng } : null
  );
  const [address, setAddress] = useState<string>(targetName && targetLat ? `Waypoint: ${targetName}` : 'Locating...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>('street');
  const [mapReady, setMapReady] = useState(false);
  const [coordsText, setCoordsText] = useState<string>(targetLat && targetLng ? `${targetLat.toFixed(5)}, ${targetLng.toFixed(5)}` : '');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Cannot show your position.');
        setAddress('Permission denied');
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setLocation({ lat: latitude, lng: longitude });

        if (!mapCenter) {
          setMapCenter({ lat: latitude, lng: longitude });
        }

        if (!targetLat) {
          setCoordsText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          // Reverse geocode to get a readable address
          const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo && geo.length > 0) {
            const g = geo[0];
            const parts = [g.name, g.street, g.city, g.region].filter(Boolean);
            setAddress(parts.slice(0, 3).join(', ') || 'Unknown location');
          }
        }
      } catch {
        setErrorMsg('Could not fetch GPS position.');
        if (!targetLat) setAddress('GPS unavailable');
      }
    })();
  }, []);

  const buildLeafletHTML = (
    centerLoc: { lat: number; lng: number },
    userLoc: { lat: number; lng: number } | null,
    target: { lat: number; lng: number; name: string } | null,
    layer: MapLayer,
    dark: boolean
  ) => {
    // CartoDB tiles: no referrer requirement, free, high quality, globally available
    // Esri World Imagery: best free satellite option, correct {z}/{y}/{x} ordering
    const tileLayers: Record<MapLayer, { url: string; attribution: string; crossOrigin: boolean }> = {
      street: {
        // CartoDB Dark Matter (dark mode) / Positron (light mode) — no API key, no referrer
        url: dark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: false,
      },
      satellite: {
        // Esri World Imagery — free, no key needed, note: {z}/{y}/{x} order (NOT {z}/{x}/{y})
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
        crossOrigin: false,
      },
      terrain: {
        // CartoDB Voyager — has terrain shading + POI labels, prettier than OpenTopoMap
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        crossOrigin: false,
      },
    };

    const tile = tileLayers[layer];
    const bgColor = dark ? '#12121A' : '#F4F6F9';
    const textColor = dark ? '#FFFFFF' : '#11181C';
    const accentColor = dark ? '#00E5FF' : '#00B3CC';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <meta name="referrer" content="no-referrer"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bgColor}; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { font-size: 8px !important; }
    .custom-dot {
      width: 18px; height: 18px;
      background: ${accentColor};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 4px ${accentColor}44;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 4px ${accentColor}44; }
      50% { box-shadow: 0 0 0 12px ${accentColor}11; }
      100% { box-shadow: 0 0 0 4px ${accentColor}44; }
    }
    .waypoint-pin {
      width: 24px; height: 24px;
      background: #FF6B6B;
      border: 3px solid white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${centerLoc.lat}, ${centerLoc.lng}], 15);

    var currentTileLayer = L.tileLayer('${tile.url}', {
      attribution: '${tile.attribution}',
      maxZoom: 19,
      maxNativeZoom: ${layer === 'satellite' ? 17 : 19},
      crossOrigin: false
    }).addTo(map);

    ${userLoc ? `
    // Pulsing dot for current location
    var dotIcon = L.divIcon({
      className: '',
      html: '<div class="custom-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([${userLoc.lat}, ${userLoc.lng}], { icon: dotIcon })
      .addTo(map)
      .bindPopup('<b style="color:${textColor}">You are here</b>');

    // Accuracy circle
    L.circle([${userLoc.lat}, ${userLoc.lng}], { radius: 40, color: '${accentColor}', fillColor: '${accentColor}', fillOpacity: 0.08, weight: 1 }).addTo(map);
    ` : ''}

    ${target ? `
    // Target Waypoint
    var targetIcon = L.divIcon({
      className: '',
      html: '<div class="waypoint-pin"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker([${target.lat}, ${target.lng}], { icon: targetIcon })
      .addTo(map)
      .bindPopup('<b style="color:${textColor}">${target.name}</b>').openPopup();
    ` : ''}

    // Listen for messages from React Native
    window.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'CENTER') {
          map.setView([msg.lat, msg.lng], 15, { animate: true });
        }
        if (msg.type === 'LAYER') {
          map.removeLayer(currentTileLayer);
          var isDark = ${dark ? 'true' : 'false'};
          var layers = {
            street: { url: isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
            satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
            terrain: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' }
          };
          currentTileLayer = L.tileLayer(layers[msg.layer].url, { maxZoom: 19, maxNativeZoom: msg.layer === 'satellite' ? 17 : 19, crossOrigin: false }).addTo(map);
        }
        if (msg.type === 'THEME') {
          var dark = msg.dark;
          document.body.style.background = dark ? '#12121A' : '#F4F6F9';
          if (currentTileLayer && currentTileLayer._url && currentTileLayer._url.indexOf('cartocdn') > -1 && currentTileLayer._url.indexOf('rastertiles') === -1) {
            map.removeLayer(currentTileLayer);
            var newUrl = dark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            currentTileLayer = L.tileLayer(newUrl, { maxZoom: 19, maxNativeZoom: 19, crossOrigin: false }).addTo(map);
          }
        }
      } catch(e) {}
    });

    // Notify React Native map is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
    }
  </script>
</body>
</html>`;
  };

  const sendMessageToMap = (msg: object) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(msg));
    }
  };

  const handleLayerChange = (layer: MapLayer) => {
    setMapLayer(layer);
    sendMessageToMap({ type: 'LAYER', layer });
  };

  const handleRecenter = () => {
    if (location) {
      sendMessageToMap({ type: 'CENTER', lat: location.lat, lng: location.lng });
    } else if (mapCenter) {
      sendMessageToMap({ type: 'CENTER', lat: mapCenter.lat, lng: mapCenter.lng });
    }
  };

  useEffect(() => {
    if (mapReady) {
      sendMessageToMap({ type: 'THEME', dark: isDark });
    }
  }, [isDark, mapReady]);

  const layerButtons: { key: MapLayer; icon: string; label: string }[] = [
    { key: 'street', icon: 'map-outline', label: 'Street' },
    { key: 'satellite', icon: 'earth', label: 'Satellite' },
    { key: 'terrain', icon: 'terrain', label: 'Terrain' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Address Banner */}
      <View style={[styles.addressBar, { backgroundColor: isDark ? 'rgba(18,18,26,0.95)' : 'rgba(255,255,255,0.95)', borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="map-marker" size={18} color={colors.accent} />
        <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
          {address}
        </Text>
        {coordsText ? (
          <Text style={[styles.coordsText, { color: colors.textMuted }]}>{coordsText}</Text>
        ) : null}
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {mapCenter ? (
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{
              html: buildLeafletHTML(
                mapCenter,
                location,
                targetLat && targetLng ? { lat: targetLat, lng: targetLng, name: targetName } : null,
                mapLayer,
                isDark
              ),
              baseUrl: 'https://localhost'
            }}
            originWhitelist={['*']}
            userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={Platform.OS === 'android'}
            mixedContentMode="always"
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === 'READY') setMapReady(true);
              } catch {}
            }}
            renderLoading={() => (
              <View style={[styles.loadingOverlay, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Map...</Text>
              </View>
            )}
          />
        ) : errorMsg ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.bg }]}>
            <MaterialCommunityIcons name="map-minus" size={64} color={colors.textMuted} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Map Unavailable</Text>
            <Text style={[styles.errorSub, { color: colors.textMuted }]}>{errorMsg}</Text>
          </View>
        ) : (
          <View style={[styles.loadingOverlay, { backgroundColor: colors.bg }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Getting your location...</Text>
          </View>
        )}
      </View>

      {/* Layer Selector */}
      <View style={[styles.controlBar, { backgroundColor: isDark ? 'rgba(18,18,26,0.95)' : 'rgba(255,255,255,0.95)', borderTopColor: colors.border }]}>
        <View style={styles.layerButtons}>
          {layerButtons.map((btn) => {
            const active = mapLayer === btn.key;
            return (
              <TouchableOpacity
                key={btn.key}
                style={[
                  styles.layerBtn,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => handleLayerChange(btn.key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={btn.icon as any}
                  size={18}
                  color={active ? (isDark ? '#000' : '#fff') : colors.textMuted}
                />
                <Text style={[styles.layerBtnText, { color: active ? (isDark ? '#000' : '#fff') : colors.textMuted }]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recenter Button */}
        <TouchableOpacity
          style={[styles.recenterBtn, { backgroundColor: colors.accent }]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={isDark ? '#000' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  coordsText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  layerButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  layerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  layerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
