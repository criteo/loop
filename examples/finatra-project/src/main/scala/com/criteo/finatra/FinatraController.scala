package com.criteo.finatra

import com.twitter.finagle.http.Request
import com.twitter.finatra.http.Controller

class FinatraController extends Controller {

  get("/hello") { request: Request =>
    info("hello")
    response.ok(
      s"""
      |<html>
      |  <head>
      |    <link rel="stylesheet" href="/index.css">
      |  </head>
      |  <body>
      |    <h1>Hello, <span>.....</span></h1>
      |    <script src="/index.js"></script>
      |  </body>
      |</html>
      """.stripMargin
    ).contentType("text/html")
  }

  get("/:*") { request: Request =>
    response.ok.fileOrIndex(
      request.params("*"),
      "404.html"
    )
  }
}
