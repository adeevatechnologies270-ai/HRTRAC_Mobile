import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client, {endpoints} from '../api/client';

const AuthContext = createContext(null);

const normalizeRole = (value) => {
  const role = String(value || '').trim().toLowerCase();
  if (role.includes('master')) return 'Master';
  if (role.includes('admin')) return 'Admin';
  if (role.includes('manager')) return 'Manager';
  return 'Employee';
};

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async () => {
    try {
      const raw = await AsyncStorage.getItem('currentUser');
      const id = await AsyncStorage.getItem('userId');
      if (raw && id) {
        const cached = JSON.parse(raw);
        setUser({...cached, role: normalizeRole(cached.role || cached.type || cached.user_type)});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { hydrate(); }, []);

  const login = async (email, password) => {
    const {data} = await client.post(endpoints.login, {email, password});
    await AsyncStorage.setItem('accessToken', data.token.access);
    await AsyncStorage.setItem('refreshToken', data.token.refresh);
    const me = await client.get(endpoints.users + `${await findUserIdByEmail(email)}/`);
    await saveUser(me.data);
    return me.data;
  };

  const findUserIdByEmail = async (email) => {
    const {data} = await client.get(endpoints.users, {headers: {}});
    const list = Array.isArray(data) ? data : data.results || [];
    const found = list.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!found) throw new Error('User profile could not be loaded.');
    return found.id;
  };

  const requestOtp = (email) => client.post(endpoints.sendLoginOtp, {email});
  const verifyOtp = async (email, otp) => {
    const {data} = await client.post(endpoints.verifyLoginOtp, {email, otp});
    await AsyncStorage.setItem('accessToken', data.token.access);
    await AsyncStorage.setItem('refreshToken', data.token.refresh);
    const id = await findUserIdByEmail(email);
    const me = await client.get(endpoints.user(id));
    await saveUser(me.data);
    return me.data;
  };

  const saveUser = async (data) => {
    const normalized = {...data, role: normalizeRole(data.role || data.type || data.user_type)};
    setUser(normalized);
    await AsyncStorage.setItem('currentUser', JSON.stringify(normalized));
    await AsyncStorage.setItem('userId', String(data.id));
  };

  const refreshUser = async () => {
    const id = await AsyncStorage.getItem('userId');
    if (!id) return null;
    const {data} = await client.get(endpoints.user(id));
    await saveUser(data);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['accessToken','refreshToken','userId','currentUser']);
    setUser(null);
  };

  return <AuthContext.Provider value={{user, loading, login, requestOtp, verifyOtp, refreshUser, logout}}>
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
