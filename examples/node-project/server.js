const express = require('express');

const app = express();
const port = process.argv[2];

app.use(express.static('dist'));

app.get('/', (req, res) => {
  res.send(
    `
      <html>
        <head>
          <link rel="stylesheet" href="index.css">
        </head>
        <body>
          <h1>Hello, <span>.....</span></h1>
          <script src="index.js"></script>
        </body>
      </html>
    `
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
