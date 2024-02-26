import {
  addSectionIdLink,
  createLabels,
  slugify,
  templatesMaxItems,
} from '../utils'
import { metadata } from './metadata'

export class Collection {
  constructor(name, label, path, format) {
    this.name = name
    this.label = label
    this.path = path
    this.format = format
    this.showGlobals = true
    this.ui = { global: false }
    this.match = null
    this.hero = null
    this.fields = []
  }

  set setShowGlobals(show) {
    this.showGlobals = show
    createLabels(this.showGlobals)
  }

  set setHero(hero) {
    this.hero = hero
    createLabels(this.hero)
  }

  set setFields({ sections, slug = false, customFields = false }) {
    createLabels(sections)
    createLabels(customFields)

    this.fields = [
      {
        name: 'title',
        label: 'FileName',
        type: 'string',
        required: true,
        isTitle: !slug,
        ui: {
          description: 'Content will be slugified',
          parse: (val) => slugify(val),
          format: (val) => slugify(val),
        },
      },
    ]

    if (slug) {
      this.fields = [
        ...this.fields,
        {
          name: 'slug',
          label: 'Slug',
          type: 'string',
          isTitle: slug,
          required: true,
          ui: {
            description:
              'This field field will be used for setting the page route and text will be slugified',
            parse: (val) => slugify(val),
          },
        },
      ]
    }

    if (customFields) {
      this.fields = [...this.fields, ...customFields]
    }

    if (this.showGlobals) {
      this.fields = [
        ...this.fields,
        {
          name: 'global',
          label: 'Global',
          type: 'object',
          list: true,
          templates: [metadata],
          searchable: false,
          ui: {
            validate: (input) => {
              return templatesMaxItems([metadata], input)
            },
          },
        },
      ]
    }

    if (this.hero) {
      this.fields = [
        ...this.fields,
        {
          name: 'hero',
          label: 'Hero',
          type: 'object',
          list: true,
          templates: [...this.hero],
          searchable: false,
          ui: {
            validate: (input) => {
              return templatesMaxItems(this.hero, input)
            },
          },
        },
      ]
    }

    this.fields = [
      ...this.fields,
      {
        name: 'sections',
        label: 'Sections',
        type: 'object',
        list: true,
        templates: [...addSectionIdLink(sections, this.path)],
        searchable: false,
        ui: {
          validate: (input) => {
            return templatesMaxItems(sections, input)
          },
        },
      },
    ]
  }

  set setUi(route) {
    this.ui = { ...this.ui, router: route }
  }

  set setMatch(exceptions) {
    this.match = exceptions
  }
}
