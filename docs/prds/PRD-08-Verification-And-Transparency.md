# PRD-08: Verification & Transparency

## Goal
Allow employees to inspect both source code and runtime proof signals.

## Required controls
1. Public source repository for server and client.
2. Reproducible build instructions.
3. Published artifact hashes per deployed version.
4. Version endpoint exposing commit hash, build hash, build time, config schema version.
5. Runtime attestation proof (or explicit disclosure when unavailable).

## Employee-facing verification UI
- Build/source links
- Server hash and expected hash comparison
- Attestation status (Verified / Unavailable / Failed)
- Raw report download + plain-language explanation
