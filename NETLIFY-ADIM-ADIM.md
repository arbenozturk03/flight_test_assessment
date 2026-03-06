# Git'e Atma + Netlify Deploy — Adım Adım

---

## BÖLÜM 1: Git'e atma

Kod şu an sadece bilgisayarında. Bunu GitHub’daki repoya göndermek için:

### 1.1 Proje klasörüne gir

PowerShell veya CMD aç, proje köküne geç:

```powershell
cd c:\Users\Administrator\Desktop\fta
```

(Bu klasörde `.git` var; yani zaten bir Git repo.)

### 1.2 Hangi dosyalar değişmiş bak

```powershell
git status
```

Kırmızı/yeşil listede gördüğün dosyalar commit’lenecek.

### 1.3 Tüm değişiklikleri “staging”e al

```powershell
git add .
```

Nokta = “bu klasördeki tüm değişiklikleri ekle” demek.

### 1.4 Commit at (yerel kayıt)

```powershell
git commit -m "FTA: PDF duzeltme, 1-5 puan, PDF etiketleri, Netlify yonlendirmeleri"
```

`-m` sonrası mesajı istersen Türkçe/İngilizce değiştirebilirsin.

### 1.5 GitHub’a gönder (push)

```powershell
git push origin main
```

- `origin` = GitHub’daki repo adresi (zaten tanımlı).
- `main` = branch adı (senin repoda main kullanıyorsun).

Bu adımdan sonra kod GitHub’da güncel olur.

**Hata alırsan:**

- “Authentication failed” → GitHub’a giriş yapman gerekir (tarayıcı veya Personal Access Token).
- “Permission denied” → Bu repoya yazma yetkin olmalı (repo sahibi veya yazma izinli hesap).

---

## BÖLÜM 2: Netlify’da site açma (ilk kez)

### 2.1 Netlify’a gir

Tarayıcıda: **https://app.netlify.com**  
Giriş yap (GitHub ile giriş yapabilirsin).

### 2.2 Yeni site ekle

- **“Add new site”** (veya “Sites” sayfasında **“Add site”**) tıkla.
- **“Import an existing project”** seç.

### 2.3 Git sağlayıcıyı seç

- **“Deploy with GitHub”** (veya GitLab / Bitbucket) seç.
- İlk seferde “Authorize Netlify” gibi bir buton çıkar; tıklayıp Netlify’a repo’lara erişim ver.

### 2.4 Repo’yu seç

- Listeden **flight_test_assessment** (fta projesi) reponu seç.
- Branch: **main** kalsın.

### 2.5 Build ayarlarını yaz

Uygulama repoda **src-rebuild** klasöründe olduğu için bunları mutlaka gir:

| Alan | Yazılacak |
|------|------------|
| **Base directory** | `src-rebuild` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

(Publish directory bazen Netlify “Base”e göre otomatik `dist` yapar; yine de `dist` yaz.)

### 2.6 Deploy’u başlat

- **“Deploy site”** (veya “Deploy flight_test_assessment”) butonuna bas.
- Netlify build alır (1–3 dk sürebilir).
- Bittiğinde **Site is live** gibi bir mesaj ve bir link verir: `https://....netlify.app`

Bu link = sitenin adresi. Tarayıcıda açınca form açılmalı; PDF yükleme de çalışır (Netlify Functions otomatik gelir).

---

## BÖLÜM 3: Sonradan güncelleme (kod değiştirdiğinde)

1. Kodu düzenle.
2. Aynı Git adımlarını tekrarla:

```powershell
cd c:\Users\Administrator\Desktop\fta
git add .
git commit -m "Ne degistirdiysen kisa yaz"
git push origin main
```

3. Netlify otomatik olarak yeni push’u görür ve yeniden build alır. Birkaç dakika sonra canlı sitede güncel hali görürsün.

---

## Özet (sırayla)

| Sıra | Ne yapıyorsun | Nerede |
|------|----------------|--------|
| 1 | `cd c:\Users\Administrator\Desktop\fta` | PowerShell |
| 2 | `git add .` | Aynı |
| 3 | `git commit -m "mesaj"` | Aynı |
| 4 | `git push origin main` | Aynı |
| 5 | Netlify → Add new site → Import project | Netlify sitesi |
| 6 | GitHub’dan repo seç, Base directory: `src-rebuild` | Netlify |
| 7 | Build: `npm run build`, Publish: `dist` | Netlify |
| 8 | Deploy site | Netlify |

Bundan sonra her “Git’e atma” (push) = Netlify’da otomatik deploy.
