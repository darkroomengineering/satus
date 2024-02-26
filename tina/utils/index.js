import { sectionId } from '../content/custom-components/section-id'

export const minMaxLength = ({ min = 0, max, isString = false }) => {
  return {
    validate: (value) => {
      // Value not exact
      if (min === max && value?.length !== min) {
        return `Must be exactly ${min} ${isString ? 'characters' : 'items'}`
      }
      // Value too small
      if (value && value.length < min) {
        return `Must be ${max ? 'between' : 'more than'} ${min} ${
          max ? `and ${max}` : ''
        } ${isString ? 'characters' : 'items'}`
      }
      // Value too long
      if (max && value && value.length > max) {
        return `Must be between ${min} and ${max} ${
          isString ? 'characters' : 'items'
        }`
      }
    },
  }
}

export const nameItem = (keyword) => ({
  itemProps: (item) => {
    if (!item) return
    return {
      label: `${item[keyword]}`,
    }
  },
})

// Converts string to start case
export const startCase = (str) => {
  // Add a space before each uppercase letter that is not at the beginning of the string
  return (
    str
      .replace(/([a-z])([A-Z])|([A-Z])([A-Z][a-z])/g, '$1$3 $2$4')
      // Capitalize the first letter of each word and convert the rest to lowercase
      .replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      })
  )
}

// Generates labels for all items by start casing names
export const createLabels = (template) => {
  const iterate = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (key === 'name' && !obj['label']) {
        obj['label'] = startCase(obj[key])
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        createLabels(obj[key])
      }
    })
  }
  iterate(template)
}

export const slugify = (str) => {
  return str
    ? str
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
    : null
}

export const templatesMaxItems = (sections, input) => {
  if (sections?.length === 0) return

  const fields = sections.map(({ name, label, max }) => ({
    name,
    label,
    max,
  }))

  const howMany = []
  fields.forEach(({ name, label, max }) => {
    howMany.push({
      name,
      label,
      max,
      quantity: input?.filter(({ _template }) => name === _template).length,
    })
  })
  const hasMoreThanMax = howMany.find(({ quantity, max }) => quantity > max)

  return hasMoreThanMax
    ? `Cannot be more than ${hasMoreThanMax.max} ${hasMoreThanMax.label}`
    : null
}

function extractPath(str) {
  var parts = str.split('/pages/')

  if (parts.length < 2) return ''
  var nextSegment = parts[1].split('/')[0]

  return nextSegment
}

export const addSectionIdLink = (sections, path) => {
  const clonedSections = Array.from(sections)

  clonedSections.map((section) => {
    if (section?.removeSectionId) return section

    if (section.fields.some(({ name }) => name === 'sectionId')) return section

    const fetchPath = extractPath(path)

    const cloneSection = [
      ...section.fields,
      sectionId({
        path: fetchPath,
        componentName: section.name,
      }),
    ]
    section.fields = cloneSection

    return section
  })

  return clonedSections
}
