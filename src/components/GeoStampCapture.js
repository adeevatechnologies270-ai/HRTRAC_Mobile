import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const OUT_W = 1080;

const GeoStampCapture = forwardRef((_, ref) => {
  const [job, setJob] = useState(null);
  const viewRef = useRef(null);
  const resolverRef = useRef(null);

  useImperativeHandle(ref, () => ({
    stamp: params =>
      new Promise(resolve => {
        Image.getSize(
          params.photoUri,
          (w, h) => {
            resolverRef.current = resolve;
            setJob({ ...params, height: Math.round((OUT_W * h) / w) });
            // safety: agar 8s mein image load na ho to raw photo use ho jaye
            setTimeout(() => {
              if (resolverRef.current === resolve) {
                resolverRef.current = null;
                setJob(null);
                resolve(null);
              }
            }, 8000);
          },
          () => resolve(null)
        );
      }),
  }));

  const onImageLoad = async () => {
    const resolve = resolverRef.current;
    if (!resolve || !job) return;
    try {
      await new Promise(r => setTimeout(r, 200)); // layout settle hone do
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.85,
        result: 'tmpfile',
        width: OUT_W,
        height: job.height,
      });
      resolverRef.current = null;
      resolve(uri);
    } catch (e) {
      console.log('Geo stamp capture failed:', e);
      resolverRef.current = null;
      resolve(null);
    } finally {
      setJob(null);
    }
  };

  if (!job) return null;

  const now = new Date();
  const dateText = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}  ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}  GMT +05:30`;

  return (
    <View pointerEvents="none" style={styles.host}>
      <View ref={viewRef} collapsable={false} style={{ width: OUT_W, height: job.height, backgroundColor: '#000' }}>
        <Image
          source={{ uri: job.photoUri }}
          style={{ width: OUT_W, height: job.height }}
          resizeMode="cover"
          onLoad={onImageLoad}
          onError={() => { const r = resolverRef.current; resolverRef.current = null; setJob(null); r && r(null); }}
        />
        <View style={styles.overlay}>
          <View style={styles.topRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{job.label || 'Punch In'}</Text></View>
            <View style={styles.brand}><Text style={styles.brandText}>HRTRAC</Text></View>
          </View>
          <Text style={styles.title}>{job.addressLines?.[0]}</Text>
          {!!job.addressLines?.[1] && <Text style={styles.sub}>{job.addressLines[1]}</Text>}
          <Text style={styles.sub}>Lat {job.latitude.toFixed(6)}°  Long {job.longitude.toFixed(6)}°</Text>
          <Text style={styles.sub}>{dateText}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Screen ke peeche (zIndex -1) lekin on-screen: offscreen view iOS/Android par blank capture deta hai
  host: { position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0.01 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 36, backgroundColor: 'rgba(0,0,0,0.55)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  badge: { backgroundColor: '#16A05D', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 24 },
  badgeText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  brand: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 24 },
  brandText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 38, fontWeight: '900' },
  sub: { color: '#E2E8F0', fontSize: 26, marginTop: 6, fontWeight: '600' },
});

export default GeoStampCapture;