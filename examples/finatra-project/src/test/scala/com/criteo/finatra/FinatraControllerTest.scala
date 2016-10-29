package com.criteo.finatra

import com.twitter.finagle.http.Status._
import com.twitter.finatra.http.EmbeddedHttpServer
import com.twitter.inject.server.FeatureTest

class FinatraControllerTest extends FeatureTest {

  override val server = new EmbeddedHttpServer(new FinatraServer)

  "Server" should {
    "Say hello" in {
      val response = server.httpGet(
        path = "/hello",
        andExpect = Ok
      ).contentString
      response should include("""<link rel="stylesheet" href="/index.css">""")
      response should include("<h1>Hello, <span>.....</span></h1>")
      response should include("""<script src="/index.js"></script>""")
    }
  }

}
