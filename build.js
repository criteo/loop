'use strict'

const marked = require('marked')
const fs = require('fs')

fs.writeFileSync('index.html',
  `
  <html>
    <head>
      <meta charset="utf-8">
      <link rel="stylesheet" media="screen" href="style.css" />
    </head>
    <body>
      ${marked(fs.readFileSync('README.md', 'utf8'))}
    </body>
  </html>
  `,
  'utf8'
)
