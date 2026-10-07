import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {theme} from '../theme/theme';

export default function Screen({children, scroll=true}) {
  const body = scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:theme.colors.background},content:{padding:18,paddingBottom:40}});