## 2025-02-18 - [Crawler SSRF Scope]
**Vulnerability:** Crawler accepted any URL via `--url` CLI argument and processed it without domain validation, allowing SSRF (e.g. `http://localhost:port`).
**Learning:** CLI tools are often assumed to be "user-driven" and thus safe, but if they process untrusted input (e.g. from a queue or automated script), they become attack vectors.
**Prevention:** Enforce strict domain and protocol validation at the earliest entry point (e.g. `processUrl`), regardless of the source of the URL (queue or CLI).

## 2025-02-18 - [Regex Injection in Data Pipeline]
**Vulnerability:** User-controlled content (product names/breadcrumbs) was used directly in `new RegExp` constructors without escaping, leading to potential ReDoS or application crashes (DoS) if the content contained invalid regex characters.
**Learning:** Never assume content derived from external sources (even "trusted" sites) is safe for use in regex construction. String literals used in regex patterns must always be escaped.
**Prevention:** Use a helper function like `escapeRegExp` to sanitize any dynamic string before passing it to `new RegExp`.
