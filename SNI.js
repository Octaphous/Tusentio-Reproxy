const tls = require("tls");
const fs = require("fs");
const path = require("path");
const matcher = require("matcher");
const proxies = require("./proxy");
const config = require("./config");

const sslDir = path.resolve(config.sslCerts);

function getSecureContext(CRTname) {
    let keyPath = `${sslDir}/${CRTname}.key`,
        crtPath = `${sslDir}/${CRTname}.crt`,
        caPath = `${sslDir}/${CRTname}.ca`;

    return tls.createSecureContext({
        key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : undefined,
        cert: fs.existsSync(crtPath) ? fs.readFileSync(crtPath) : undefined,
        ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined,
    }).context;
}

function findSSLID(domain) {
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
    key: fs.existsSync(`${sslDir}/default.key`)
        ? fs.readFileSync(`${sslDir}/default.key`)
        : undefined,
    cert: fs.existsSync(`${sslDir}/default.crt`)
        ? fs.readFileSync(`${sslDir}/default.crt`)
        : undefined,
    ca: fs.existsSync(`${sslDir}/default.ca`)
        ? fs.readFileSync(`${sslDir}/default.ca`)
        : undefined,
};

module.exports = httpsOptions;
