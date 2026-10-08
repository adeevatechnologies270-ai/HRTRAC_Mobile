// components/GeoStampCapture.js
//
// Burns a location watermark onto a captured photo — address, lat/long,
// date-time and a stylised pin badge — into a single merged image, the same
// way apps like "GPS Map Camera" do it.
//
// Requires: npx expo install react-native-view-shot
//
// Usage (see DashboardScreen.js / AttendanceScreen.js for the full wiring):
//   const geoStampRef = useRef(null);
//   ...
//   <GeoStampCapture ref={geoStampRef} />   // mount once, anywhere in the tree
//   ...
//   const stampedUri = await geoStampRef.current.stamp({
//     photoUri, latitude, longitude, addressLines: ['Samana, Punjab, India', '...full address...'],
//     label: 'Punch In',
//   });
//
// WHY THIS VERSION IS DIFFERENT
// ------------------------------
// The old version burned a *live* OpenStreetMap tile (tile.openstreetmap.org)
// into every single photo. OSM's tile servers are volunteer-run and explicitly
// forbid this kind of automated, per-request "hotlinking" use (see
// osm.wiki/Tile_usage_policy) — once you go over their limits they start
// serving back a literal "Access blocked" image instead of a map tile, which
// is exactly what got baked into your punch-in photos. There's no free/legal
// way to keep doing this at production scale without your own tile server or
// a paid provider (Mapbox, Google, etc.), so this version drops the live tile
// entirely and instead draws a clean, static pin badge — it always looks
// correct and needs zero network calls.
//
// The other bug ("dull" photo): the screenshot was being captured before the
// actual <Image> had finished decoding, so the ViewShot canvas was still
// showing its default background with only the text overlay drawn on top.
// This version now waits for the photo's onLoad (with a safety timeout) before
// it ever calls .capture().

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import { View, Image, Text, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { MapPin, Navigation } from 'lucide-react-native';

const formatStamp = date => {
  const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return { dateTime: `${datePart}  ${timePart}`, gmt: `GMT ${sign}${hh}:${mm}` };
};

const GeoStampCapture = forwardRef((props, ref) => {
  const shotRef = useRef(null);
  const [job, setJob] = useState(null);
  const [photoReady, setPhotoReady] = useState(false);

  useImperativeHandle(ref, () => ({
    // Resolves with the URI of the new, stamped image. Falls back to the
    // original photo (unstamped) if anything goes wrong, so punch-in never
    // gets blocked just because the watermark step failed.
    stamp: ({ photoUri, latitude, longitude, addressLines, label = 'Punch In' }) =>
      new Promise((resolve) => {
        let settled = false;
        const finish = async () => {
          if (settled) return;
          settled = true;
          try {
            // one extra frame so the just-loaded photo has actually painted
            await new Promise(r => setTimeout(r, 120));
            const uri = await shotRef.current.capture();
            resolve(uri);
          } catch (e) {
            resolve(photoUri);
          } finally {
            setJob(null);
            setPhotoReady(false);
          }
        };

        setPhotoReady(false);
        setJob({
          photoUri,
          latitude,
          longitude,
          label,
          addressLines: addressLines?.length ? addressLines : ['Location unavailable'],
          resolve: finish,
        });

        // Safety net — if onLoad/onError never fires for some reason, don't
        // block the punch-in flow forever.
        setTimeout(finish, 3000);
      }),
  }));

  // Only capture once the real photo has actually painted onto the canvas.
  useEffect(() => {
    if (job && photoReady) job.resolve();
  }, [job, photoReady]);

  if (!job) return null;

  const { dateTime, gmt } = formatStamp(new Date());

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <ViewShot ref={shotRef} options={{ format: 'jpg', quality: 0.92 }} style={styles.canvas}>
        <Image
          source={{ uri: job.photoUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onLoad={() => setPhotoReady(true)}
          onError={() => setPhotoReady(true)}
        />

        {/* Fake gradient scrim (stacked bands) so only the bottom of the photo darkens */}
        <View style={styles.scrimBand1} />
        <View style={styles.scrimBand2} />
        <View style={styles.scrimBand3} />

        <View style={styles.overlay}>
          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{job.label}</Text></View>
            <View style={styles.brandBadge}><Navigation size={11} color="#FFFFFF" /><Text style={styles.brandBadgeText}>HRTRAC</Text></View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.pinWrap}>
              <View style={styles.pinRingOuter} />
              <View style={styles.pinRingInner} />
              <View style={styles.pinCore}><MapPin size={24} color="#FFFFFF" /></View>
            </View>
            <View style={styles.textBlock}>
              {job.addressLines.map((line, idx) => (
                <Text key={idx} style={idx === 0 ? styles.placeName : styles.addressLine} numberOfLines={2}>{line}</Text>
              ))}
              <Text style={styles.latLong}>Lat {Number(job.latitude).toFixed(6)}°  Long {Number(job.longitude).toFixed(6)}°</Text>
              <Text style={styles.gmtLine}>{dateTime}   {gmt}</Text>
            </View>
          </View>
        </View>
      </ViewShot>
    </View>
  );
});

const styles = themedCreate({
  offscreen: { position: 'absolute', top: -10000, left: -10000 },
  canvas: { width: 900, height: 1200, backgroundColor: '#0B1B2E' },

  scrimBand1: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 340, backgroundColor: 'rgba(4,14,28,0.18)' },
  scrimBand2: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, backgroundColor: 'rgba(4,14,28,0.38)' },
  scrimBand3: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, backgroundColor: 'rgba(4,14,28,0.62)' },

  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  statusBadge: { backgroundColor: 'rgba(22,160,93,0.92)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brandBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  brandBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginLeft: 5, letterSpacing: 0.5 },

  bottomRow: { flexDirection: 'row', alignItems: 'flex-end' },
  pinWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  pinRingOuter: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.10)' },
  pinRingInner: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)' },
  pinCore: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0B4EA2', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  textBlock: { flex: 1 },
  placeName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  addressLine: { color: '#E7EEF7', fontSize: 14, marginTop: 4, fontWeight: '500' },
  latLong: { color: '#CFE1F8', fontSize: 14, marginTop: 9, fontWeight: '700' },
  gmtLine: { color: '#CFE1F8', fontSize: 13, marginTop: 3, fontWeight: '500' },
});

export default GeoStampCapture;