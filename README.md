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

---

## 🚀 Installation

### Global (recommended)

```bash
npm install -g nocase-server
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

# serve the 'www' folder on port 3000
nocase-server www -p 3000

# serve without SPA fallback (returns real 404s)
nocase-server --no-spa

# check version
nocase-server --version
```

Open <http://localhost:8080> (or the port you chose) in your browser.

---

## 🛠️ CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `<folder>` | `.` | Root directory to serve. |
| `-p <port>` | `8080` | Port to listen on. Can also be set via the `PORT` environment variable. |
| `--no-spa` | — | Disable SPA fallback. Returns 404 for missing files instead of serving `index.html`. |
| `-v, --version` | — | Show version number. |
| `-h, --help` | — | Show a short help message. |

---

## 🔒 Security Features

- **Path traversal protection**: Prevents `../` attacks
- **Symlink escape prevention**: Blocks symlinks that point outside the document root
- **HTTP method whitelist**: Only accepts GET and HEAD requests
- **Proper error handling**: Clean exit codes and error messages

---

## ⚡ Performance Features

- **LRU cache**: Speeds up repeated directory lookups
- **Stream-based file serving**: No memory buffering of large files
- **Optimized directory traversal**: Uses `fs.opendir()` with `withFileTypes`

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
