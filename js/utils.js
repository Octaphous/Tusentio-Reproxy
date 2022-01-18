module.exports = {
    /**
     * @param {string} s
     * @returns {string}
     */
    escapeRegex(s) {
        return s.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&");
    },
    /**
     * @param {*} o
     * @returns {string[]}
     */
    ensureStrings(o) {
        if (typeof o == "string") {
            return [o];
        } else if (typeof o == "object" && Array.isArray(o)) {
            return o.map((value) => value.toString());
        } else {
            return [`${o}`];
        }
    },
};
