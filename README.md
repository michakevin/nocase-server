# nocase-server

**Lightweight static HTTP server for development that resolves file paths case‑insensitively.**  
Perfect when you run Windows‑centric web projects (e.g. NW.js, Electron, RPG Maker) on a
case‑sensitive OS such as Linux or macOS and keep getting 404 errors due to mismatched
filename casing.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔍 **Case‑insensitive lookup** | Every path segment is matched ignoring letter case, so `/img/logo.png`, `/IMG/Logo.PNG`, `/img/LOGO.png` all resolve to the same file. |
| ⚡ **Zero configuration** | Point it to a folder, optional `-p` for the port, done. |
| 🎯 **SPA‑friendly** | If the requested file is not found, `index.html` is served, so React/Angular/Vue routers work out‑of‑the‑box. Use `--no-spa` to disable this behavior. |
| 🔒 **Security hardened** | Prevents symlink traversal and path escape attacks. |
| 📦 **Tiny dependency tree** | Only depends on the `mime` package (for proper `Content‑Type` headers). |
| 🛠️ **Node ≥ 18** | Uses native ES modules – no transpiler required. |
| ⚡ **Performance optimized** | LRU cache for directory resolution and proper stream handling. |
| 🎬 **HTTP Range support** | Supports byte-range requests for media streaming (ideal for Electron/NW.js apps). |

---

## 🚀 Installation

### Global (recommended)

```bash
npm install -g nocase-server
```

### As a dependency

```bash
npm install nocase-server
```

```javascript
import { createHandler } from 'nocase-server';

const handler = createHandler('/path/to/webroot', { spa: true });
```

### Local development

```bash
git clone https://github.com/michakevin/nocase-server.git
cd nocase-server
npm install
npm link        # makes the 'nocase-server' command globally available
```

---

## 🏃‍♂️ Quick Start

```bash
# serve the current directory on port 8080
nocase-server

# serve the 'www' folder on port 8080 (consistent port example)
nocase-server www -p 8080

# serve without SPA fallback (returns real 404s)
nocase-server --no-spa

# customize cache size (0 disables cache)
nocase-server --cache 5000

# use plain text 404 errors instead of HTML
nocase-server --plain-404

# check version
nocase-server --version
```

Open <http://localhost:8080> in your browser.

**Note:** Case-insensitive matching only works for ASCII characters. Unicode characters like umlauts (ä, ö, ü) are not normalized and must match exactly.

---

## 🛠️ CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `<folder>` | `.` | Root directory to serve. |
| `-p <port>` | `8080` | Port to listen on. Can also be set via the `PORT` environment variable. |
| `--no-spa` | — | Disable SPA fallback. Returns 404 for missing files instead of serving `index.html`. |
| `--cache <n>` | `2000` | Set LRU cache size for directory lookups. Use `0` to disable caching. |
| `--plain-404` | — | Return plain text 404 errors instead of HTML. |
| `-v, --version` | — | Show version number. |
| `-h, --help` | — | Show a short help message. |

---

## 🔒 Security Features

- **Path traversal protection**: Prevents `../` attacks
- **Symlink escape prevention**: Blocks symlinks that point outside the document root
- **HTTP method whitelist**: Only accepts GET and HEAD requests
- **Proper error handling**: Clean exit codes and error messages
- **Additional symlink safety**: Double-checks resolved file paths to prevent escapes

---

## ⚡ Performance Features

- **LRU cache**: Speeds up repeated directory lookups (configurable size)
- **Stream-based file serving**: No memory buffering of large files  
- **Optimized directory traversal**: Uses `fs.opendir()` with `withFileTypes`
- **HEAD request optimization**: No file streams opened for HEAD requests
- **HTTP Range support**: Efficient partial content delivery for media files

---

## 🤔 Why not just use `http-server`?

`http-server` (and most other static servers) rely on the underlying file system to
locate a file, so `index.html` ≠ `Index.html`. On Windows this doesn't matter, but on Linux
the lookup fails.  
`nocase-server` walks the directory tree manually and matches each segment in a
case‑insensitive way, giving you the best of both worlds.

---

## 🧩 How it works

```text
request → split path → for each segment: readdir + case‑insensitive match → stream file
```

The server logic is kept intentionally simple and uses only Node.js standard APIs
plus the `mime` package for content-type detection.

---

## 🧪 Testing

```bash
npm test
```

Includes comprehensive tests for:

- Case-insensitive file resolution
- SPA fallback behavior  
- Security (symlink traversal prevention)
- HTTP method validation
- CLI functionality
- HEAD request handling
- HTTP Range request support
- Cache functionality
- Error handling (HTML vs plain text 404s)

---

## 👐 Contributing

1. Fork the repo  
2. `npm install`  
3. Create a branch and hack away  
4. Open a pull request

PRs for performance improvements, additional CLI flags or better docs are welcome!

---

## 📄 License

MIT © 2025 Micha Starke
