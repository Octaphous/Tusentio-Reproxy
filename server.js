const express = require("express");
const https = require("https");
const http = require("http");
const matcher = require('matcher');

const config = require("./config.json");
const proxy = require("./proxy.json");

const expressServer = express();

const logger = require("./logger");
expressServer.use(logger);

const handler = require("./handler");
expressServer.use(handler);

const httpsOptions = require("./SNI");

let server;
if (config.enable_https) {
    server = https.createServer(httpsOptions, expressServer);
    const redirectServer = express();
    redirectServer.use((req, res, next) => {
        res.redirect("https://" + req.headers.host + req.url);
        next();
    });
    redirectServer.listen(config.http_port, () => {
        console.log("Redirecting all HTTP requests to HTTPS");
    })
} else {
    server = http.createServer(expressServer);
}

server.listen(config.enable_https ? config.https_port : config.http_port, () => {
    console.log("Main server is running. HTTPS: " + config.enable_https);
})