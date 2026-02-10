## 2025-02-18 - [Crawler SSRF Scope]
**Vulnerability:** Crawler accepted any URL via `--url` CLI argument and processed it without domain validation, allowing SSRF (e.g. `http://localhost:port`).
**Learning:** CLI tools are often assumed to be "user-driven" and thus safe, but if they process untrusted input (e.g. from a queue or automated script), they become attack vectors.
**Prevention:** Enforce strict domain and protocol validation at the earliest entry point (e.g. `processUrl`), regardless of the source of the URL (queue or CLI).
