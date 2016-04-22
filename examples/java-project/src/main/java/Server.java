package loop.examples;

import java.io.IOException;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class Server {

  public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(args[0]);
    HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
    server.createContext("/", new RootHandler());
    server.setExecutor(null);
    server.start();
    System.out.println("Example app listening on port " + port);
  }

  static class RootHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange t) throws IOException {
      String path = t.getRequestURI().getPath().trim();
      if(path.equals("/")) {
        path = "/index.html";
      }
      System.out.println("[access] " + path);
      String response = Server.readContent("/public" + path);
      t.sendResponseHeaders(200, response.length());
      OutputStream os = t.getResponseBody();
      os.write(response.getBytes());
      os.close();
    }
  }

  static String readContent(String path) throws IOException {
    final char[] buffer = new char[1024 * 8];
    final StringBuilder content = new StringBuilder();
    int read;
    try(InputStreamReader in = new InputStreamReader(Server.class.getResourceAsStream(path), "utf-8")) {
      while((read = in.read(buffer)) >= 0) {
        content.append(buffer, 0, read);
      }
    } catch(IOException e) {
      throw e;
    }
    return content.toString();
  }

}
