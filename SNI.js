const tls = require("tls");
const fs = require("fs");
const matcher = require('matcher');
const proxies = require("./proxy");

function getSecureContext (CRTname) {
    let keyPath = `./ssl/${CRTname}.key`, 
        crtPath = `./ssl/${CRTname}.crt`, 
        caPath = `./ssl/${CRTname}.ca`;

    return tls.createSecureContext({
        key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : undefined,
        cert: fs.existsSync(crtPath) ? fs.readFileSync(crtPath) : undefined,
        ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined
    }).context;
}

function findSSLID (domain) {
    for (let i = 0; i < proxies.length; i++) {
        for (let j = 0; j < proxies[i].from.length; j++) {
            if (matcher.isMatch(domain, proxies[i].from[j])) {
                return getSecureContext(proxies[i].ssl);
            }
        }
    }
}

let httpsOptions = {
    SNICallback: function (domain, cb) {
        return cb(null, findSSLID(domain));
    },
    key: fs.existsSync(`./ssl/default.key`) ? fs.readFileSync(`./ssl/default.key`) : undefined,
    cert: fs.existsSync(`./ssl/default.crt`) ? fs.readFileSync(`./ssl/default.crt`) : undefined,
    ca: fs.existsSync(`./ssl/default.ca`) ? fs.readFileSync(`./ssl/default.ca`) : undefined
}

module.exports = httpsOptions;