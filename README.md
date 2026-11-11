# Hisab

A bilingual Home/Office expense tracker with an AMOLED glass UI, local-first storage, Firebase multi-device sync, Google Drive spreadsheet export, and monthly analytics.

## Run locally

```sh
cp .env.example .env.local
# Fill .env.local with the Firebase web app configuration
npm install
npm run dev
```

## Enable Google sign-in and cloud sync

1. Create a Firebase project and register a Web app. Copy its web config into `.env.local` using the `VITE_FIREBASE_*` variable names from `.env.example`.
2. In Firebase Console, enable **Authentication → Sign-in method → Google** and add your local/deployed host to the authorized domains.
3. Create a **Cloud Firestore** database and apply `firestore.rules`. Hisab stores data at `users/{uid}/private/hisab`; these rules restrict access to the signed-in owner.
4. Restart Vite after setting environment variables. Sign in with Google; the app listens to the user's Firestore document and syncs edits across signed-in devices.

## Enable Google Drive workbook sync

Google OAuth for Firebase must allow the Sheets/Drive scope. The sign-in flow requests `drive.file` (access to files created/opened by this app). In Google Cloud Console, enable the **Google Sheets API** and **Google Drive API** for the same project, configure the OAuth consent screen, and add required test users while the app is in testing. Use **Sync Google Drive workbook** in the top-right menu to create or update one spreadsheet containing `Home` and `Office` tabs. Drive sync is user-triggered; transaction cloud sync to Firestore is automatic while signed in.

For production, publish the OAuth consent screen, use your deployed domains in Firebase authorized domains, and review Google OAuth verification requirements for the requested scope. Do not commit `.env.local` or service-account credentials.

## Analytics and exports

The Insights tab includes daily income/expense trends, category spending, a Home/Office comparison, and spending mix. The menu can export an Excel workbook with separate Home and Office sheets or a CSV file.

```sh
npm run build
```
