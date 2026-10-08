import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import client, { endpoints } from '../api/client';
import { useAuth } from '../context/AuthContext';

// GET /permissions/<user_id>/  ->  { features: [ { "Leave": "/attendance/leave" }, ... ] }
export default function usePermissions() {
  const { user } = useAuth();
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.get(endpoints.permissions(user.id));
      const list = (data?.features || []).flatMap((f) => Object.keys(f));
      setNames(list.map((n) => String(n).trim().toLowerCase()));
    } catch (e) {
      // 404 = is user ka permission record bana hi nahi
      console.log('Permissions error:', e?.response?.status, e?.message);
      setNames([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // App background se wapas aaye to permissions dobara fetch
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const can = (feature) => !!feature && names.includes(String(feature).trim().toLowerCase());

  return { can, loading, reload: load };
}