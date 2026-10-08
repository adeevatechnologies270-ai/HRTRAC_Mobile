// import React, {createContext, useContext, useEffect, useState} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import client, {endpoints} from '../api/client';

// const AuthContext = createContext(null);

// const normalizeRole = (value) => {
//   const role = String(value || '').trim().toLowerCase();
//   if (role.includes('master')) return 'Master';
//   if (role.includes('admin')) return 'Admin';
//   if (role.includes('manager')) return 'Manager';
//   return 'Employee';
// };

// export function AuthProvider({children}) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const hydrate = async () => {
//     try {
//       const raw = await AsyncStorage.getItem('currentUser');
//       const id = await AsyncStorage.getItem('userId');
//       if (raw && id) {
//         const cached = JSON.parse(raw);
//         setUser({...cached, role: normalizeRole(cached.role || cached.type || cached.user_type)});
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { hydrate(); }, []);

//   const login = async (email, password) => {
//     const {data} = await client.post(endpoints.login, {email, password});
//     await AsyncStorage.setItem('accessToken', data.token.access);
//     await AsyncStorage.setItem('refreshToken', data.token.refresh);
//     const me = await client.get(endpoints.users + `${await findUserIdByEmail(email)}/`);
//     await saveUser(me.data);
//     return me.data;
//   };

//   const findUserIdByEmail = async (email) => {
//     const {data} = await client.get(endpoints.users, {headers: {}});
//     const list = Array.isArray(data) ? data : data.results || [];
//     const found = list.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
//     if (!found) throw new Error('User profile could not be loaded.');
//     return found.id;
//   };

//   const requestOtp = (email) => client.post(endpoints.sendLoginOtp, {email});
//   const verifyOtp = async (email, otp) => {
//     const {data} = await client.post(endpoints.verifyLoginOtp, {email, otp});
//     await AsyncStorage.setItem('accessToken', data.token.access);
//     await AsyncStorage.setItem('refreshToken', data.token.refresh);
//     const id = await findUserIdByEmail(email);
//     const me = await client.get(endpoints.user(id));
//     await saveUser(me.data);
//     return me.data;
//   };

//   const saveUser = async (data) => {
//     const normalized = {...data, role: normalizeRole(data.role || data.type || data.user_type)};
//     setUser(normalized);
//     await AsyncStorage.setItem('currentUser', JSON.stringify(normalized));
//     await AsyncStorage.setItem('userId', String(data.id));
//   };

//   const refreshUser = async () => {
//     const id = await AsyncStorage.getItem('userId');
//     if (!id) return null;
//     const {data} = await client.get(endpoints.user(id));
//     await saveUser(data);
//     return data;
//   };

//   const logout = async () => {
//     await AsyncStorage.multiRemove(['accessToken','refreshToken','userId','currentUser']);
//     setUser(null);
//   };

//   return <AuthContext.Provider value={{user, loading, login, requestOtp, verifyOtp, refreshUser, logout}}>
//     {children}
//   </AuthContext.Provider>;
// }

// export const useAuth = () => useContext(AuthContext);
// ============================================================
// HRTRAC · Auth Context
// - Login
// - OTP Login
// - Logout
// - Refresh User
// - Session restore
// - Blocked user protection
//   user.block === true => "Your ID is deactivated."
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import client, {endpoints} from '../api/client';

const AuthContext = createContext(null);

/* ============================================================
   ROLE NORMALIZATION
============================================================ */

const normalizeRole = value => {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (role.includes('master')) return 'Master';
  if (role.includes('admin')) return 'Admin';
  if (role.includes('manager')) return 'Manager';

  return 'Employee';
};

/* ============================================================
   JWT DECODER
   atob() par depend nahi karta
============================================================ */

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const idx = c => B64.indexOf(c);

function decodeJwt(token) {
  try {
    if (!token) return null;

    let s = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    while (s.length % 4) {
      s += '=';
    }

    let out = '';

    for (let i = 0; i < s.length; i += 4) {
      const n =
        (idx(s[i]) << 18) |
        (idx(s[i + 1]) << 12) |
        ((s[i + 2] === '=' ? 0 : idx(s[i + 2])) << 6) |
        (s[i + 3] === '=' ? 0 : idx(s[i + 3]));

      out += String.fromCharCode((n >> 16) & 255);

      if (s[i + 2] !== '=') {
        out += String.fromCharCode((n >> 8) & 255);
      }

      if (s[i + 3] !== '=') {
        out += String.fromCharCode(n & 255);
      }
    }

    return JSON.parse(out);
  } catch (error) {
    return null;
  }
}

/* ============================================================
   USER NORMALIZATION
============================================================ */

const normalizeUser = data => {
  return {
    ...data,

    role: normalizeRole(
      data?.role ||
        data?.type ||
        data?.user_type
    ),
  };
};

/* ============================================================
   DEACTIVATED ERROR
============================================================ */

const deactivated = () => {
  return new Error('Your ID is deactivated.');
};

/* ============================================================
   CLEAR SESSION
============================================================ */

const clearSession = async () => {
  await AsyncStorage.multiRemove([
    'accessToken',
    'refreshToken',
    'userId',
    'currentUser',
  ]);
};

/* ============================================================
   AUTH PROVIDER
============================================================ */

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ==========================================================
     FETCH USER
  ========================================================== */

  const fetchUser = async id => {
    const {data} = await client.get(endpoints.user(id));

    return normalizeUser(data);
  };

  /* ==========================================================
     START SESSION
     
     Login / OTP ke baad:
     1. Token save
     2. JWT se user ID
     3. User profile fetch
     4. block check
     5. User save
  ========================================================== */

  const startSession = async tokenObj => {
    const access = tokenObj?.access;
    const refresh = tokenObj?.refresh;

    if (!access) {
      throw new Error('Login failed. Please try again.');
    }

    /* --------------------------------------------
       User ID JWT token se
    -------------------------------------------- */

    const payload = decodeJwt(access);

    const id =
      payload?.user_id ||
      payload?.userId ||
      payload?.id;

    if (!id) {
      throw new Error('Unable to read user from token.');
    }

    /* --------------------------------------------
       Save tokens
    -------------------------------------------- */

    await AsyncStorage.multiSet([
      ['accessToken', access],
      ['refreshToken', refresh || ''],
      ['userId', String(id)],
    ]);

    /* --------------------------------------------
       Fetch latest user
    -------------------------------------------- */

    let u;

    try {
      u = await fetchUser(id);
    } catch (error) {
      await clearSession();
      throw error;
    }

    /* --------------------------------------------
       BLOCK CHECK
    -------------------------------------------- */

    if (u?.block === true) {
      await clearSession();

      throw deactivated();
    }

    /* --------------------------------------------
       Save user
    -------------------------------------------- */

    await AsyncStorage.setItem(
      'currentUser',
      JSON.stringify(u),
    );

    setUser(u);

    return u;
  };

  /* ==========================================================
     LOGIN
  ========================================================== */

  const login = async (email, password) => {
    const {data} = await client.post(
      endpoints.login,
      {
        email,
        password,
      },
    );

    return startSession(data?.token);
  };

  /* ==========================================================
     REQUEST OTP
  ========================================================== */

  const requestOtp = async email => {
    await client.post(
      endpoints.sendLoginOtp,
      {
        email,
      },
    );
  };

  /* ==========================================================
     VERIFY OTP
  ========================================================== */

  const verifyOtp = async (email, otp) => {
    const {data} = await client.post(
      endpoints.verifyLoginOtp,
      {
        email,
        otp,
      },
    );

    return startSession(data?.token);
  };

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = useCallback(async () => {
    await clearSession();

    setUser(null);
  }, []);

  /* ==========================================================
     REFRESH USER
     
     Profile/Dashboard etc. se latest user data fetch karega.
     
     Agar backend se block=true aa gaya:
     → logout
     → session clear
  ========================================================== */

  const refreshUser = useCallback(async () => {
    const id = await AsyncStorage.getItem('userId');

    if (!id) {
      return null;
    }

    try {
      const u = await fetchUser(id);

      /* --------------------------------------------
         BLOCK CHECK
      -------------------------------------------- */

      if (u?.block === true) {
        await logout();

        throw deactivated();
      }

      /* --------------------------------------------
         Update cache
      -------------------------------------------- */

      await AsyncStorage.setItem(
        'currentUser',
        JSON.stringify(u),
      );

      setUser(u);

      return u;
    } catch (error) {
      /*
       * Agar user deactivate hua hai to same error
       * propagate karenge.
       */
      throw error;
    }
  }, [logout]);

  /* ==========================================================
     RESTORE SESSION ON APP START
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const [
          token,
          id,
          cached,
        ] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('userId'),
          AsyncStorage.getItem('currentUser'),
        ]);

        /* --------------------------------------------
           No active session
        -------------------------------------------- */

        if (!token || !id) {
          return;
        }

        try {
          /* ------------------------------------------
             Always get latest user from backend
          ------------------------------------------ */

          const u = await fetchUser(id);

          /* ------------------------------------------
             BLOCK CHECK
          ------------------------------------------ */

          if (u?.block === true) {
            await clearSession();

            if (mounted) {
              setUser(null);
            }

            return;
          }

          /* ------------------------------------------
             Save latest user
          ------------------------------------------ */

          await AsyncStorage.setItem(
            'currentUser',
            JSON.stringify(u),
          );

          if (mounted) {
            setUser(u);
          }
        } catch (error) {
          const status = error?.response?.status;

          /* ------------------------------------------
             Invalid/expired session
          ------------------------------------------ */

          if (
            status === 401 ||
            status === 403 ||
            status === 404
          ) {
            await clearSession();

            if (mounted) {
              setUser(null);
            }

            return;
          }

          /* ------------------------------------------
             Offline fallback
          ------------------------------------------ */

          if (cached && mounted) {
            try {
              const cachedUser = JSON.parse(cached);

              setUser(
                normalizeUser(cachedUser),
              );
            } catch (_) {
              setUser(null);
            }
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CONTEXT
  ========================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        login,
        requestOtp,
        verifyOtp,

        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ============================================================
   HOOK
============================================================ */

export const useAuth = () => useContext(AuthContext);