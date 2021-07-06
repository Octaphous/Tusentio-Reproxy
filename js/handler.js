const httpProxy = require("http-proxy");
const matcher = require("./matcher");

const proxies = require("../config.json").proxies;

for (proxy of proxies) {
    if (!Array.isArray(proxy.from)) {
        proxy.from = [proxy.from];
    }

    if (!Array.isArray(proxy.to)) {
        proxy.to = [proxy.to];
    }
}

// Create proxy server
const proxyServer = httpProxy.createProxyServer();

module.exports = function (req, res, next) {
    // Loop through each element in proxies-array
    for (const proxy of proxies) {
        const matchedRoute = matchOneRoute(req, proxy.from);

        // Proxy the request if the request URL matches with any of the values in "from"
        if (matchedRoute) {
            // Amputate the matched path from the request
            req.path = req.path.replace(matchedRoute.path, "");

            if (!req.path.startsWith("/")) {
                req.path = "/" + req.path;
            }

            return proxyServer.web(
                req,
                res,
                {
                    target: proxy.to[Math.floor(Math.random() * proxy.to.length)],
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

function matchOneRoute(req, routes) {
    for (let route of routes) {
        if (typeof route === "string") {
            route = {
                hostname: route,
            };
        }

        const { hostname: hostnamePattern = "*", path: pathPattern = "/" } = route;

        const matchedHostname = matcher.matchHostname(req.hostname, hostnamePattern, true);
        if (matchedHostname == null) return undefined;

        const matchedPath = matcher.matchPath(req.path, pathPattern);
        if (matchedPath == null) return undefined;

        return {
            hostname: matchedHostname,
            path: matchedPath,
        };
    }
}
