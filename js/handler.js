const httpProxy = require("http-proxy");
const matcher = require("matcher");
const fs = require("fs");
const path = require("path");

const proxies = require("../config.json").proxies;

// Create proxy server
const proxyServer = httpProxy.createProxyServer();

module.exports = function (req, res) {
    // Loop through each element in proxies-array
    proxies.forEach((proxy) => {
        // Loop through each "from" property in the current element
        proxy.from.forEach((url) => {
            // Proxy the request if the request hostname matches any of the values in "from"
            if (matcher.isMatch(req.hostname, url)) {
                proxyServer.web(
                    req,
                    res,
                    {
                        target: proxy.to[
                            Math.floor(Math.random() * proxy.to.length)
                        ],
                        selfHandleResponse: true,
                    },
                    (e) => {
                        console.error("Could not proxy: " + e.code);
                        res.status(503);
                        res.render("error", {
                            status: res.statusCode,
                            title: "Service Unavailable.",
                            message:
                                "The server is temporarily unable to handle your request due to maintenance. Please try again later.",
                        });
                    }
                );
            }
        });
    });
};

// Self handle proxy response to check status codes
proxyServer.on("proxyRes", function (proxyRes, req, res) {
    // Set headers
    res.set(proxyRes.headers);
    res.status(proxyRes.statusCode);
    res.removeHeader("X-Powered-By");

    // Build response from proxy
    const body = [];
    proxyRes.on("data", (chunk) => body.push(chunk));

    // Handle response to client
    proxyRes.on("end", function () {
        // If status code is 304, the response is empty
        if (proxyRes.statusCode == 304) return res.end();

        let exp404MSG = /<pre>Cannot ([^\s]+) \/([^\s]+)?<\/pre>/;

        // If response contains "Cannot Get/Post/Put", respond with 404 Not Found
        if (exp404MSG.test(body.toString()) && proxyRes.statusCode === 404)
            return res.render("error", {
                status: res.statusCode,
                title: "Not Found.",
                message:
                    "The page you were looking for could not be found. It might have been removed.",
            });
        // If proxy response is JSON, parse and check if it contains a service error.
        else if (res.get("content-type").startsWith("application/json")) {
            try {
                let data = JSON.parse(body);
                if (
                    data["service-error-title"] &&
                    data["service-error-message"]
                ) {
                    res.set("content-type", "text/html");
                    return res.render("error", {
                        status: res.statusCode,
                        title: data["service-error-title"],
                        message: data["service-error-message"],
                    });
                }
            } catch (e) {}
        }

        // Send response
        res.end(Buffer.concat(body));
    });
});
