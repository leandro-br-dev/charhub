# Testing Checklist

**When to use**: Feature implementation complete, ready to test before PR

**See**: Full details in `CLAUDE-old-backup.md` Phase 3

## Quick Testing Steps

- [ ] Build TypeScript (backend + frontend): `npm run build`
- [ ] Run linting: `npm run lint`
- [ ] Run unit tests: `npm test`
- [ ] Start Docker: `docker compose up -d --build`
- [ ] Manual testing at `http://localhost:8082`
- [ ] Check console for errors
- [ ] Test happy path + error cases
- [ ] Build translations if needed

**Next**: [pr-creation.md](pr-creation.md)
