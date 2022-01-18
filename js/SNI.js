/** @format */

const tls = require("tls");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");
const proxies = require("../config.json").proxies;
const sslConf = require("../config.json").ssl;

for (proxy of proxies) {
    if (!Array.isArray(proxy.from)) {
        proxy.from = [proxy.from];
    }
}

// Directory containing ssl certificates
const sslDir = path.resolve(sslConf.dir);

// Default cert and key
const defPubKey = path.join(sslDir, sslConf.pubKeyName),
    defPrivKey = path.join(sslDir, sslConf.privKeyName),
    defCaBundle = path.join(sslDir, sslConf.caBundleName);

let httpsOptions = {
    SNICallback: function (domain, cb) {
        return cb(null, findSSLID(domain));
    },
    cert: readIfExists(defPubKey),
    key: readIfExists(defPrivKey),
    ca: readIfExists(defCaBundle),
};

/**
 * @param {string} domain
 * @returns {tls.SecureContextOptions}
 */
function getSecureContext(domain) {
    const pubKeyPath = path.join(sslDir, domain, sslConf.pubKeyName),
        privKeyPath = path.join(sslDir, domain, sslConf.privKeyName),
        caBundlePath = path.join(sslDir, domain, sslConf.caBundleName);

    return tls.createSecureContext({
        cert: readIfExists(pubKeyPath),
        key: readIfExists(privKeyPath),
        ca: readIfExists(caBundlePath),
    }).context;
}

/**
 * Get certificates for the provided domain.
 *
 * @param {string} domain
 * @returns {tls.SecureContextOptions?}
 */
function findSSLID(domain) {
    for (const proxy of proxies) {
        const hostnames = utils.ensureStrings(proxy.from);
        const hostnameRegex = new RegExp(`(?<=\\.|^)(${hostnames.map(utils.escapeRegex).join("|")})$`, "iu");

        if (hostnameRegex.test(domain)) {
            return getSecureContext(proxy.sslDomain);
        }
    }

    return null;
}

/**
 * @param {fs.PathLike} path
 * @returns {Buffer?}
 */
function readIfExists(path) {
    return fs.existsSync(path) ? fs.readFileSync(path) : null;
}

module.exports = httpsOptions;
