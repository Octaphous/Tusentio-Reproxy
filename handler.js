const httpProxy = require("http-proxy");
const matcher = require("matcher");

const proxies = require("./proxy.json");

const proxyServer = httpProxy.createProxyServer();
module.exports = function(req, res) {
    proxies.forEach(proxy => {
        proxy.from.forEach(url => {
            if (matcher.isMatch(req.hostname, url)) {
                proxyServer.web(req, res, {target: proxy.to[Math.floor(Math.random() * proxy.to.length)]}, e => {
                    console.log("Could not proxy: " + e.code);
                });
            }
        })
    });
}