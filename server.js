require("dotenv").config();
const express = require("express");
const https = require("https");
const http = require("http");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const expressServer = express();

// Log all errors
expressServer.use(
    morgan("dev", {
        skip: function (req, res) {
            return res.statusCode < 400;
        },
    })
);

// Store ALL logs
expressServer.use(
    morgan("common", {
        stream: fs.createWriteStream(path.join(__dirname, "access.log"), {
            flags: "a",
        }),
    })
);

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

const port = config.https.enabled ? process.env.HTTPS_PORT : process.env.PORT;

server.listen(port, () => {
    console.log(
        `Reproxy is running.\nHTTP: ${process.env.PORT}\nHTTPS: ${
            config.https.enabled ? process.env.HTTPS_PORT : "disabled"
        }`
    );
});
