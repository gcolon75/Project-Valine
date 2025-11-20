# Run this in your repo root using PowerShell

# Create directories
New-Item -ItemType Directory -Force -Path "sanity\schemas"
New-Item -ItemType Directory -Force -Path "client\src\lib"

# Write user schema
@"
export default {
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'role', title: 'Role', type: 'string' },
    { name: 'bio', title: 'Bio', type: 'text' },
    { name: 'avatar', title: 'Avatar', type: 'image' }
  ]
};
"@ | Set-Content -Encoding UTF8 sanity\schemas\user.js

# Write script schema
@"
export default {
  name: 'script',
  title: 'Script',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'user' }] },
    { name: 'body', title: 'Body', type: 'text' },
    { name: 'publishedAt', title: 'Published At', type: 'datetime' }
  ]
};
"@ | Set-Content -Encoding UTF8 sanity\schemas\script.js

# Write audition schema
@"
export default {
  name: 'audition',
  title: 'Audition',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'script', title: 'Script', type: 'reference', to: [{ type: 'script' }] },
    { name: 'date', title: 'Date', type: 'datetime' }
  ]
};
"@ | Set-Content -Encoding UTF8 sanity\schemas\audition.js

# Write schema index
@"
import createSchema from 'part:@sanity/base/schema-creator';
import schemaTypes from 'all:part:@sanity/base/schema-type';
import user from './user';
import script from './script';
import audition from './audition';

export default createSchema({
  name: 'default',
  types: schemaTypes.concat([user, script, audition])
});
"@ | Set-Content -Encoding UTF8 sanity\schemas\schema.js

# Write sanity.config.js
@"
import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import schema from './schemas/schema';

export default defineConfig({
  name: 'default',
  title: 'Project Valine CMS',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [deskTool()],
  schema: {
    types: schema.types,
  },
});
"@ | Set-Content -Encoding UTF8 sanity\sanity.config.js

# Write frontend Sanity client
@"
import sanityClient from '@sanity/client';

export default sanityClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true
});
"@ | Set-Content -Encoding UTF8 client\src\lib\sanityClient.js

# Write .env.sanity.example
@"
VITE_SANITY_PROJECT_ID=yourProjectId
VITE_SANITY_DATASET=production
"@ | Set-Content -Encoding UTF8 client\.env.sanity.example

# Write setup documentation
@"
# Sanity Setup Guide

## 1. Install Sanity CLI

npm install -g @sanity/cli
# or
npx @sanity/cli --version

## 2. Initialize Sanity Studio

cd sanity
npx sanity init
# Choose dataset: production, starter: clean project, install frontend? No

## 3. Add Schemas and Config

Drop the files from this script into sanity/schemas/ and sanity/sanity.config.js

## 4. Run & Deploy Studio

cd sanity
npm install
npx sanity start    # for local studio (http://localhost:3333)
npx sanity deploy   # for hosted studio

## 5. Link Frontend to Sanity

cd ../client
npm install @sanity/client
cp .env.sanity.example .env
# Fill in your projectId

## 6. Fetch Data in React

Example:
import client from './lib/sanityClient';

const query = `*[_type == \"script\"]{_id, title, author-> {name}, body, publishedAt}`;
client.fetch(query).then(scripts => {
  console.log(scripts);
});

## 7. Production Deployment

Ensure your projectId and dataset are set in your CI/CD host.

## 8. Need help?

See https://www.sanity.io/docs or paste errors here for help.
"@ | Set-Content -Encoding UTF8 SANITY_SETUP.md

Write-Host "Sanity integration files have been written. See SANITY_SETUP.md for next steps."