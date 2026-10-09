'use strict';

/** Strip secret material from a log line or an error body. The ciphertext and the seal stay out of logs. */
function redact(text) {
  return String(text == null ? '' : text)
    .replace(/("secretKey"\s*:\s*")[^"]*(")/g, '$1***$2')
    .replace(/("secret_enc"\s*:\s*")[^"]*(")/g, '$1***$2')
    .replace(/(secretAccessKey=)[^\s&"]+/gi, '$1***')
    .replace(/(RUSTFS_[A-Z0-9_]*SECRET[A-Z0-9_]*=)[^\s&"]+/gi, '$1***');
}

module.exports = { redact };
