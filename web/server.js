const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;
const SOLR_BASE = "http://localhost:8983/api/collections/research_portal";
const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
    };

    res.writeHead(200, {
      "Content-Type": typeMap[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

function solrRequest(targetUrl, callback) {
  http
    .get(targetUrl, (response) => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        try {
          callback(null, JSON.parse(raw));
        } catch (error) {
          callback(error);
        }
      });
    })
    .on("error", (error) => callback(error));
}

function buildSearchUrl(reqUrl) {
  const q = reqUrl.searchParams.get("q") || "*:*";
  const page = Math.max(parseInt(reqUrl.searchParams.get("page") || "1", 10), 1);
  const category = reqUrl.searchParams.get("category") || "";
  const accessType = reqUrl.searchParams.get("access_type") || "";
  const year = reqUrl.searchParams.get("year") || "";
  const sortOption = reqUrl.searchParams.get("sort") || "score desc";

  const solrUrl = new URL(`${SOLR_BASE}/select`);
  solrUrl.searchParams.set("defType", "edismax");
  solrUrl.searchParams.set("q", q === "*:*" ? "*:*" : q);
  solrUrl.searchParams.set("qf", "title^4 abstract^2 keywords^3 authors^2 venue");
  solrUrl.searchParams.set("rows", "6");
  solrUrl.searchParams.set("start", String((page - 1) * 6));
  solrUrl.searchParams.set("hl", "true");
  solrUrl.searchParams.set("hl.fl", "title,abstract");
  solrUrl.searchParams.set("hl.simple.pre", "<mark>");
  solrUrl.searchParams.set("hl.simple.post", "</mark>");
  solrUrl.searchParams.set(
    "fl",
    "id,title,abstract,authors,category,year,venue,document_type,citations,access_type,url,score"
  );
  solrUrl.searchParams.set(
    "json.facet",
    JSON.stringify({
      category: { type: "terms", field: "category", limit: 10 },
      access_type: { type: "terms", field: "access_type", limit: 10 },
      year: { type: "terms", field: "year", limit: 10, sort: "index desc" },
    })
  );

  const sortMap = {
    relevance: "score desc",
    year_desc: "year desc",
    citations_desc: "citations desc",
    title_asc: "title asc",
  };
  solrUrl.searchParams.set("sort", sortMap[sortOption] || "score desc");

  if (category) {
    solrUrl.searchParams.append("fq", `category:"${category}"`);
  }
  if (accessType) {
    solrUrl.searchParams.append("fq", `access_type:"${accessType}"`);
  }
  if (year) {
    solrUrl.searchParams.append("fq", `year:${year}`);
  }

  return solrUrl;
}

function buildSuggestUrl(reqUrl) {
  const term = (reqUrl.searchParams.get("term") || "").trim();
  const solrUrl = new URL(`${SOLR_BASE}/terms`);
  solrUrl.searchParams.set("terms", "true");
  solrUrl.searchParams.set("terms.fl", "title");
  solrUrl.searchParams.set("terms.prefix", term.toLowerCase());
  solrUrl.searchParams.set("terms.limit", "8");
  solrUrl.searchParams.set("wt", "json");
  return solrUrl;
}

function simplifySearchResponse(payload) {
  const highlighting = payload.highlighting || {};
  const docs = payload.response.docs.map((doc) => {
    const docHighlights = highlighting[doc.id] || {};
    return {
      ...doc,
      title_highlight: (docHighlights.title && docHighlights.title[0]) || doc.title,
      abstract_highlight:
        (docHighlights.abstract && docHighlights.abstract[0]) || doc.abstract,
    };
  });

  return {
    numFound: payload.response.numFound,
    start: payload.response.start,
    qTime: payload.responseHeader.QTime,
    docs,
    facets: payload.facets || {},
  };
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (reqUrl.pathname === "/api/search") {
    const solrUrl = buildSearchUrl(reqUrl);
    solrRequest(solrUrl, (error, payload) => {
      if (error) {
        sendJson(res, 500, { error: "Failed to fetch Solr search results." });
        return;
      }
      sendJson(res, 200, simplifySearchResponse(payload));
    });
    return;
  }

  if (reqUrl.pathname === "/api/suggest") {
    const term = (reqUrl.searchParams.get("term") || "").trim();
    if (!term) {
      sendJson(res, 200, { suggestions: [] });
      return;
    }

    const solrUrl = buildSuggestUrl(reqUrl);
    solrRequest(solrUrl, (error, payload) => {
      if (error) {
        sendJson(res, 500, { error: "Failed to fetch suggestions." });
        return;
      }

      const values = payload.terms && payload.terms.title ? payload.terms.title : [];
      const suggestions = [];
      for (let i = 0; i < values.length; i += 2) {
        suggestions.push(values[i]);
      }
      sendJson(res, 200, { suggestions });
    });
    return;
  }

  const requestedPath =
    reqUrl.pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, reqUrl.pathname);
  serveFile(res, requestedPath);
});

server.listen(PORT, () => {
  console.log(`Research portal web interface running on http://localhost:${PORT}`);
});
