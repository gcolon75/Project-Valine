# Prisma Lambda Layer

This directory contains the Prisma Lambda layer for AWS Lambda deployment.

## Building the Layer

The `prisma-layer.zip` file is **not** committed to git (it's ~9-12MB compressed) and must be built before deployment.

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

- Compressed (zip): ~9-12 MB
- Uncompressed: ~30-50 MB (optimized, minimal contents)
- Lambda limit: 250MB (uncompressed), 50MB (compressed direct upload)

**Note:** The layer is deployed as a Lambda Layer, so it doesn't count toward the individual function package size limit. The minimized layer size is achieved by excluding:
- README.md, LICENSE files
- Source maps (*.map)
- Tests, docs, cache directories
- WASM files
- Non-Lambda platform binaries (only rhel-openssl-3.0.x is included)

### When to Rebuild

Rebuild the layer when:
- First time setup
- Prisma schema changes (new models, fields)
- Upgrading Prisma version
- After `npm ci` or dependency updates

### Deployment

The layer is attached to individual Lambda functions via `serverless.yml`:

```yaml
layers:
  prismaV2:
    name: ${self:service}-${self:provider.stage}-prisma-v2
    package:
      artifact: layers/prisma-layer.zip

functions:
  someFunction:
    handler: src/handlers/some.handler
    layers:
      - { Ref: PrismaV2LambdaLayer }
```

**Important:** 
- Layers are attached per-function, not at the provider level
- Functions that don't use Prisma (health, meta, authDiag) should have `layers: []`
- Do NOT use `aws lambda publish-layer-version` manually. The Serverless Framework handles layer deployment automatically.

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
- This is normal - the layer is ~9-12 MB compressed
- Lambda supports up to 250MB uncompressed
- The layer is deployed separately, not in the function package
