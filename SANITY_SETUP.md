# Sanity Setup Guide

## 1. Install Sanity CLI

```bash
npm install -g @sanity/cli
# or
npx @sanity/cli --version
```

## 2. Initialize Sanity Studio

```bash
cd sanity
npx sanity init
# Choose dataset: production, starter: clean project, install frontend? No
```

## 3. Add Schemas and Config

Drop the files from this script into `sanity/schemas/` and `sanity/sanity.config.js`.

## 4. Run & Deploy Studio

```bash
cd sanity
npm install
npx sanity start    # for local studio (http://localhost:3333)
npx sanity deploy   # for hosted studio
```

## 5. Link Frontend to Sanity

```bash
cd ../client
npm install @sanity/client
cp .env.sanity.example .env
# Fill in your projectId
```

## 6. Fetch Data in React

Example:
```js
import client from './lib/sanityClient';

const query = `*[_type == "script"]{_id, title, author-> {name}, body, publishedAt}`;
client.fetch(query).then(scripts => {
  console.log(scripts);
});
```

## 7. Production Deployment

Ensure your projectId and dataset are set in your CI/CD host.

## 8. Need help?

See [Sanity Docs](https://www.sanity.io/docs) or paste errors here for help.