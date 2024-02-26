const fs = require('fs')
const path = require('path')

const rootDirectory = path.join(__dirname, '..')

const cacheFilesNames = (directoryPath, outputPath) => {
  fs.readdir(path.join(rootDirectory, directoryPath), (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err)
    }
    const fileNames = files.map((file) => ({
      fileName: directoryPath.replace('../', '') + file,
    }))

    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, '[]', 'utf-8')
    }

    fs.writeFile(
      outputPath,
      JSON.stringify(fileNames, null, 2),
      'utf-8',
      (err) => {
        if (err) throw err
        console.log('File names saved in JSON format!')
      },
    )
  })
}

const directoryPath = '../tina/content/pages/templates/slugs/'
const outputPath = path.join(
  rootDirectory,
  '../public/cache/cache-fileNames.json',
)

const dirs = [{ directoryPath, outputPath }]

for (const { directoryPath, outputPath } of dirs) {
  cacheFilesNames(directoryPath, outputPath)
}
