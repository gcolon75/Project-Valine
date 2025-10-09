import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Project Valine CMS',
  projectId: 'YOUR_PROJECT_ID', // replace with the actual ID from sanity.cli.ts or the Sanity dashboard
  dataset: 'production',
  plugins: [deskTool()],
  schema: {
    types: schemaTypes
  }
})