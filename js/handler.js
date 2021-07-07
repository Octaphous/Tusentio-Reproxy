const httpProxy = require("http-proxy");
const matcher = require("./matcher");

const proxies = require("../config.json").proxies;

for (proxy of proxies) {
    if (!Array.isArray(proxy.from)) {
        proxy.from = [proxy.from];
    }

    if (typeof proxy.to !== "object" || Array.isArray(proxy.to)) {
        proxy.to = {
            "/": proxy.to,
        };
    }
}

// Create proxy server
const proxyServer = httpProxy.createProxyServer();

module.exports = function (req, res, next) {
    // Loop through each element in proxies-array
    for (const proxy of proxies) {
        // Proxy the request if the request hostname matches with any of the values in "from"
        if (matcher.matchHostname(req.hostname, proxy.from, true) != null) {
            // NOTE: Do not meddle with ``req.url`` (Causes problems with some middlewares on target servers)

            const paths = Object.keys(proxy.to);
            const matchedPath = matcher.matchPath(req.path, paths);
            if (matchedPath == null) continue;

            const match = proxy.to[matchedPath];
            const targets = Array.isArray(match) ? match : [match];

            return proxyServer.web(
                req,
                res,
                {
                    target: targets[Math.floor(Math.random() * targets.length)],
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
    }

    next();
};

// Self handle proxy response to check status codes
proxyServer.on("proxyRes", function (proxyRes, req, res) {
    // Set headers
    res.set(proxyRes.headers);
    res.status(proxyRes.statusCode);
    res.removeHeader("X-Powered-By");
    res.removeHeader("content-security-policy");

    // Build response from proxy
    const body = [];
    proxyRes.on("data", (chunk) => body.push(chunk));

    // Handle response to client
    proxyRes.on("end", function () {
        // If status code is 304, the response is empty
        if (proxyRes.statusCode == 304) return res.end();

        let exp404MSG = /<pre>Cannot ([^\s]+) \/([^\s]+)?<\/pre>/;

        // If response contains "Cannot Get/Post/Put", respond with 404 Not Found
        if (exp404MSG.test(body.toString()) && proxyRes.statusCode === 404) {
            return res.render("error", {
                status: res.statusCode,
                title: "Not Found.",
                message:
                    "The page you were looking for could not be found. It might have been removed.",
            });
        }
        // If proxy response is JSON, parse and check if it contains a service error.
        else if (req.accepts(["application/json", "*/*"]) === "application/json") {
            try {
                let data = JSON.parse(body);
                if (data["service-error-title"] && data["service-error-message"]) {
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
