const fs = require('fs-extra')
const { removeTinaGeneratedFiles, readTextFile } = require('./utils.js')

/* eslint-disable */

const createMarkdowns = async (filePath, callback) => {
  let passTest = 0
  let dataLength = 0

  await readTextFile(filePath, async ({ data }) => {
    dataLength = data?.length

    passTest = await callback(
      passTest,
      data.map(({ headers }) => headers),
    )

    console.log(
      `Total of ${passTest} markdowns created ---`,
      `Total items ${dataLength}`,
    )
  })
}

const parserFunction = async (passTest, data) => {
  for (const item of data) {
    const { filename, markdownContent, valid } =
      await generateMarkdownContent(item)

    if (valid) {
      passTest += 1
      const path = targetDirectory + filename

      fs.writeFileSync(path, markdownContent, 'utf-8')
      console.log('Markdown file created successfully.', filename)
    }
  }

  return passTest
}

/**
 Defined by user:
  filePath: destination of data to convert into markdowns
  jsonToMarkdown: function to parse data into markdowns and fit the correct format already declared in tina settings
  generateMarkdownContent: function to generate markdown content and do validations
*/

const filePath = 'your-file-path'
const targetDirectory = 'your-target-directory'

async function jsonToMarkdown({}) {
  return `---
---
`
}

const generateMarkdownContent = async (item) => {
  // define filename
  const filename = item.post_name + '.md'

  // define markdown content
  const markdownContent = await jsonToMarkdown(item)

  return { filename, markdownContent, valid: true }
}

// Execute the script
removeTinaGeneratedFiles()
createMarkdowns(filePath, parserFunction)
