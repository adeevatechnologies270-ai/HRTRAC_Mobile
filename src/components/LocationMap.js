// components/LocationMap.js
//
// Completely free map preview — no Google Maps, no API key, no billing
// account. Uses Leaflet.js (free, open-source) rendering OpenStreetMap tiles
// (free, no key required) inside a WebView.
//
// Requires: npx expo install react-native-webview
//
// Note: this needs an internet connection on the device to load the map
// tiles and the Leaflet library (both from public CDNs). That's normal for
// any map — Google Maps needs internet too.

import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { ExternalLink } from 'lucide-react-native';

const buildMapHtml = (lat, lng, zoom, interactive) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #F3F7FC; }
    .leaflet-control-attribution { font-size: 8px !important; padding: 1px 4px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: ${interactive},
      dragging: ${interactive},
      touchZoom: ${interactive},
      doubleClickZoom: ${interactive},
      scrollWheelZoom: ${interactive},
      boxZoom: ${interactive},
      keyboard: false,
      attributionControl: true
    }).setView([${lat}, ${lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker([${lat}, ${lng}]).addTo(map);
  </script>
</body>
</html>
`;

// interactive=false -> a static-looking preview thumbnail (used inside cards/modals)
// interactive=true  -> user can pan/zoom (use this if you ever show a full-screen map)
// showOpenInGoogleMaps=true -> shows a button below the map that opens the exact
//   same lat/lng in the real Google Maps app (or browser if not installed).
//   This uses Google's public "Universal Maps URL" — no API key needed, it's
//   the same link format you get when you tap "Share" on a Google Maps pin.
const openInGoogleMaps = (latitude, longitude) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  Linking.openURL(url).catch(() => {});
};

const LocationMap = ({ latitude, longitude, height = 150, zoom = 16, interactive = false, showOpenInGoogleMaps = true }) => {
  const html = useMemo(
    () => buildMapHtml(latitude, longitude, zoom, interactive),
    [latitude, longitude, zoom, interactive]
  );

  if (latitude == null || longitude == null) return null;

  return (
    <View>
      <View style={[styles.wrap, { height }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#0B4EA2" />
            </View>
          )}
        />
      </View>
      {showOpenInGoogleMaps && (
        <TouchableOpacity style={styles.openButton} onPress={() => openInGoogleMaps(latitude, longitude)} activeOpacity={0.75}>
          <ExternalLink size={13} color="#0B4EA2" />
          <Text style={styles.openButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E6ECF4', backgroundColor: '#F3F7FC' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F7FC' },
  openButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EAF3FF' },
  openButtonText: { marginLeft: 6, fontSize: 9.5, fontWeight: '800', color: '#0B4EA2' },
});

export default LocationMap;