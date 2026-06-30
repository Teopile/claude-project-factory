---
description: Security review of code or a design.
argument-hint: <code, endpoint, or design>
---
Run a security review on the following. Use the `security-reviewer` skill if
available; otherwise apply its method: $ARGUMENTS

Check input validation, authz, injection, secrets, unsafe deserialization, SSRF,
and the OWASP Top 10. Report findings by severity with concrete fixes. (For
pending git changes, the built-in /security-review is the deeper option.)
