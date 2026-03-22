# Architecture & PRD Gap Review

## Context reviewed

I could not find the generated PRD/plan/source artifacts in this repository, so this review is based on the design details captured in the conversation history (PRD 1-10, implementation docs 1-8, and the TEE/attestation approach).

## Critical gaps to close before implementation

### 1) Contradiction: "malicious server" vs single-operator trust
- Your requirement says anonymity must hold even if the server is malicious.
- That only holds if trust is split (e.g., issuer vs collector vs decryption authority) and collusion assumptions are explicit.
- Action: define a formal trust matrix: which components may be compromised, and which must not collude.

### 2) Contradiction: strict anonymity vs rich filtering/comments
- Verbatim comments and unrestricted filter differencing can deanonymize users.
- You accepted this risk, but the PRD should explicitly classify this as a deliberate exception to anonymity guarantees.
- Action: split guarantees into:
  - **Transport/storage unlinkability guarantee** (strong)
  - **Analytical/content re-identification risk** (accepted)

### 3) Participation unlinkability vs "once per day" enforcement
- Local-only lock is privacy-preserving but not Sybil-resistant.
- If you do not verify unique daily participation server-side, a user can bypass local state.
- Action: document this as an integrity tradeoff and add abuse monitoring that does not add identity linkage.

### 4) "Mathematically impossible" wording is too strong without formal proofs
- You need a precise statement like: "computationally infeasible under assumptions A/B/C".
- Action: include a security claims section with assumptions (crypto hardness, non-collusion set, client integrity boundaries).

### 5) Attestation scope is underspecified
- Attestation proves measured code/config at launch, not ongoing behavior after compromised dependency channels or bad rollout policy.
- Action: define attested measurement inputs exactly:
  - executable hash
  - config hash
  - public key material hash
  - policy version
  - build provenance digest

### 6) Key lifecycle and compromise recovery
- Missing detail on key rotation, emergency revocation, and historical data handling when a key is suspected compromised.
- Action: add KMS/HSM procedures with RTO/RPO, rotation cadence, and forward secrecy expectations.

### 7) Cross-tenant isolation model
- Multi-tenant requirement needs explicit isolation for keys, queues, aggregation jobs, and dashboard query scopes.
- Action: define tenant boundary controls and per-tenant cryptographic separation.

### 8) Org-graph poisoning risk
- Manager chain is self-reported and unverified, so users can manipulate hierarchy and filtered aggregates.
- Action: add optional "verified org mode" for enterprises that can provide directory sync.

### 9) Score normalization semantics
- 1-100 normalization across custom scales needs deterministic mapping and rounding rules.
- Action: define exact function and edge cases so historical trend calculations are stable.

### 10) Event-time vs processing-time ambiguity
- Daily question assignment depends on local timezone, but batching/delay affects server processing day.
- Action: define canonical "survey day" as client-local date at presentation time, not ingest time.

### 11) Legal/compliance packaging for enterprise buyers
- Even if product-level PRD avoids implementation details, enterprise adoption needs documented controls.
- Action: add an assurance appendix (SOC2 mapping, retention policy, auditability boundaries).

## Rust vs TypeScript: do you need Rust?

Short answer: **you can build this in TypeScript**. Rust is not strictly required for the anonymity model.

### What actually matters more than language
1. Correct cryptographic protocol design
2. Strong, audited crypto primitives
3. Memory/key handling discipline
4. Reproducible builds + supply-chain integrity
5. Attestation verification correctness

### TypeScript is viable if you adopt strict constraints
- Use battle-tested native crypto libraries (libsodium bindings, WebCrypto where appropriate).
- Avoid custom crypto implementations in JS/TS.
- Move the most sensitive crypto operations into a small hardened service/module if needed.
- Enforce runtime hardening:
  - pinned dependencies + lockfile integrity
  - container immutability
  - minimal OS images
  - strict secrets handling

### Where Rust provides advantages
- Stronger memory-safety and lower accidental secret leakage risk.
- Better ecosystem for high-assurance crypto and constant-time discipline.
- Easier to build small auditable binaries for attested workloads.

### Recommended pragmatic approach (updated for single-language policy)
- Build all product and service components in **TypeScript** for simpler user auditability.
- Enforce strict crypto and architecture guardrails (no custom crypto, vetted primitives only, strict boundaries, reproducible builds).
- Keep trust-critical logic small and heavily tested, but still within the TypeScript codebase.

## Additional details to define before coding
1. Formal threat model table (attacker capability vs guarantee).
2. Exact protocol transcript (message-by-message, including nonce scopes).
3. Verification UX acceptance criteria (what a non-technical employee can verify in <3 minutes).
4. Incident response playbook for anonymity-impacting defects.
5. Red-team plan focused on linkage attacks (timing, filters, comments, tenant cross-talk).

## Suggested next artifacts
- `SECURITY_CLAIMS.md` with precise guarantee language.
- `TRUST_BOUNDARIES.md` with collusion assumptions.
- `CRYPTO_TRANSCRIPT.md` with canonical protocol flows.
- `TENANCY_MODEL.md` with isolation and key partitioning.
- `RISK_ACCEPTANCE.md` documenting accepted inference/comment risks.
