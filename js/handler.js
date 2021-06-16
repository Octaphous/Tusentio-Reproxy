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
                        sendErrorPage(res, "ProxyUnavailable");
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
        let exp404MSG = /<pre>Cannot ([^\s]+) \/([^\s]+)?<\/pre>/;

        // If response contains "Cannot Get/Post/Put", respond with 404 Not Found
        if (exp404MSG.test(body.toString()) && proxyRes.statusCode === 404)
            return sendErrorPage(res, "NotFound");

        // Send response
        res.end(Buffer.concat(body));
    });
});

function sendErrorPage(res, pageName) {
    const statusPage = path.join(__dirname, `../errors/${pageName}.html`);
    if (fs.existsSync(statusPage)) res.sendFile(statusPage);
}
