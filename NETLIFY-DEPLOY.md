# Netlify'a Git ile Deploy

## 1. Değişiklikleri commit ve push et

Proje kökünde (`fta` klasöründe) terminal aç:

```powershell
cd c:\Users\Administrator\Desktop\fta

# Tüm değişiklikleri ekle
git add .

# Commit
git commit -m "FTA: PDF fix, 1-5 rating, PDF labels, Netlify redirects"

# GitHub/GitLab'a push (remote adın genelde origin)
git push origin main
```

Not: Branch adın `master` ise: `git push origin master`

---

## 2. Netlify'da site oluştur

1. https://app.netlify.com adresine gir, giriş yap.
2. **"Add new site"** → **"Import an existing project"**.
3. **"Deploy with GitHub"** (veya GitLab/Bitbucket) seç, repo’yu yetkilendir.
4. **Repository** olarak `fta` projesini seç.

---

## 3. Build ayarlarını ver

Netlify projen **farklı bir klasörde** (`src-rebuild`) olduğu için ayarları elle gir:

| Ayar | Değer |
|------|--------|
| **Base directory** | `src-rebuild` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

(Base directory = `src-rebuild` seçince Netlify bu klasörden çalışır; publish = `dist` yeterli, yani `src-rebuild/dist`.)

**Deploy site** butonuna bas.

---

## 4. Kontrol

- Site açılacak: `https://rastgele-isim.netlify.app`
- PDF yükleme çalışacak (Netlify Functions otomatik deploy olur).

---

## Özet

- Kod **Git’te** olacak → Netlify repo’ya bağlanacak.
- **Base directory:** `src-rebuild` (çünkü `package.json` orada).
- Build: `npm run build`, çıktı: `dist`.
- `netlify.toml` zaten `src-rebuild` içinde; Netlify bunu okuyacak. Base directory’yi `src-rebuild` yapınca komutlar bu klasörden çalışır.
