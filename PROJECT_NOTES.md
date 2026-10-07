Source analysis performed against the supplied HRTRAC React frontend and Django backend ZIPs.

Backend routes mapped include users, auth/OTP, punch-in/out, leave, regularization,
expenses, salaries/payslips, departments, holidays, permissions, inbox,
announcements, subscriptions and payments.

The mobile app intentionally does not copy web-only dependencies such as Ant Design,
Bootstrap, Leaflet or react-router-dom. It uses native React Native components and
React Navigation so Android/iOS can share one codebase.
