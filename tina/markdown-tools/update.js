const fs = require('fs-extra')
const path = require('path')
const grayMatter = require('gray-matter')
const { removeTinaGeneratedFiles, readFile } = require('./utils.js')

const searchMarkdownFile = (
  targetFilePath,
  targetFileName,
  dataItem,
  updateData,
) => {
  const filePath = path.join(targetFilePath, targetFileName)
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err)
        return
      }

      let parsedData = grayMatter(data)
      parsedData = updateData(dataItem, parsedData)
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

const updateMarkdowns = async (filePath, callback) => {
  await readFile(filePath, async ({ data }) => {
    await callback(data)
  })
}

const useData = (data) => {
  data.forEach((dataItem) => {
    searchMarkdownFile(targetFilePath, targetFileName, dataItem, updateData)
  })
}

/**
 Defined by user:
  sourceFilePath: destination of current data to update
  targetFilePath: destination of markdown to update
  targetFileName: name of markdown to update
  updateData: function to update markdowns
 */

const sourceFilePath = 'sourcePath'
const targetFilePath = 'targetPath'
const targetFileName = 'targetFileName'

const updateData = (dataItem, dataMarkdown) => {
  console.log(dataItem, dataMarkdown)
  // Do your needs in here and return data with same structure
  // dataItem is the currenty item of data with new values to update
  // dataMarkdown is the currenty markdown with old values to update
  //i.e.: dataMarkdown.data.title = dataItem.title

  return dataMarkdown
}

// Execute the script
removeTinaGeneratedFiles()
updateMarkdowns(sourceFilePath, useData)
