# AWS Setup Guide for getiickets

## AWS Account Information

- **Account ID**: 394019066074
- **Region**: US East (Ohio) - `us-east-2`
- **S3 Bucket**: `getiickets-s3-michael-asere`
- **Console URL**: https://console.aws.amazon.com/

## Environment Variables

Add these to your `apps/api/.env` file:

```bash
# AWS Configuration (use your own credentials - never commit real keys)
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"
AWS_S3_BUCKET="getiickets-s3-michael-asere"
AWS_CLOUDFRONT_URL=""  # Optional: Add if you set up CloudFront
```

## Security Best Practices

⚠️ **IMPORTANT**: 
- **NEVER commit** `.env` files to git (already in `.gitignore`)
- **NEVER share** AWS credentials publicly
- **Rotate credentials** if they're ever exposed
- Use **IAM roles** in production instead of access keys when possible

## S3 Bucket Configuration

### Verify Bucket Access

1. **Check bucket exists:**
   ```bash
   aws s3 ls s3://getiickets-s3-michael-asere --region us-east-2
   ```

2. **Test upload:**
   ```bash
   echo "test" > test.txt
   aws s3 cp test.txt s3://getiickets-s3-michael-asere/test.txt --region us-east-2
   ```

### Recommended Bucket Policies

For production, configure bucket policies for secure access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::getiickets-s3-michael-asere/*",
      "Condition": {
        "StringEquals": {
          "aws:Referer": [
            "https://yourdomain.netlify.app",
            "https://*.getiickets.com"
          ]
        }
      }
    }
  ]
}
```

### CORS Configuration

Add CORS configuration to allow frontend access:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://yourdomain.netlify.app",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Setting Up CloudFront (Optional)

For better performance and security:

1. **Create CloudFront Distribution:**
   - Origin: `getiickets-s3-michael-asere.s3.us-east-2.amazonaws.com`
   - Origin Access Control: Enable
   - Default root object: (leave empty)
   - Viewer protocol policy: Redirect HTTP to HTTPS

2. **Update environment variable:**
   ```bash
   AWS_CLOUDFRONT_URL="https://d1234567890.cloudfront.net"
   ```

## Testing AWS Integration

### Test S3 Upload from API

```bash
# Start the API
cd apps/api && npm run dev

# The S3Service will automatically use your credentials from .env
# Test by creating a ticket - it should upload to S3
```

### Verify Files in S3

1. **Via AWS Console:**
   - Go to: https://s3.console.aws.amazon.com/s3/buckets/getiickets-s3-michael-asere
   - Navigate to `tickets/` folder

2. **Via AWS CLI:**
   ```bash
   aws s3 ls s3://getiickets-s3-michael-asere/tickets/ --recursive
   ```

## Troubleshooting

### Access Denied Errors

1. **Check IAM permissions:**
   - User needs `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
   - Attach `AmazonS3FullAccess` policy for testing (restrict in production)

2. **Verify credentials:**
   ```bash
   aws sts get-caller-identity --region us-east-2
   ```

### Bucket Not Found

1. **Verify bucket name:** `getiickets-s3-michael-asere`
2. **Check region:** `us-east-2` (US East - Ohio)
3. **Verify bucket exists in console**

### Upload Failures

1. **Check network connectivity**
2. **Verify credentials are correct**
3. **Check bucket permissions**
4. **Review API logs for detailed errors**

## Production Recommendations

1. **Use IAM Roles** instead of access keys (for ECS/EC2)
2. **Enable S3 Versioning** for ticket backups
3. **Set up Lifecycle Policies** to archive old tickets
4. **Enable S3 Encryption** (SSE-S3 or SSE-KMS)
5. **Use CloudFront** for CDN and better security
6. **Set up S3 Access Logging** for audit trails

## Cost Optimization

- **Lifecycle Policies**: Move old tickets to Glacier after 90 days
- **CloudFront**: Reduces S3 data transfer costs
- **Compression**: Compress ticket PDFs before upload
- **Cleanup**: Delete test files regularly

## Next Steps

1. ✅ Add AWS credentials to `apps/api/.env`
2. ✅ Test S3 upload functionality
3. ⬜ Set up CloudFront (optional)
4. ⬜ Configure bucket policies
5. ⬜ Set up CORS
6. ⬜ Enable versioning and lifecycle policies
