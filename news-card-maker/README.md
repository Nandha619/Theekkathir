# தீக்கதிர் News Card Maker (Supabase + PC workspace version)

* **Public page** – card editor only (5 templates: Daily, Red, Maroon, Blue, Green). The only action is **Submit**; preview carries a copyright watermark; right-click / copy / print / save keys are disabled. Submitted cards are stored clean (no watermark).
* **Admin** (`#admin` or the Admin button) – submitted cards list → **Edit / correct**, **Save correction**, **Download** (clean JPG), **Delete**; Brand & fade settings (logo, handle, website, copyright holder, default fade).
* **Layout** – phone: single column. PC (≥1000px): DaVinci-Resolve-style workspace (phone viewer left, inspector right, page bar bottom).
* **Backend** – Supabase tables `cm_brand`, `cm_subs`, `cm_admin` (no public table access; only `cm_*` functions). Admin password is a bcrypt hash in the database.
* **Host** – any static host (Vercel / Netlify / GitHub Pages). No build step.

A browser page cannot block OS screenshots; the watermark and disabled shortcuts are deterrents only.
