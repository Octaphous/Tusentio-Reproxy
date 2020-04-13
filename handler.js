const httpProxy = require("http-proxy");
const matcher = require("matcher");

const proxies = require("./proxy.json");

// Create proxy server
const proxyServer = httpProxy.createProxyServer();

module.exports = function(req, res) {

    // Loop through is element in proxies-array
    proxies.forEach(proxy => {

        // Loop through each "from" property in the current element
        proxy.from.forEach(url => {

            // Proxy the request if the request hostname matches any of the values in "from"
            if (matcher.isMatch(req.hostname, url)) {
                proxyServer.web(req, res, {target: proxy.to[Math.floor(Math.random() * proxy.to.length)]}, e => {
                    console.log("Could not proxy: " + e.code);
                });
            }
        })
    });
}