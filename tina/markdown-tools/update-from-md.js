const fs = require('fs-extra')
const path = require('path')
const grayMatter = require('gray-matter')
const { removeTinaGeneratedFiles, readDirectoryFiles } = require('./utils.js')

const searchMarkdownFile = (targetFilePath, targetFileName, updateData) => {
  const filePath = path.join(targetFilePath, targetFileName)
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err)
        return
      }

      let parsedData = grayMatter(data)
      parsedData = updateData(parsedData, targetFileName)

      const updatedMarkdown = grayMatter.stringify(parsedData)

      fs.writeFile(filePath, updatedMarkdown, 'utf8', (err) => {
        if (err) {
          console.error(err)
          return
        }

        console.log(targetFileName, 'File has been updated and saved.')
      })
    })
  } else {
    console.log(`File not found: ${targetFileName}`)
  }
}

/**
 Defined by user:
  sourceFilePath: destination of current data to update
  targetFilePath: destination of markdown to update
  targetFileName: name of markdown to update
  updateData: function to update markdowns
 */

const updateData = (dataMarkdown, targetFileName) => {
  // Do your needs in here and return data with same structure
  // dataItem is the currenty item of data with new values to update
  // dataMarkdown is the currenty markdown with old values to update
  //i.e.: dataMarkdown.data.title = dataItem.title
  dataMarkdown.data.title = targetFileName.replace('.md', '')

  return dataMarkdown
}

const sourceFilePath = '../../tina/content/pages/blog/article/slugs/'
const targetFilePath = '../../tina/content/pages/blog/article/slugs/'

const readAndUpdate = async () => {
  const pathSources = await readDirectoryFiles(sourceFilePath)

  for (const source of pathSources) {
    const targetFileName = source

    searchMarkdownFile(targetFilePath, targetFileName, updateData)
  }
}

// Execute the script
removeTinaGeneratedFiles()
readAndUpdate()
