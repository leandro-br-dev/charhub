# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2025-12-19] - ComfyUI Middleware v2.0 & Environment Automation

### Added

- **ComfyUI Middleware v2.0 Integration**
  - Migrated ComfyUIService to use middleware v2.0 API routes
  - Added comprehensive unit tests for ComfyUIService (18 tests covering all methods)
  - Image generation now fully operational with GPU support (NVIDIA GeForce RTX 3060 Ti)

- **Automated Environment Sync System**
  - New script `scripts/ops/sync-production-env.sh` to automate `.env` deployment
  - Syncs both root `.env.production` and `frontend/.env.production` files
  - Automated backup creation with timestamps before each sync
  - MD5 verification to ensure successful sync
  - Dry-run and verify modes for safe operations
  - Established `.env.production` as source of truth principle

- **Deployment Documentation**
  - New checklist `docs/agents/reviewer/checklists/env-sync.md` with step-by-step procedures
  - Updated `docs/agents/reviewer/checklists/pre-deploy.md` to include env sync requirement
  - Updated `docs/agents/reviewer/INDEX.md` with new workflow integration

### Changed

- **ComfyUI Service**
  - Updated API endpoints from v1 to v2.0 routes
  - Improved error handling and response validation
  - Enhanced documentation with middleware architecture details

### Security

- **Secrets Management**
  - Removed exposed production tokens from all documentation files
  - Implemented automated sync to prevent manual `.env` editing on production servers
  - All secrets now managed through `.env.production` files in repository

### Fixed

- **CI/CD Pipeline**
  - Replaced `--runInBand` with `--maxWorkers=2` for better test performance
  - Added job timeout to prevent hanging workflows
  - Fixed credit service tests to use tier lookup instead of hardcoded plan IDs

### Documentation

- Added comprehensive ComfyUI middleware v2.0 documentation
- Created migration completion summary document
- Added test results documentation for middleware integration
- Updated environment variables documentation
- Enhanced deployment workflow documentation

---

## Release Notes

### ComfyUI Middleware v2.0

This release brings the CharHub application up to date with the latest ComfyUI middleware API. The migration includes:

- **Breaking Changes**: Internal API route changes (no user-facing impact)
- **Performance**: Improved reliability and error handling
- **Testing**: Full test coverage for ComfyUI integration
- **Security**: Production tokens secured and removed from documentation

### Environment Sync Automation

Introduces a robust system for managing production environment variables:

- **Automated Deployment**: No more manual SSH file editing
- **Safety**: Automatic backups and verification
- **Consistency**: Single source of truth for all environments
- **Documentation**: Complete workflow integration

### Deployment Impact

- **Downtime**: ~3 minutes during container rebuild
- **Database**: No migrations required
- **Rollback**: Available via automated script
- **Monitoring**: Health checks passed, all systems operational

---

## Previous Releases

For releases prior to 2025-12-19, refer to commit history and pull request documentation.

[Unreleased]: https://github.com/leandro-br-dev/charhub/compare/main...HEAD
[2025-12-19]: https://github.com/leandro-br-dev/charhub/commit/979af98fbc6be3281362e93fecfc9b7e083ba06d
