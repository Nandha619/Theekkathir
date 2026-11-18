# Theekkathir – News Card Maker

Public page = card editor only (4 templates). Visitors can only **Submit**; they cannot download or share.
Admin (`#admin`, bottom-bar "Admin") → submitted cards with **Download / Delete**, and Brand settings (logo, name, handle, website, copyright holder, default fade).

* Phone: single column. PC (≥1000px): DaVinci-Resolve-style workspace — phone viewer on the left, inspector (Text / Photo / Fade / Deliver) on the right, page bar at the bottom.
* Backend: Supabase tables `cm_brand`, `cm_subs`, `cm_admin` (no direct public access; only the `cm_*` RPC functions). Admin password is stored as a bcrypt hash in the database.
* Logo: sign in as admin → Brand & fade → upload the wide logo (logo.png in this folder is the file supplied by the owner).
* Host: any static host (Vercel / Netlify / GitHub Pages). No build step.

Note: a browser page cannot block OS screenshots or screen recording.
