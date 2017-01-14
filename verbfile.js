'use strict'

const path = require('path')
const pify = require('pify')
const cson = require('cson-parser')
const each = require('each-promise')
const fs = pify(require('fs'))

const SNIPPETS_DIR = './snippets'
const TOP_LEVEL_KEY = '.source.js, .source.jsx, .source.ts'

module.exports = function (verb) {
  verb.use(require('verb-generate-readme'))
  verb.asyncHelper('generateSnippetDocs', generateSnippetDocs)
  verb.task('default', ['readme'])
}

const generateSnippetDocs = (cb) => {
  parseFiles(SNIPPETS_DIR).then((files) => {
    let buf = `\n\n`

    files.forEach((file) => {
      const category = path.basename(file.path, path.extname(file.path))
      const ghpath = `./snippets/${path.basename(file.path)}`

      buf = `${buf}### ${category}\n`
      buf = `${buf}> All [${category}](${ghpath}) snippets\n\n`

      for (let desc in file.contents) {
        const data = file.contents[desc]
        buf = `${buf}#### \`${data.prefix}\` ${desc}`

        if (data.prefix === 'xa') {
          buf = `${buf}\n\n> See [extend-shallow][] lib`
        }
        let fence = '\n\n'
        fence += '```js\n'
        fence += data.body.trim() + '\n'
        fence += '```'
        buf = buf + fence + '\n\n'
      }
    })

    cb(null, buf)
  }, cb)
  .catch(cb)
}

const parseFiles = (dir) => {
  return readFiles(dir)
    .then((files) => files.map((file) => {
      let data = cson.parse(file.contents)[TOP_LEVEL_KEY]
      data = data || cson.parse(file.contents)['.source.json']

      return {
        path: file.path,
        contents: data
      }
    }))
}

const readFiles = (dir) => readdir(dir).then((fps) => {
  if (!fps.length) return fps

  return each.parallel(fps.map((filepath) => () => {
    return fs.readFile(filepath, 'utf8').then((contents) => ({
      path: filepath,
      contents: contents
    }))
  }))
})

const readdir = (dir) => new Promise((resolve, reject) => {
  const files = []

  fs.readdir(dir)
    .then((filepaths) => {
      return each.serial(filepaths.map((fp) => () => {
        files.push(path.resolve(dir, fp))
      }))
    })
    .then(() => resolve(files), reject)
})
