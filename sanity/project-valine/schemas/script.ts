import {defineType} from 'sanity'

export default defineType({
  name: 'script',
  title: 'Script',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'user' }] },
    { name: 'body', title: 'Body', type: 'text' },
    { name: 'publishedAt', title: 'Published At', type: 'datetime' }
  ]
})