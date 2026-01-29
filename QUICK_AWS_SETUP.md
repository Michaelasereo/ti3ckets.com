# Quick AWS Setup

## Your AWS Configuration

- **Account ID**: 394019066074
- **Region**: US East (Ohio) - `us-east-2`
- **S3 Bucket**: `getiickets-s3-michael-asere`
- **Access Key**: `YOUR_AWS_ACCESS_KEY_ID`
- **Secret Key**: `YOUR_AWS_SECRET_ACCESS_KEY`

## Quick Setup Steps

### 1. Create Backend .env File

```bash
cd apps/api
cp .env.example .env
```

### 2. Add AWS Credentials to .env

Edit `apps/api/.env` and add:

```bash
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"
AWS_S3_BUCKET="getiickets-s3-michael-asere"
```

### 3. Test S3 Connection

```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure AWS CLI
aws configure
# Enter your access key and secret key when prompted
# Default region: us-east-2
# Default output: json

# Test bucket access
aws s3 ls s3://getiickets-s3-michael-asere --region us-east-2
```

### 4. Verify in Code

The S3Service is already configured to use:
- Default bucket: `getiickets-s3-michael-asere`
- Default region: `us-east-2`

Just make sure your `.env` file has the credentials!

## Security Reminders

⚠️ **CRITICAL**:
- ✅ `.env` files are in `.gitignore` (won't be committed)
- ❌ **NEVER** commit credentials to git
- ❌ **NEVER** share credentials publicly
- ✅ Rotate keys if exposed
- ✅ Use IAM roles in production (not access keys)

## Next Steps

1. ✅ Add credentials to `apps/api/.env`
2. ✅ Test S3 upload (create a ticket)
3. ⬜ Set up CloudFront (optional, for better performance)
4. ⬜ Configure bucket CORS (for frontend access)
5. ⬜ Set up bucket policies (for security)

See `AWS_SETUP.md` for detailed configuration.
