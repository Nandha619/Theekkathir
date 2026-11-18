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

## Admin sign-in — two modes (merged v7)

| Mode | When | How the password works |
|---|---|---|
| **Local** | `API_URL` in `config.js` is empty (default) | Admin password is checked inside the page. Default password: **Admin@123**. Submissions are stored in *this browser only* (localStorage). Good for trying it out / single-device use. |
| **Server** | `API_URL` filled with the Apps Script URL | Password is `ADMIN_PASSWORD` from Apps Script, checked on the server. Submissions from every visitor arrive in Drive. |

> Local mode is a simple gate, not real security — anyone who reads the page source could find the hash.
> For public use, set up the backend (section 1) so the password lives only on the server.

**Admin → "Brand"**: change logo, social handle and website printed on the cards (saved on the admin's device).
**v9:** Breaking-news tag now sits below the photo.
**v8:** logo centred (no background) on every card · date + place at the top, above the photo · footer = social icons + "Theekkathir" (change in `config.js` HANDLE, or Admin → Brand).
**Fixed in v7:** admin did not open / password failed because `API_URL` was empty and no server could verify it.
## Files
`index.html` · `style.css` · `app.js` · `config.js` · `logo.js` · `logo.png` · `backend/Code.gs` · `.nojekyll`
