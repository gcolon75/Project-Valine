# Prisma Lambda Layer

This directory contains the Prisma Lambda layer for AWS Lambda deployment.

## Building the Layer

The `prisma-layer.zip` file is **not** committed to git (it's ~93MB) and must be built before deployment.

### Build Command

**Windows (PowerShell) – Recommended:**

```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

**Linux/macOS (Bash):**

```bash
cd serverless
./scripts/build-prisma-layer.sh
```

These scripts:
1. Generates the Prisma client in `serverless/node_modules` with Lambda binaries
2. Copies the necessary files to a temporary build directory
3. Excludes unnecessary WASM and edge deployment files
4. Creates `prisma-layer.zip` with only the Lambda runtime binary

### What's Included

The layer contains:
- `@prisma/client` - Prisma client library (JavaScript)
- `.prisma/client` - Generated Prisma client
- `libquery_engine-rhel-openssl-3.0.x.so.node` - Lambda-compatible binary (~17MB)

### Layer Size

- Compressed (zip): ~93MB
- Uncompressed: ~255MB
- Lambda limit: 250MB (uncompressed), 50MB (compressed upload)

**Note:** The layer is deployed as a Lambda Layer, so it doesn't count toward the function package size limit.

### When to Rebuild

Rebuild the layer when:
- First time setup
- Prisma schema changes (new models, fields)
- Upgrading Prisma version
- After `npm ci` or dependency updates

### Deployment

The layer is automatically included in all Lambda functions via `serverless.yml`:

```yaml
provider:
  layers:
    - { Ref: PrismaLambdaLayer }

layers:
  prisma:
    package:
      artifact: layers/prisma-layer.zip
```

**Important:** Do NOT use `aws lambda publish-layer-version` manually. The Serverless Framework handles layer deployment automatically.

Deploy using:
```powershell
npx serverless deploy --stage prod --region us-west-2
```

### Verification

After deployment, verify the correct layer version is attached to Lambda functions:

```powershell
aws lambda get-function-configuration `
    --function-name pv-api-prod-updateMyProfile `
    --region us-west-2 `
    --query "Layers[].Arn"
```

Expected output (version may vary):
```json
["arn:aws:lambda:us-west-2:579939802800:layer:prisma:12"]
```

### Troubleshooting

**Error: "Layer artifact not found"**
- Run the build script:
  - Windows: `.\scripts\build-prisma-layer.ps1`
  - Linux/macOS: `./scripts/build-prisma-layer.sh`

**Error: "PrismaClientInitializationError: Query engine library not found"**
- Verify the layer was deployed
- Check the layer contains `libquery_engine-rhel-openssl-3.0.x.so.node`
- Rebuild the layer using the appropriate script above

**Error: "PrismaClientValidationError: Unknown arg"**
- Schema was changed but layer was not rebuilt
- Rebuild and redeploy:
  ```powershell
  .\scripts\build-prisma-layer.ps1
  npx serverless deploy --stage prod --region us-west-2
  ```

**Error: "Package too large"**
- This is normal - the layer is ~93MB
- Lambda supports up to 250MB uncompressed
- The layer is deployed separately, not in the function package
