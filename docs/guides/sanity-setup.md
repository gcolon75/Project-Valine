# Sanity Setup Guide

## 1. Install Sanity CLI
```bash
npm install -g @sanity/cli
# or
npx @sanity/cli --version
```

## 2. Initialize Sanity Studio
```bash
cd sanity/project-valine
# already initialized in this repo
```

## 3. Schemas and Config
- Schemas live in `sanity/project-valine/schemas/`
- Config is `sanity/project-valine/sanity.config.ts`

## 4. Run & Deploy Studio
```bash
cd sanity/project-valine
npm install
npm run dev      # http://localhost:3333
npm run deploy   # deploy studio
```

## 5. Link Frontend to Sanity
```bash
cd ../../client
npm install @sanity/client
cp .env.sanity.example .env
# Fill in your VITE_SANITY_PROJECT_ID=f57vovth and VITE_SANITY_DATASET=production
```

## 6. Fetch Data in React
```js
import client from './lib/sanityClient';

const query = `*[_type == "script"]{_id, title, author->{name}, body, publishedAt}`;
client.fetch(query).then(scripts => {
  console.log(scripts);
});
```

## 7. Production Deployment
Ensure your env vars are set in CI/CD (VITE_SANITY_PROJECT_ID, VITE_SANITY_DATASET).

## 8. Need help?
See [Sanity Docs](https://www.sanity.io/docs) or ask here.