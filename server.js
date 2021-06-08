const express = require("express");
const https = require("https");
const http = require("http");

const config = require("./config.json");

const expressServer = express();

// Add request logging middleware
const logger = require("./logger");
expressServer.use(logger);

// Static dirs
config.static.forEach((dir) => {
    expressServer.use(express.static(dir));
});

// Add proxy handler
const handler = require("./handler");
expressServer.use(handler);

const httpsOptions = require("./SNI");

let server;

if (config.https.enabled) {
    // Create HTTPS server if HTTPS is enabled in config
    server = https.createServer(httpsOptions, expressServer);

    // Create redirect server for HTTP -> HTTPS
    const redirectServer = express();
    redirectServer.use((req, res, next) => {
        res.redirect("https://" + req.headers.host + req.url);
        next();
    });
    redirectServer.listen(process.env.PORT, () => {
        console.log("Redirecting all HTTP requests to HTTPS");
    });
} else {
    // Create HTTP server if HTTPS is disabled in config
    server = http.createServer(expressServer);
}

server.listen(
    config.https.enabled ? process.env.HTTPS_PORT : process.env.PORT,
    () => {
        console.log("Main server is running. HTTPS: " + config.https.enabled);
    }
);
