const Matcher = require("matcher");

/**
 * @param {string} input
 * @param {string[]} patterns
 * @param {string} separator
 *
 * @param {Object} [options]
 * @param {boolean} [options.reverseOrder]
 * @param {boolean} [options.matchLength]
 * @param {boolean} [options.caseSensitive]
 */
function piecewiseMatch(input, patterns, separator, options = {}) {
    const { reverseOrder = false, matchLength = false, caseSensitive = false } = options;
    const inputParts = input.split(separator).filter((part) => part.length > 0);

    if (reverseOrder) {
        inputParts.reverse();
    }

    for (const pattern of patterns) {
        const patternParts = pattern.split(separator).filter((part) => part.length > 0);

        if (patternParts.length > inputParts.length) continue;
        if (matchLength && patternParts.length !== inputParts.length) continue;

        if (reverseOrder) {
            patternParts.reverse();
        }

        let matched = true;
        for (let i = 0; i < patternParts.length; i++) {
            const inputPart = inputParts[i];
            const patternPart = patternParts[i];

            if (!Matcher.isMatch(inputPart, patternPart, { caseSensitive })) {
                matched = false;
                break;
            }
        }

        if (matched) {
            return pattern;
        }
    }
}

/**
 * @param {string} inputPath
 * @param {string[]} patternPaths
 */
function matchPath(inputPath, patternPaths) {
    return piecewiseMatch(inputPath, patternPaths, "/", {
        caseSensitive: true,
    });
}

/**
 * @param {string} inputHostname
 * @param {string[]} patternHostnames
 * @param {boolean} [ignoreSubdomains]
 */
function matchHostname(inputHostname, patternHostnames, ignoreSubdomains) {
    return piecewiseMatch(inputHostname, patternHostnames, ".", {
        reverseOrder: true,
        matchLength: !ignoreSubdomains,
    });
}

module.exports = {
    matchPath,
    matchHostname,
    piecewiseMatch,
};
