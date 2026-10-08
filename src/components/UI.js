import React from 'react';
import { themedCreate } from '../theme/themedStyles';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {theme} from '../theme/theme';

export function Title({children, sub}) { return <View style={{marginBottom:18}}><Text style={s.title}>{children}</Text>{sub?<Text style={s.sub}>{sub}</Text>:null}</View>; }
export function Card({children, style}) { return <View style={[s.card,style]}>{children}</View>; }
export function Button({children,onPress,disabled,secondary=false}) { return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&{opacity:.75},disabled&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{children}</Text></Pressable>; }
export function Field({label,...props}) { return <View style={{marginBottom:13}}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor="#9AA3B2" style={s.input} {...props}/></View>; }
export function Loading(){return <View style={{padding:30,alignItems:'center'}}><ActivityIndicator size="large" color={theme.colors.primary}/></View>}
export const styles=s;
const s=themedCreate({
 title:{fontSize:27,fontWeight:'800',color:theme.colors.text},sub:{color:theme.colors.muted,marginTop:4,fontSize:14},
 card:{backgroundColor:'#fff',borderRadius:theme.radius.md,padding:16,marginBottom:14,borderWidth:1,borderColor:theme.colors.border},
 label:{fontSize:13,fontWeight:'700',color:theme.colors.text,marginBottom:6},input:{height:50,borderWidth:1,borderColor:theme.colors.border,borderRadius:11,paddingHorizontal:14,color:theme.colors.text,backgroundColor:'#fff'},
 button:{height:50,borderRadius:12,backgroundColor:theme.colors.primary,alignItems:'center',justifyContent:'center',marginTop:5},buttonText:{color:'#fff',fontWeight:'800',fontSize:15},
 secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:theme.colors.primary},secondaryText:{color:theme.colors.primary}
});