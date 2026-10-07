# HRTRAC Mobile — React Native Android + iOS

This project is a React Native/Expo mobile application wired to the Django REST API found in the supplied HRTRAC backend.

## Included
- Email/password login using `/login/`
- OTP login using `/send-login-otp/` + `/verify-login-otp/`
- Forgot-password OTP flow
- JWT access + refresh token storage
- Automatic access-token refresh
- Role normalization for Master/Admin/Manager/Employee
- Dashboard
- Attendance punch-in with camera + foreground location
- Attendance punch-out with location
- Leave list + leave request
- Expense list + expense submission
- Employee directory
- Profile editing
- Mobile navigation
- API endpoint map covering the supplied Django routes

## API base URL

Default:
`https://api.hrtrac.in`

For another environment, create a `.env` file:

```env

```

Do NOT put Cashfree secrets, Django secrets, database credentials, or other private backend credentials in this mobile project.

## Run

Install Node.js LTS and then:

```bash
npm install
npx expo start
```

Android:

```bash
npx expo run:android
```

iOS (macOS + Xcode):

```bash
npx expo run:ios
```

For store/cloud builds, configure an Expo/EAS project and use the Android package and iOS bundle ID in `app.json`.

## Important backend note

The supplied Django API uses JWT access/refresh tokens. The app uses:

`Authorization: Bearer <access-token>`

The refresh endpoint expected by the app is:

`POST /api/token/refresh/`

If your Django project's JWT URLs use a different prefix, update the refresh request in `src/api/client.js`.

## Scope note

The original web application contains many desktop/table-heavy management screens. This mobile project establishes the production mobile architecture and implements the core employee workflows plus the API layer for the remaining modules. Desktop-only tables, complex admin CRUD, Cashfree checkout UI, and some advanced reports should be added as dedicated mobile screens rather than embedding the web UI.
