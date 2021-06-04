const tls = require("tls");
const fs = require("fs");
const path = require("path");
const matcher = require("matcher");
const proxies = require("./proxy");
const config = require("./config");

const sslDir = path.resolve(config.ssl.dir);

function getSecureContext(domain) {
    let crtPath = `${sslDir}/${domain}/${config.ssl.pubKeyName}`,
        keyPath = `${sslDir}/${domain}/${config.ssl.privKeyName}`,
        caPath = `${sslDir}/${domain}/${config.ssl.caBundleName}`;

    return tls.createSecureContext({
        cert: fs.existsSync(crtPath) ? fs.readFileSync(crtPath) : undefined,
        key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : undefined,
        ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined,
    }).context;
}

function findSSLID(domain) {
    for (let i = 0; i < proxies.length; i++) {
        for (let j = 0; j < proxies[i].from.length; j++) {
            if (matcher.isMatch(domain, proxies[i].from[j])) {
                return getSecureContext(proxies[i].sslDomain);
            }
        }
    }
}

let httpsOptions = {
    SNICallback: function (domain, cb) {
        return cb(null, findSSLID(domain));
    },
    cert: fs.existsSync(`${sslDir}/${config.ssl.pubKeyName}`)
        ? fs.readFileSync(`${sslDir}/${config.ssl.pubKeyName}`)
        : undefined,
    key: fs.existsSync(`${sslDir}/${config.ssl.privKeyName}`)
        ? fs.readFileSync(`${sslDir}/${config.ssl.privKeyName}`)
        : undefined,
    ca: fs.existsSync(`${sslDir}/${config.ssl.caBundleName}`)
        ? fs.readFileSync(`${sslDir}/${config.ssl.caBundleName}`)
        : undefined,
};

module.exports = httpsOptions;
