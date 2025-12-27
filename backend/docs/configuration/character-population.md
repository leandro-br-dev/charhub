# Character Population Configuration Guide

## Overview

This guide explains how to configure the automated character population system. The system integrates with Civitai to discover and generate characters automatically.

---

## Environment Variables

### Required Configuration

```bash
# Database (required for all features)
DATABASE_URL=postgresql://user:password@localhost:5432/charhub

# Redis (required for queue system)
REDIS_URL=redis://localhost:6379
```

### Civitai Integration

```bash
# Civitai API Key (optional but recommended for higher rate limits)
CIVITAI_API_KEY=your_civitai_api_key_here

# Civitai API Base URL (default: https://civitai.com/api/v1)
CIVITAI_API_BASE_URL=https://civitai.com/api/v1

# Daily rate limit for Civitai API calls
# Default: 1000
CIVITAI_RATE_LIMIT=1000

# Comma-separated keywords for diverse image search
# Default: anime,fantasy,sci-fi,realistic,medieval,modern,cyberpunk,magical,girl,woman,man,warrior,mage,adventurer
CIVITAI_SEARCH_KEYWORDS=anime,fantasy,sci-fi,realistic,medieval,modern,cyberpunk,magical,girl,woman,man,warrior,mage,adventurer

# Optional: Comma-separated Civitai model IDs for anime-style filtering
# Leave empty to fetch from all models (filtering will use post-filtering instead)
# Example: 121540,64556,119544
CIVITAI_ANIME_MODEL_IDS=
```

### Batch Generation

```bash
# Enable/disable automated character population
# Default: false
BATCH_GENERATION_ENABLED=false

# Number of characters to generate per daily batch
# Default: 24
BATCH_SIZE_PER_RUN=24

# Hour (UTC) for daily curation job (fetches images from Civitai)
# Default: 3 (3 AM UTC)
DAILY_CURATION_HOUR=3

# Number of retry attempts for failed generations
# Default: 3
BATCH_RETRY_ATTEMPTS=3

# Timeout for batch operations (minutes)
# Default: 5
BATCH_TIMEOUT_MINUTES=5
```

### Curation Settings

```bash
# Minimum quality score for auto-approval (0-5 scale)
# Default: 4.5
AUTO_APPROVAL_THRESHOLD=4.5

# Require manual review even for high-quality images
# Default: false
REQUIRE_MANUAL_REVIEW=false

# Enable NSFW content filtering
# Default: true
NSFW_FILTER_ENABLED=true

# NSFW filter strictness (low, medium, high)
# Default: medium
NSFW_FILTER_STRICTNESS=medium
```

### Bot User

```bash
# User ID for automated character generation
# This should be a system user with BOT role
# Default: 00000000-0000-0000-0000-000000000001
OFFICIAL_BOT_USER_ID=00000000-0000-0000-0000-000000000001
```

---

## Setup Instructions

### 1. Database Migration

Run the Prisma migrations to create required tables:

```bash
cd backend
npx prisma migrate deploy
```

This creates:
- `CuratedImage` table
- `BatchGenerationLog` table
- New `CurationStatus` enum
- New `AuthProvider.SYSTEM` and `UserRole.BOT` enum values

### 2. Create Bot User

The bot user is automatically created from `src/data/system-users.json` on first run. Verify it exists:

```bash
npx prisma studio
# Check Users table for user with ID 00000000-0000-0000-0000-000000000001
```

### 3. Configure Civitai API (Optional)

While the system works without a Civitai API key, it's recommended for higher rate limits:

1. Create account at [Civitai](https://civitai.com)
2. Go to Account Settings → API Keys
3. Generate new API key
4. Add to `.env`:
   ```bash
   CIVITAI_API_KEY=your_key_here
   ```

### 4. Enable Automated Generation

To enable automated character population:

```bash
# In .env
BATCH_GENERATION_ENABLED=true
BATCH_SIZE_PER_RUN=24
DAILY_CURATION_HOUR=3
```

This will:
- Run curation job daily at 3 AM UTC (fetches 48 images)
- Generate 1 character per hour (max 24/day)

### 5. Start Queue Workers

The queue workers start automatically with the backend server:

```bash
npm run dev
# or
npm run start
```

Verify workers are running:
```bash
# Check logs for:
# "Character population worker registered"
# "Hourly generation job scheduled"
# "Daily curation job scheduled"
```

---

## Manual Operations

### Trigger Manual Curation

```bash
curl -X POST http://localhost:3000/api/v1/character-population/trigger-curation \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageCount": 50,
    "keywords": ["anime", "fantasy"]
  }'
```

### Trigger Manual Generation

```bash
curl -X POST http://localhost:3000/api/v1/character-population/trigger-batch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10
  }'
```

### Check System Status

```bash
curl http://localhost:3000/api/v1/character-population/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Scheduling Configuration

The system uses two main scheduled jobs:

### Daily Curation Job

**Schedule:** Once per day at `DAILY_CURATION_HOUR` (default: 3 AM UTC)

**What it does:**
1. Fetches `BATCH_SIZE_PER_RUN * 2` images from Civitai
2. Analyzes images using AI
3. Classifies content and age rating
4. Auto-approves high-quality images
5. Rejects NSFW or low-quality images

**Customization:**
```bash
DAILY_CURATION_HOUR=5  # Run at 5 AM UTC instead
```

### Hourly Generation Job

**Schedule:** Every hour at minute 0

**What it does:**
1. Checks daily generation count
2. If under limit, generates 1 character
3. Uses diversification algorithm to select image
4. Creates character and queues avatar generation

**Daily limit:** Controlled by `BATCH_SIZE_PER_RUN` (default: 24)

---

## Performance Tuning

### Rate Limiting

Adjust Civitai rate limit based on your API tier:

```bash
# Free tier
CIVITAI_RATE_LIMIT=100

# Paid tier
CIVITAI_RATE_LIMIT=10000
```

### Quality Thresholds

Adjust auto-approval threshold for quality control:

```bash
# Strict (fewer approvals, higher quality)
AUTO_APPROVAL_THRESHOLD=4.8

# Lenient (more approvals, may include lower quality)
AUTO_APPROVAL_THRESHOLD=4.0
```

### Batch Size

Adjust daily generation count:

```bash
# Generate fewer characters per day
BATCH_SIZE_PER_RUN=12

# Generate more characters per day
BATCH_SIZE_PER_RUN=48
```

**Note:** Higher batch sizes require more:
- Civitai API calls
- AI analysis credits
- Storage space
- Processing time

---

## Monitoring

### Check Queue Status

```bash
# Via API
curl http://localhost:3000/api/v1/character-population/jobs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Via Redis CLI
redis-cli
> KEYS bull:character-population:*
> HGETALL bull:character-population:completed
```

### Check Curation Stats

```bash
curl http://localhost:3000/api/v1/character-population/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Application Logs

Monitor logs for:
- `Character population worker registered` - Worker started
- `Fetched trending images from Civitai` - API calls
- `Image added to curation queue` - New images
- `Item analyzed and classified` - Analysis results
- `Character created successfully` - Generation success
- `Batch generation completed` - Job completion

---

## Troubleshooting

### No characters being generated

Check:
1. `BATCH_GENERATION_ENABLED=true` in `.env`
2. Redis is running and accessible
3. Queue worker is registered (check logs)
4. Approved images exist in queue:
   ```sql
   SELECT COUNT(*) FROM "CuratedImage" WHERE status = 'APPROVED' AND "generatedCharId" IS NULL;
   ```

### Rate limit exceeded

Solutions:
1. Get Civitai API key for higher limits
2. Reduce `CIVITAI_RATE_LIMIT`
3. Increase `DAILY_CURATION_HOUR` interval
4. Reduce `BATCH_SIZE_PER_RUN`

### All images being rejected

Check:
1. `AUTO_APPROVAL_THRESHOLD` - may be too high
2. `NSFW_FILTER_STRICTNESS` - may be too strict
3. Civitai search keywords - may need adjustment
4. Review rejected images:
   ```sql
   SELECT "rejectionReason", COUNT(*) FROM "CuratedImage" WHERE status = 'REJECTED' GROUP BY "rejectionReason";
   ```

### Character quality issues

Adjust:
1. Increase `AUTO_APPROVAL_THRESHOLD` for higher quality
2. Set `REQUIRE_MANUAL_REVIEW=true` for manual approval
3. Adjust `CIVITAI_SEARCH_KEYWORDS` for better results
4. Use `CIVITAI_ANIME_MODEL_IDS` for specific art styles

---

## Security Considerations

### API Keys

- Store `CIVITAI_API_KEY` securely in environment variables
- Never commit API keys to version control
- Rotate API keys regularly

### Bot User

- The bot user should have `BOT` role, not `ADMIN`
- Characters generated by bot are marked with bot user ID
- Bot user should not have login capabilities

### Admin Access

- Population endpoints require `ADMIN` role
- Implement IP whitelisting for admin endpoints in production
- Monitor admin API usage

---

## Cost Estimation

### Civitai API

- Free tier: 100 requests/day
- With default settings (48 images/day): requires paid tier or API key

### AI Analysis

Per image analyzed:
- Image classification: ~1,000 tokens
- Character analysis: ~2,000 tokens
- LLM compilation: ~3,000 tokens
- **Total:** ~6,000 tokens per character

With default settings (24 characters/day):
- ~144,000 tokens/day
- ~4.3M tokens/month
- **Estimated cost:** $5-10/month (depending on LLM provider)

### Storage

Per character:
- Reference image: ~500 KB
- Generated avatar: ~200 KB
- **Total:** ~700 KB per character

With default settings (24 characters/day):
- ~16 MB/day
- ~480 MB/month

---

## Best Practices

1. **Start Small:** Begin with `BATCH_SIZE_PER_RUN=5` to test
2. **Monitor Costs:** Track AI and storage usage
3. **Review Quality:** Check generated characters regularly
4. **Adjust Thresholds:** Fine-tune based on results
5. **Use Keywords:** Customize `CIVITAI_SEARCH_KEYWORDS` for your content
6. **Enable Logging:** Keep logs for debugging
7. **Backup Data:** Regularly backup `CuratedImage` and `BatchGenerationLog` tables

---

## Support

For issues or questions:
- Check application logs
- Review [API Documentation](../api/character-population.md)
- Open GitHub issue with logs and configuration
