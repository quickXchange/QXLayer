---
name: Hostname normalization safety
description: Node IDN conversion is not a hostname validator.
---

Reject URL syntax before converting a customer hostname with Node's IDN
normalizer. Keep canonicalization separate from input validation.

**Why:** During domain onboarding verification, `domainToASCII` silently
discarded a path component instead of rejecting the input. A regular expression
applied only to its output therefore accepted a URL-like value as a hostname.

**How to apply:** When adding domain entry points, reject protocols, paths,
ports, credentials, fragments, queries and encoded URL syntax before IDN
conversion; then validate the canonical hostname and reserved platform names.
