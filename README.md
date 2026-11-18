# தீக்கதிர் News Card Maker

Static web app (GitHub Pages) + a tiny free Google Apps Script backend.

* **Public page** – anyone can build a card. The only action is **Submit**. The preview carries a copyright watermark.
* **Admin** (password) – open the submitted cards, **correct** the text/photos, **Save correction**, and **Download** the clean JPG. Download exists only here.

## 1. Backend (5 minutes, free)
1. Go to <https://script.google.com> → New project → paste `backend/Code.gs`.
2. **Project Settings → Script properties → Add** `ADMIN_PASSWORD` = your strong password.
3. **Deploy → New deployment → Web app** · Execute as: **Me** · Who has access: **Anyone** → Deploy, authorise, copy the **Web app URL**.
4. Paste the URL into `config.js` as `API_URL` (optionally set `HANDLE` / `SITE`).

Submissions are saved as files in a Drive folder `NewsCardSubmissions` in your account. The password is checked on the server, never stored in the page.
After editing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**.

## 2. Publish on GitHub Pages
Upload all files to a repository (root), then **Settings → Pages → Deploy from a branch → main / (root)**.

## Screenshot protection – what is and isn't possible
A web page cannot block OS screenshots. So the public preview is covered with a repeating “© தீக்கதிர் • பதிப்புரிமை” watermark, right-click / copy / print / save shortcuts are disabled, and the clean card (no watermark) exists only in the password-protected admin view.

## Files
`index.html` · `style.css` · `app.js` · `config.js` · `logo.png` · `backend/Code.gs` · `.nojekyll`
