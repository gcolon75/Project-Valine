import {defineType} from 'sanity'

export default defineType({
  name: 'audition',
  title: 'Audition',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'script', title: 'Script', type: 'reference', to: [{ type: 'script' }] },
    { name: 'date', title: 'Date', type: 'datetime' }
  ]
})