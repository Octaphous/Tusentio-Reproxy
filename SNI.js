const tls = require("tls");
const fs = require("fs");
const path = require("path");
const matcher = require("matcher");
const proxies = require("./config.json").proxies;
const sslConf = require("./config.json").ssl;

// Directory containing ssl certificates
const sslDir = path.resolve(sslConf.dir);

// Default cert and key
const defPubKey = `${sslDir}/${sslConf.pubKeyName}`,
    defPrivKey = `${sslDir}/${sslConf.privKeyName}`,
    defCaBundle = `${sslDir}/${sslConf.caBundleName}`;

let httpsOptions = {
    SNICallback: function (domain, cb) {
        return cb(null, findSSLID(domain));
    },
    cert: readIfExists(defPubKey),
    key: readIfExists(defPrivKey),
    ca: readIfExists(defCaBundle),
};

function getSecureContext(domain) {
    const pubKeyPath = `${sslDir}/${domain}/${sslConf.pubKeyName}`,
        privKeyPath = `${sslDir}/${domain}/${sslConf.privKeyName}`,
        caBundlePath = `${sslDir}/${domain}/${sslConf.caBundleName}`;

    return tls.createSecureContext({
        cert: readIfExists(pubKeyPath),
        key: readIfExists(privKeyPath),
        ca: readIfExists(caBundlePath),
    }).context;
}

// Get certificates for the provided domain
function findSSLID(domain) {
    for (let i = 0; i < proxies.length; i++) {
        for (let j = 0; j < proxies[i].from.length; j++) {
            if (matcher.isMatch(domain, proxies[i].from[j])) {
                return getSecureContext(proxies[i].sslDomain);
            }
        }
    }
}

function readIfExists(path) {
    return fs.existsSync(path) ? fs.readFileSync(path) : undefined;
}

module.exports = httpsOptions;
