module.exports = function logger(req, res, next) {

    let date = new Date();
    let seconds = (date.getSeconds() < 10 ? "0" : "") + date.getSeconds();
    let minutes = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
    let hours = (date.getHours() < 10 ? "0" : "") + date.getHours();
    console.log(`${hours}:${minutes}:${seconds} [${req.connection.remoteAddress}] ${req.method} -> ${req.hostname + req.path}`);
    next();

}