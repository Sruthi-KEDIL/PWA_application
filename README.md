# Safe Scientific – Patient Records PWA

A Progressive Web App built with plain HTML, CSS and JavaScript (no build step).

## Folder structure

```
safe-scientific-pwa/
├── index.html
├── styles.css
├── app.js
├── sw.js                     (service worker – offline support)
├── manifest.webmanifest      (install / home-screen settings)
└── icons/
    ├── logo.png              (full logo, transparent – splash screen and header)
    ├── favicon-32.png
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png  (iPhone home-screen icon, 180x180)
```

## 1. Brand logo (already added)

Your Safe Scientific logo is already installed in `icons/` (splash screen, header, favicon, Android and iPhone home-screen icons). To change it later, replace the PNGs there, keeping the same file names and sizes:

| File | Size | Notes |
|---|---|---|
| `logo.png` | 985 x 490 | Full logo with transparent background, used on the splash screen and header |
| `favicon-32.png` | 32 x 32 | Browser tab icon |
| `icon-192.png` | 192 x 192 | Android / desktop install icon (logo on white square) |
| `icon-512.png` | 512 x 512 | Android / desktop install icon |
| `icon-maskable-512.png` | 512 x 512 | Keep the logo inside the centre 80% (Android crops the edges) |
| `apple-touch-icon.png` | 180 x 180 | iPhone home-screen icon. Use a full square with no transparency; iOS rounds the corners |

Tip: https://realfavicongenerator.net or https://maskable.app/editor can create all sizes from one logo.

## 2. Match the website theme

The colours at the top of `styles.css` (inside `:root`) were taken from the logo: cyan `#00A0E3`, pink `#E50A7F` and grey `#656665`. If the website uses slightly different shades, change them there. Also update `theme_color` and `background_color` in `manifest.webmanifest` and the `theme-color` meta tags in `index.html` if you change the header colour.

## 3. Run it in VS Code

**Option A – Live Server (easiest)**
1. Install the **Live Server** extension in VS Code.
2. Open the `safe-scientific-pwa` folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server**.
4. It opens at `http://127.0.0.1:5500`.

**Option B – Python (no extension)**
```
cd safe-scientific-pwa
python3 -m http.server 8080
```
Open `http://localhost:8080`.

**Option C – Node**
```
cd safe-scientific-pwa
npx serve -l 8080
```

> Do not open `index.html` by double-clicking it. Service workers and manifests only work when served over `http://localhost` or HTTPS.

## 4. Test the PWA

- **Chrome / Edge on Mac or Windows:** open the page, then use the install icon in the address bar. Check DevTools > Application > Manifest and Service Workers.
- **iPhone (Safari):** open the page, tap **Share > Add to Home Screen**.
- **Android (Chrome):** menu > **Install app**.

While developing, tick **Update on reload** in DevTools > Application > Service Workers, or change `CACHE_VERSION` in `sw.js` whenever you edit files.

### Adding patient records

- Use the **Add patient** form to enter a name, numeric patient ID, age and oocyte count. Patient IDs must be unique.
- The page starts with 10 patient records and allows up to 20 records total.
- Names accept letters and spaces only; age and oocyte counts must be whole numbers.
- Added records are kept only in memory for the current page session and are cleared when the page is closed or refreshed. Do not enter real patient data; persistent records require a secure back end.

## 5. Open it on your phone from the local server

A phone can reach your computer's server over Wi-Fi (for example `http://192.168.1.20:8080`), but:

- Both devices must be on the same Wi-Fi network.
- iPhones and Android phones only enable the **service worker (offline mode)** on **HTTPS** or `localhost`. Over plain `http://192.168...` the page loads and can still be added to the Home Screen, but it will not work offline.
- To test the full PWA on a phone before final hosting, use one of:
  - **mkcert + a local HTTPS server** (creates a trusted local certificate), or
  - a tunnel such as **Cloudflare Tunnel** or **ngrok**, which gives a temporary HTTPS link.

## 6. Deploy to a local server later

The app is plain static files, so any web server works. Copy the whole folder to the server's web root.

**Windows (IIS):** copy to `C:\inetpub\wwwroot\safe-scientific\`, then add a MIME type for `.webmanifest` = `application/manifest+json` if it is not already defined.

**Linux (Nginx) example:**
```
server {
    listen 443 ssl;
    server_name patients.yourcompany.local;
    root /var/www/safe-scientific-pwa;
    index index.html;

    ssl_certificate     /etc/ssl/certs/patients.crt;
    ssl_certificate_key /etc/ssl/private/patients.key;

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
    types { application/manifest+json webmanifest; }
}
```

**Important for a local (intranet) server:** HTTPS is needed for the PWA install and offline features on phones. Use a certificate that the phones trust (a company CA, or a real domain with a certificate), otherwise iPhones will show warnings and block the service worker.

If you host it in a sub-folder (for example `https://server/safe-scientific/`), no code changes are needed because all paths in the app are relative.

## 7. Notes on data

The 10 patient names and details in `app.js` are **sample data stored in the page**. Do not put real patient data in this file. For real data, add a secure back end with login, HTTPS and the privacy controls your regulations require.
