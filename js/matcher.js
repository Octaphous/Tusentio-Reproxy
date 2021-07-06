const Matcher = require("matcher");

/**
 * @param {string} input
 * @param {string} pattern
 * @param {string} separator
 *
 * @param {Object} [options]
 * @param {boolean} [options.reverseOrder]
 * @param {boolean} [options.matchLength]
 * @param {boolean} [options.caseSensitive]
 */
function piecewiseMatch(input, pattern, separator, options = {}) {
    const { reverseOrder = false, matchLength = false, caseSensitive = false } = options;

    const inputParts = input.split(separator).filter((part) => part.length > 0);
    const patternParts = pattern.split(separator).filter((part) => part.length > 0);

    if (patternParts.length > inputParts.length) {
        return undefined;
    }

    if (matchLength && patternParts.length !== inputParts.length) {
        return undefined;
    }

    if (reverseOrder) {
        inputParts.reverse();
        patternParts.reverse();
    }

    const matchingParts = [];

    for (let i = 0; i < patternParts.length; i++) {
        const inputPart = inputParts[i];
        const patternPart = patternParts[i];

        if (!Matcher.isMatch(inputPart, patternPart, { caseSensitive })) {
            return undefined;
        }

        matchingParts.push(inputPart);
    }

    return matchingParts.join(separator);
}

/**
 * @param {string} inputPath
 * @param {string} patternPath
 */
function matchPath(inputPath, patternPath) {
    return (
        "/" +
        piecewiseMatch(inputPath, patternPath, "/", {
            caseSensitive: true,
        })
    );
}

/**
 *
 * @param {string} inputPath
 * @param {string} patternPath
 * @param {boolean} [ignoreSubdomains]
 */
function matchHostname(inputPath, patternPath, ignoreSubdomains) {
    return piecewiseMatch(inputPath, patternPath, ".", {
        reverseOrder: true,
        matchLength: !ignoreSubdomains,
    });
}

module.exports = {
    matchPath,
    matchHostname,
    piecewiseMatch,
};
