# חוק אבטחה: שימוש בטוקנים במערכת Strapi

## ❗ כלל מחייב

אסור להשתמש ב־API Token כללי (Global / Full Access Token) לצורך גישה לתוכן מהקליינט (Frontend).
יש להשתמש אך ורק בטוקן משתמש (JWT) שמתקבל לאחר התחברות (login) או הרשמה (register),
והטוקן חייב להישמר אך ורק בתוך **HttpOnly Cookie**.

---

## 🚫 מה אסור לעשות

- לא ליצור API Token עם הרשאות "Full Access"
- לא לשמור טוקנים ב־:
  - `localStorage`
  - `sessionStorage`
  - משתנים גלובליים ב־JS
- לא לשמור טוקן בתוך הקוד (Hardcoded)
- לא לשלוח JWT ידנית מה־Frontend (למשל דרך Authorization header)
- לא לחשוף גישה חופשית ל־Content דרך API

---

## ✅ מה כן לעשות

1. לבצע התחברות דרך `/api/auth/local` (credentials) או OAuth
2. בצד השרת (SvelteKit server actions / hooks):
   - לקבל את ה־JWT מ־Strapi
   - לשמור אותו בתוך Cookie עם ההגדרות:
     - `HttpOnly: true`
     - `Secure: true` (בייצור)
     - `SameSite: strict`
     - `maxAge: 7 days`
3. כל בקשה עתידית תישלח אוטומטית עם ה־Cookie (ללא גישה של JS לטוקן)
4. להגדיר הרשאות לפי משתמשים / Roles ב־Strapi

---

## 🧠 למה זה חשוב

| בעיה | סיכון |
|------|-------|
| API Token כללי | חושף את כל הדאטה - קריאה / כתיבה / מחיקה |
| JWT ב־localStorage | חשוף ל־XSS - כל סקריפט יכול לגנוב אותו |
| **HttpOnly Cookie** ✅ | לא נגיש ל־JavaScript - מצמצם סיכוני XSS |

---

## איך זה מיושם בפרויקט זה

```
login / register
      ↓
SvelteKit server action
      ↓
strapiLogin / strapiRegister → מקבל JWT
      ↓
cookies.set('strapi_jwt', jwt, { httpOnly: true, secure, sameSite: 'strict' })
      ↓
hooks.server.ts - מוסיף cookie אוטומטית אם חסר (גם ל-OAuth users)
      ↓
profile/+page.server.ts - event.cookies.get('strapi_jwt') → שולח ל-Strapi
```

---

## 🧪 Checklist לפני עלייה לאוויר

- [ ] אין API Tokens בקוד
- [ ] אין שימוש ב־localStorage / sessionStorage לטוקנים
- [ ] JWT נשמר רק ב־HttpOnly Cookie
- [ ] Cookie מוגדר עם `Secure` ו־`SameSite`
- [ ] כל ההרשאות מנוהלות דרך Roles ב־Strapi
- [ ] אין endpoint פתוח בלי צורך

---

> ⚠️ אם הקוד משתמש ב־API Token כללי או שומר JWT ב־localStorage - **זה באג אבטחה קריטי**.
