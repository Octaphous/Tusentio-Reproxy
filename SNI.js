const tls = require("tls");
const fs = require("fs");
const path = require("path");
const matcher = require("matcher");
const proxies = require("./proxy");
const config = require("./config");

const sslDir = path.resolve(config.ssl.dir);

const defPubKey = `${sslDir}/${config.ssl.pubKeyName}`;
const defPrivKey = `${sslDir}/${config.ssl.privKeyName}`;
const defCaBundle = `${sslDir}/${config.ssl.caBundleName}`;

let httpsOptions = {
    SNICallback: function (domain, cb) {
        return cb(null, findSSLID(domain));
    },
    cert: fs.existsSync(defPubKey) ? fs.readFileSync(defPubKey) : undefined,
    key: fs.existsSync(defPrivKey) ? fs.readFileSync(defPrivKey) : undefined,
    ca: fs.existsSync(defCaBundle) ? fs.readFileSync(defCaBundle) : undefined,
};

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

module.exports = httpsOptions;
