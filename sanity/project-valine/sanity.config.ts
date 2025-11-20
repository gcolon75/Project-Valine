import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Joint CMS',
  projectId: 'f57vovth', // synced with sanity.cli.ts
  dataset: 'production',
  plugins: [deskTool()],
  schema: {
    types: schemaTypes
  }
})