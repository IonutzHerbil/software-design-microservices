const http = require("http");

function makeRequest() {
  return new Promise((resolve) => {
    http.get("http://localhost:3001/movies", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });
  });
}

Promise.all(Array.from({ length: 6 }, makeRequest)).then((results) => {
  results.forEach((r, i) => console.log(`Request ${i + 1}: ${r.source}`));
});
