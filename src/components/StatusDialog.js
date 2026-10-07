import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';

const THEME = {
  success: { color: '#16A05D', soft: '#E8F8F0', Icon: CheckCircle2 },
  error: { color: '#EF4444', soft: '#FDEDEE', Icon: XCircle },
  warning: { color: '#E98A24', soft: '#FFF4E7', Icon: AlertTriangle },
  info: { color: '#0B4EA2', soft: '#EAF3FF', Icon: Info },
};

const StatusDialog = ({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onClose,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const theme = THEME[type] || THEME.info;
  const Icon = theme.Icon;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const handleConfirm = () => {
    onClose?.();
    onConfirm?.();
  };

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
            <View style={[styles.iconInner, { backgroundColor: theme.color }]}>
              <Icon size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttonRow}>
            {!!cancelText && (
              <TouchableOpacity activeOpacity={0.85} style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.85} style={[styles.button, { backgroundColor: theme.color }]} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(7,27,55,.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 26, padding: 22, alignItems: 'center', elevation: 12 },
  iconWrap: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontSize: 18, fontWeight: '900', color: '#12233F', textAlign: 'center' },
  message: { marginTop: 8, fontSize: 12.5, lineHeight: 18, color: '#64748B', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  button: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#F1F5F9' },
  cancelText: { fontSize: 13, fontWeight: '800', color: '#12233F' },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});

export default StatusDialog;