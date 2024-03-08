const fs = require('fs-extra')
// const request = require('request')

function slugify(text) {
  return text
    .toString() // Cast to string (optional)
    .normalize('NFKD') // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
    .toLowerCase() // Convert the string to lowercase letters
    .trim() // Remove whitespace from both sides of a string (optional)
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

const fetchJson = async (url) => {
  const response = await fetch(url)
  const json = await response.json()
  return json
}

// const downloadImage = async (url, path) => {
//   request.head(url, () => {
//     request(url)
//       .pipe(fs.createWriteStream(path))
//       .on('close', () => {
//         console.log('Image downloaded ✅')
//       })
//   })
// }

function cropString(string = '', limit = 0) {
  return string.substring(0, limit)
}

const readJsonFile = async (path, callback) => {
  fs.readFile(path, 'utf-8', async (error, data) => {
    if (error) {
      console.error(`Error reading JSON file: ${error.message}`)
      return
    }

    try {
      const parsedData = JSON.parse(data)
      await callback(parsedData)
    } catch (parseError) {
      console.error(`Error parsing JSON data: ${parseError.message}`)
    }
  })
}

const readTextFile = async (path, callback) => {
  fs.readFile(path, 'utf-8', async (error, data) => {
    if (error) {
      console.error(`Error reading file: ${error.message}`)
      return
    }

    try {
      const rows = data.split('\n')
      const headers = rows[0].split('\t')
      const rowDataArray = []

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split('\t')
        const rowData = {}

        // Create an object with column headers as keys and row data as values
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j].toLowerCase().replace(/\s/g, '')
          rowData[header] = columns[j]
        }

        // Include the headers as an object in each row
        rowDataArray.push({
          headers: Object.assign(
            {},
            ...headers.map((header, index) => ({ [header]: columns[index] })),
          ),
          ...rowData,
        })
      }

      await callback({ data: rowDataArray })
    } catch (parseError) {
      console.error(`Error parsing TSV data: ${parseError.message}`)
    }
  })
}

const removeTinaGeneratedFiles = () => {
  const paths = ['../tina/tina-lock.json', '../tina/__generated__']

  for (const path of paths) {
    fs.remove(path, (err) => {
      if (err) {
        console.error(`Error removing the file: ${err}`)
        return
      }
      console.log('File removed successfully.')
    })
  }
}

const readDirectoryFiles = async (directoryPath) => {
  try {
    const files = await fs.readdir(directoryPath)
    return files
  } catch (error) {
    console.error('Error reading the directory:', error)
    throw error
  }
}

module.exports = {
  slugify,
  fetchJson,
  // downloadImage,
  readDirectoryFiles,
  cropString,
  removeTinaGeneratedFiles,
  readJsonFile,
  readTextFile,
}
