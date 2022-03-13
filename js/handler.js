const httpProxy = require("http-proxy");
const utils = require("./utils");
const proxies = require("../config.json").proxies;

const proxyMatchers = proxies
    .map((proxy) => {
        const hostnames = utils.ensureStrings(proxy.from);
        const hostnameRegex = new RegExp(`(?<=\\.|^)(${hostnames.map(utils.escapeRegex).join("|")})$`, "iu");

        const routes = [];
        if (typeof proxy.to === "object") {
            if (Array.isArray(proxy.to)) {
                routes.push(["", utils.ensureStrings(proxy.to)]);
            } else {
                for (const path in proxy.to) {
                    routes.push([path, utils.ensureStrings(proxy.to[path])]);
                }
            }
        } else {
            routes.push(["", utils.ensureStrings(proxy.to)]);
        }

        const matchers = routes.map(([path, targets]) => {
            const [discard, keep = ""] = path.split(/<\||\|>|<\|>/g, 2);
            const pathRegex = new RegExp(`^${utils.escapeRegex(discard)}(?=${utils.escapeRegex(keep)}(\\/|$))`, "iu");

            // Return matcher function
            return (hostname, path) => {
                if (!hostnameRegex.test(hostname)) return null;

                const pathMatch = pathRegex.exec(path);
                if (!pathMatch) return null;

                return {
                    path: pathMatch[0],
                    targets: targets,
                };
            };
        });

        return matchers;
    })
    .flat();

// Create proxy server
const proxyServer = httpProxy.createProxyServer();

module.exports = function (req, res, next) {
    let match; // Find a matching proxy
    for (const matcher of proxyMatchers) {
        match = matcher(req.hostname, req.path);
        if (match) break;
    }

    if (!match) {
        return next();
    }

    const { path, targets } = match;
    const target = targets[Math.floor(Math.random() * targets.length)];

    req.url = req.url.substring(path.length);

    return proxyServer.web(
        req,
        res,
        {
            target: target,
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
                message: "The page you were looking for could not be found. It might have been removed.",
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
