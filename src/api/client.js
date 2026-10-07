import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.hrtrac.in';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

client.interceptors.request.use(async (config) => {
  const access = await AsyncStorage.getItem('accessToken');
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const refresh = await AsyncStorage.getItem('refreshToken');
      if (refresh) {
        try {
          if (!refreshing) {
            refreshing = axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
          }
          const response = await refreshing;
          const access = response.data.access;
          await AsyncStorage.setItem('accessToken', access);
          original.headers.Authorization = `Bearer ${access}`;
          return client(original);
        } catch (_) {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'currentUser']);
        } finally {
          refreshing = null;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;

export const endpoints = {
  login: '/login/',
  sendLoginOtp: '/send-login-otp/',
  verifyLoginOtp: '/verify-login-otp/',
  forgotSendOtp: '/forgot-password/send-otp/',
  forgotVerifyOtp: '/forgot-password/verify-otp/',
  forgotReset: '/forgot-password/reset-password/',
  users: '/users/',
  user: (id) => `/users/${id}/`,
  updateUser: (id) => `/update-user/${id}/`,
  punchIn: '/punch-in/',
  punchOut: '/punch-out/',
  punches: '/punch-in-data/',
  punchesByUser: (id) => `/punch-in/user/${id}/`,
  // NOTE: placeholder — confirm the real endpoint with your backend for
  // saving a periodic (~2 hourly) location_tracking point on the active
  // punch record. Used by services/locationTracking.js.
  locationPing: '/location-tracking/',
  leaves: '/api/leaves/',
  leaveBalance: '/leave-balance/',
  regularization: '/regularization-requests/',
  expenses: '/get-expenses/',
  createExpense: '/create-expense/',
  salaries: '/salaries/',
  salaryByUser: (id) => `/salaries/user/${id}/`,
  payslips: (id) => `/payslip/user/${id}/`,
  holidays: '/holidays/',
  departments: '/departments/',
  subDepartments: '/sub-departments/',
  permissions: (id) => `/permissions/${id}/`,
  messages: '/inbox/',
  announcements: '/announcements/',
  organization: '/get-organization-details/',
  jobDetails: '/job-details/user/',
  subscription: '/subscription/status/',
  plans: '/plans/',
  paymentHistory: '/payment-history/',
  allJobDetails: '/job-details/',
  orgByUser: (id) => `/get-organization-details/user/${id}/`,
  regularizationByUser: (id) => `/regularization-requests/user/${id}/`,
};