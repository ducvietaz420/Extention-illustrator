#target illustrator
var EDT = (function () {
    var commands = {};
    var plans = [];
    var sequence = 0;
    var busy = false;
    var hasOwn = Object.prototype.hasOwnProperty;

    function fail(message) {
        throw new Error(message);
    }

    function quote(value) {
        return '"' + value.replace(/["\\\u0000-\u001f\u2028\u2029]/g, function (character) {
            var code = character.charCodeAt(0).toString(16);
            return '\\u' + ('0000' + code).slice(-4);
        }) + '"';
    }

    function stringify(value) {
        if (value === null) return 'null';
        var type = typeof value;
        if (type === 'string') return quote(value);
        if (type === 'number') return isFinite(value) ? String(value) : 'null';
        if (type === 'boolean') return String(value);
        if (type !== 'object') return 'null';
        var entries = [];
        var key;
        if (Object.prototype.toString.call(value) === '[object Array]') {
            for (var i = 0; i < value.length; i++) entries.push(stringify(value[i]));
            return '[' + entries.join(',') + ']';
        }
        for (key in value) {
            if (hasOwn.call(value, key) && typeof value[key] !== 'undefined') {
                entries.push(quote(key) + ':' + stringify(value[key]));
            }
        }
        return '{' + entries.join(',') + '}';
    }

    function parse(input) {
        var cursor = 0;

        function invalid() {
            fail('Payload JSON không hợp lệ tại ký tự ' + (cursor + 1) + '.');
        }

        function skip() {
            while (/[ \n\r\t]/.test(input.charAt(cursor)) && cursor < input.length) cursor++;
        }

        function readString() {
            var result = '';
            cursor++;
            while (cursor < input.length) {
                var character = input.charAt(cursor++);
                if (character === '"') return result;
                if (character === '\\') {
                    var escape = input.charAt(cursor++);
                    var escapes = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
                    if (escape === 'u') {
                        var hex = input.substr(cursor, 4);
                        if (!/^[0-9a-f]{4}$/i.test(hex)) invalid();
                        character = String.fromCharCode(parseInt(hex, 16));
                        cursor += 4;
                    } else {
                        if (!hasOwn.call(escapes, escape)) invalid();
                        character = escapes[escape];
                    }
                } else if (character.charCodeAt(0) < 32) invalid();
                result += character;
            }
            invalid();
        }

        function read(depth) {
            if (depth > 32) invalid();
            skip();
            var start = input.charAt(cursor);
            if (start === '"') return readString();
            if (start === '[' || start === '{') {
                var array = start === '[';
                var result = array ? [] : {};
                var end = array ? ']' : '}';
                cursor++;
                skip();
                if (input.charAt(cursor) === end) {
                    cursor++;
                    return result;
                }
                while (cursor < input.length) {
                    if (array) {
                        result.push(read(depth + 1));
                    } else {
                        if (input.charAt(cursor) !== '"') invalid();
                        var key = readString();
                        if (key === '__proto__' || key === 'constructor' || key === 'prototype') invalid();
                        skip();
                        if (input.charAt(cursor++) !== ':') invalid();
                        result[key] = read(depth + 1);
                    }
                    skip();
                    var next = input.charAt(cursor++);
                    if (next === end) return result;
                    if (next !== ',') invalid();
                    skip();
                }
                invalid();
            }
            var token = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?|true|false|null)/i.exec(input.slice(cursor));
            if (!token) invalid();
            cursor += token[0].length;
            if (token[0] === 'true') return true;
            if (token[0] === 'false') return false;
            if (token[0] === 'null') return null;
            var number = Number(token[0]);
            if (!isFinite(number)) invalid();
            return number;
        }

        var result = read(0);
        skip();
        if (cursor !== input.length) invalid();
        return result;
    }

    function doc() {
        if (!app.documents.length) fail('Hãy mở một tài liệu Illustrator.');
        return app.activeDocument;
    }

    function errorMessage(error) {
        return error && error.message ? String(error.message) : String(error);
    }

    var plan = {
        put: function (kind, document, request, state, preview) {
            var now = new Date().getTime();
            var token = kind + '-' + now + '-' + (++sequence);
            plans.push({ kind: kind, document: document, request: request, state: state, preview: preview, token: token, time: now });
            if (plans.length > 20) plans.shift();
            preview.token = token;
            return preview;
        },
        get: function (kind, document, token) {
            for (var i = plans.length - 1; i >= 0; i--) {
                var record = plans[i];
                if (record.token === token && record.kind === kind && record.document === document &&
                    new Date().getTime() - record.time < 3600000) return record;
            }
            fail('Kế hoạch không còn hợp lệ cho tài liệu hiện tại. Hãy quét lại.');
        },
        remove: function (token) {
            for (var i = plans.length - 1; i >= 0; i--) {
                if (plans[i].token === token) plans.splice(i, 1);
            }
        }
    };

    function call(command, payload) {
        if (busy) return { ok: false, data: null, error: 'Toolkit đang xử lý lệnh khác.', warnings: [] };
        busy = true;
        try {
            if (!hasOwn.call(commands, command) || typeof commands[command] !== 'function') fail('Lệnh không khả dụng.');
            if (EDT.license) {
                var denial = EDT.license.denial(command);
                if (denial) return { ok: false, data: null, error: denial, code: 'LICENSE_REQUIRED', warnings: [] };
            }
            var result = commands[command](payload || {});
            return { ok: true, data: result, error: null, warnings: result && result.warnings ? result.warnings : [] };
        } catch (error) {
            return { ok: false, data: null, error: errorMessage(error), warnings: [] };
        } finally {
            busy = false;
        }
    }

    function dispatch(encoded) {
        try {
            if (typeof encoded !== 'string' || encoded.length > 16000000) fail('Dữ liệu gửi quá lớn.');
            var packet = parse(decodeURIComponent(encoded));
            if (!packet || typeof packet.command !== 'string') fail('Thiếu tên lệnh.');
            return stringify(call(packet.command, packet.payload));
        } catch (error) {
            return stringify({ ok: false, data: null, error: errorMessage(error), warnings: [] });
        }
    }

    return {
        version: '0.6.0',
        commands: commands,
        doc: doc,
        fail: fail,
        errorMessage: errorMessage,
        json: { parse: parse, stringify: stringify },
        plan: plan,
        call: call,
        dispatch: dispatch
    };
}());

// Publish the one fixed entry point for CEP evalScript.
$.global.EDT = EDT;


EDT.licensePublicKey = {"n":"yVPyQ2RMBXlLrHgZ-9x0LR9prJulXwQ7lZOX0db2ui5cClwpnhLXKIP8Ei8eJQnJmtuFaEdNU9gQr0q1BXEisbCrS2ttlNymqiLAk6SZ3BFSTG181u5u2YVPOejeTOHgxMzzRBNh4QHczGu0Hkl1JuBC3fHRwe-4jLrsR70saWwFugDE8fcUABnTb1-AL6HXiF6B7yHKRaE2HvrxUFct0bl9NqzHhCtXwnHSg8kXf0v3XnX7aEgW6GXH5iaJ1s4vUyCPA8l6A0ELq6rj70Df57u7Q2x3r5sh-vcb3SwrbAYx1EJPPkTEfi8Kav8A4fyyO0HZaMOtyEhx3QaMB6c04Q","e":"AQAB"};


(function (toolkit) {
    // Verification only, with RSA-2048, exponent 65537 and SHA-256.
    // RFC 8017 sections 8.2.2 and 9.2, and FIPS 180-4 section 6.2.
    var octetCount = 256;
    var limbCount = octetCount / 2;
    var mask = 65535;
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    var digestInfo = [
        0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01,
        0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
    ];
    var roundConstants = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
        0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
        0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
        0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
        0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function decodeBase64Url(value) {
        if (typeof value !== "string" || value.length % 4 === 1) return null;
        var octets = [];
        var buffer = 0;
        var bits = 0;
        for (var i = 0; i < value.length; i++) {
            var digit = alphabet.indexOf(value.charAt(i));
            if (digit < 0) return null;
            buffer = (buffer << 6) | digit;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                octets.push(buffer >>> bits);
                buffer &= (1 << bits) - 1;
            }
        }
        return buffer === 0 ? octets : null;
    }

    function rotateRight(value, count) {
        return (value >>> count) | (value << (32 - count));
    }

    function sha256(message) {
        var bytes = [];
        var i;
        for (i = 0; i < message.length; i++) bytes.push(message.charCodeAt(i));
        var bitLength = bytes.length * 8;
        bytes.push(0x80);
        while (bytes.length % 64 !== 56) bytes.push(0);
        // License messages are bounded to 4096 ASCII bytes by verify.
        bytes.push(0, 0, 0, 0, bitLength >>> 24, (bitLength >>> 16) & 255,
            (bitLength >>> 8) & 255, bitLength & 255);
        var hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        var words = [];
        for (var offset = 0; offset < bytes.length; offset += 64) {
            for (i = 0; i < 16; i++) {
                var start = offset + i * 4;
                words[i] = (bytes[start] << 24) | (bytes[start + 1] << 16) |
                    (bytes[start + 2] << 8) | bytes[start + 3];
            }
            for (i = 16; i < 64; i++) {
                var x = words[i - 15];
                var y = words[i - 2];
                var low = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
                var high = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
                words[i] = (words[i - 16] + low + words[i - 7] + high) | 0;
            }
            var a = hash[0], b = hash[1], c = hash[2], d = hash[3];
            var e = hash[4], f = hash[5], g = hash[6], h = hash[7];
            for (i = 0; i < 64; i++) {
                var sumE = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
                var choice = (e & f) ^ (~e & g);
                var temp1 = (h + sumE + choice + roundConstants[i] + words[i]) | 0;
                var sumA = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
                var majority = (a & b) ^ (a & c) ^ (b & c);
                var temp2 = (sumA + majority) | 0;
                h = g;
                g = f;
                f = e;
                e = (d + temp1) | 0;
                d = c;
                c = b;
                b = a;
                a = (temp1 + temp2) | 0;
            }
            hash[0] = (hash[0] + a) | 0;
            hash[1] = (hash[1] + b) | 0;
            hash[2] = (hash[2] + c) | 0;
            hash[3] = (hash[3] + d) | 0;
            hash[4] = (hash[4] + e) | 0;
            hash[5] = (hash[5] + f) | 0;
            hash[6] = (hash[6] + g) | 0;
            hash[7] = (hash[7] + h) | 0;
        }
        var digest = [];
        for (i = 0; i < hash.length; i++) {
            digest.push(hash[i] >>> 24, (hash[i] >>> 16) & 255, (hash[i] >>> 8) & 255, hash[i] & 255);
        }
        return digest;
    }

    // Limbs store unsigned 16-bit digits, least significant first.
    function limbsFromOctets(octets) {
        var limbs = [];
        for (var i = octetCount - 1; i > 0; i -= 2) {
            limbs.push((octets[i - 1] << 8) | octets[i]);
        }
        return limbs;
    }

    function lessThan(left, right) {
        for (var i = limbCount - 1; i >= 0; i--) {
            if (left[i] !== right[i]) return left[i] < right[i];
        }
        return false;
    }

    function subtractInPlace(left, right) {
        var borrow = 0;
        for (var i = 0; i < limbCount; i++) {
            var difference = left[i] - right[i] - borrow;
            left[i] = difference & mask;
            borrow = difference < 0 ? 1 : 0;
        }
    }

    function doubleModulo(number, modulus) {
        var carry = 0;
        for (var i = 0; i < limbCount; i++) {
            var sum = (number[i] << 1) | carry;
            number[i] = sum & mask;
            carry = sum >>> 16;
        }
        if (carry || !lessThan(number, modulus)) subtractInPlace(number, modulus);
    }

    function negativeInverse(lowLimb) {
        // The modulus is odd. Newton iteration doubles the bits of the inverse.
        var inverse = 1;
        for (var i = 0; i < 4; i++) {
            inverse = (inverse * (2 - ((lowLimb * inverse) & mask))) & mask;
        }
        return (-inverse) & mask;
    }

    function montgomeryMultiply(left, right, modulus, factor) {
        // Interleave the product and reduction. Each multiply-accumulate fits
        // exactly in an unsigned 32-bit value with the 16-bit limb size.
        var result = [];
        var i, j;
        for (i = 0; i <= limbCount; i++) result[i] = 0;
        for (i = 0; i < limbCount; i++) {
            var carry = 0;
            var digit = right[i];
            var sum;
            for (j = 0; j < limbCount; j++) {
                sum = result[j] + left[j] * digit + carry;
                result[j] = sum & mask;
                carry = sum >>> 16;
            }
            var top = result[limbCount] + carry;
            result[limbCount] = top & mask;
            var high = top >>> 16;
            var scale = (result[0] * factor) & mask;
            carry = 0;
            for (j = 0; j < limbCount; j++) {
                sum = result[j] + modulus[j] * scale + carry;
                if (j > 0) result[j - 1] = sum & mask;
                carry = sum >>> 16;
            }
            top = result[limbCount] + carry;
            result[limbCount - 1] = top & mask;
            result[limbCount] = high + (top >>> 16);
        }
        if (result[limbCount] || !lessThan(result, modulus)) subtractInPlace(result, modulus);
        result.length = limbCount;
        return result;
    }

    function applyPublicExponent(signature, modulus) {
        var factor = negativeInverse(modulus[0]);
        var power = signature.slice();
        // Convert the representative to the Montgomery domain with R = 2^2048.
        for (var i = 0; i < limbCount * 16; i++) doubleModulo(power, modulus);
        for (i = 0; i < 16; i++) power = montgomeryMultiply(power, power, modulus, factor);
        // Multiply by the original representative to add the final exponent
        // bit and return to ordinary representation in the same operation.
        return montgomeryMultiply(power, signature, modulus, factor);
    }

    function verify(message, signatureBase64Url, publicKey) {
        if (typeof message !== "string" || message.length > 4096 || !/^EDT1\.[A-Za-z0-9_-]+$/.test(message) ||
                typeof signatureBase64Url !== "string" || signatureBase64Url.length !== 342 ||
                !publicKey || publicKey.e !== "AQAB" || typeof publicKey.n !== "string" || publicKey.n.length !== 342) {
            return false;
        }
        var signatureOctets = decodeBase64Url(signatureBase64Url);
        var modulusOctets = decodeBase64Url(publicKey.n);
        if (!signatureOctets || !modulusOctets || modulusOctets[0] < 128 || !(modulusOctets[octetCount - 1] & 1)) return false;
        var signature = limbsFromOctets(signatureOctets);
        var modulus = limbsFromOctets(modulusOctets);
        if (!lessThan(signature, modulus)) return false;
        var encoded = applyPublicExponent(signature, modulus);
        var digest = sha256(message);
        var digestStart = octetCount - digest.length;
        var infoStart = digestStart - digestInfo.length;
        var separator = infoStart - 1;
        var difference = 0;
        for (var i = 0; i < octetCount; i++) {
            var limb = encoded[limbCount - 1 - (i >>> 1)];
            var actual = (i & 1) ? limb & 255 : limb >>> 8;
            var expected;
            if (i === 0 || i === separator) expected = 0;
            else if (i === 1) expected = 1;
            else if (i < separator) expected = 255;
            else if (i < digestStart) expected = digestInfo[i - infoStart];
            else expected = digest[i - digestStart];
            difference |= actual ^ expected;
        }
        return difference === 0;
    }

    toolkit.licenseSignature = { verify: verify, decodeBase64Url: decodeBase64Url };
}(EDT));


(function (E) {
    var PRODUCT = "event-design-toolkit";
    var PREFIX = "EDT1";
    var MAX_KEY_LENGTH = 2048;
    var MAX_RECORD_LENGTH = 4096;
    var MAX_TIME = 253402300799999;
    var FIVE_MINUTES = 5 * 60 * 1000;
    var slots = ["license-a.json", "license-b.json"];
    var observed = 0;
    var cachedKey = null;
    var cachedPayload = null;

    var messages = {
        missing: "Nhập key của EVENT DESIGN TOOLKIT để sử dụng các công cụ.",
        invalid: "Key không hợp lệ cho EVENT DESIGN TOOLKIT.",
        expired: "Key đã hết hạn. Hãy nhập key mới.",
        clock: "Ngày giờ trên máy không phù hợp với key. Hãy kiểm tra đồng hồ hệ thống.",
        storage: "Không thể đọc hoặc lưu key trong thư mục dữ liệu của người dùng."
    };

    function validInteger(value, max) {
        return typeof value === "number" && value >= 0 && value <= max && Math.floor(value) === value;
    }

    function readPayload(encoded) {
        var bytes = E.licenseSignature.decodeBase64Url(encoded);
        if (!bytes) return null;
        var json = [];
        for (var i = 0; i < bytes.length; i++) {
            if (bytes[i] > 127) return null;
            json.push(String.fromCharCode(bytes[i]));
        }
        return E.json.parse(json.join(""));
    }

    function signedPayload(key) {
        if (key === cachedKey) return cachedPayload;
        var match = typeof key === "string" && key.length <= MAX_KEY_LENGTH &&
            /^EDT1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{342})$/.exec(key);
        var payload = null;
        if (match && E.licenseSignature && E.licensePublicKey) {
            try {
                var parsed = readPayload(match[1]);
                if (parsed && parsed.v === 1 && parsed.product === PRODUCT && typeof parsed.id === "string" &&
                        /^[0-9a-f]{32}$/.test(parsed.id) && typeof parsed.type === "string" &&
                        /^(day|month|year|permanent)$/.test(parsed.type) && validInteger(parsed.issuedAt, MAX_TIME) &&
                        (parsed.type === "permanent" ? parsed.expiresAt === null :
                            validInteger(parsed.expiresAt, MAX_TIME) && parsed.expiresAt > parsed.issuedAt) &&
                        E.licenseSignature.verify(PREFIX + "." + match[1], match[2], E.licensePublicKey)) {
                    payload = parsed;
                }
            } catch (invalid) { }
        }
        cachedKey = key;
        cachedPayload = payload;
        return payload;
    }

    function stateFolder() {
        return new Folder(Folder.userData.absoluteURI + "/EventDesignToolkit");
    }

    function slot(folder, index) {
        return new File(folder.absoluteURI + "/" + slots[index]);
    }

    function readSlot(folder, index) {
        var file = slot(folder, index);
        var result = { index: index, exists: file.exists, record: null };
        if (!result.exists || file.alias) return result;
        file.encoding = "UTF-8";
        if (!file.open("r")) return result;
        var text;
        try { text = file.read(MAX_RECORD_LENGTH + 1); }
        finally { file.close(); }
        if (!text || text.length > MAX_RECORD_LENGTH) return result;
        try {
            var data = E.json.parse(text);
            if (data && data.v === 1 && validInteger(data.revision, 9007199254740990) &&
                    validInteger(data.seenAt, MAX_TIME) &&
                    (data.key === null || (typeof data.key === "string" && data.key.length <= MAX_KEY_LENGTH))) {
                result.record = data;
            }
        } catch (invalid) { }
        return result;
    }

    function currentRecord(folder) {
        var first = readSlot(folder, 0);
        var second = readSlot(folder, 1);
        var latest = first.record && (!second.record || first.record.revision >= second.record.revision) ?
            first : second;
        latest.damaged = !latest.record && (first.exists || second.exists);
        return latest;
    }

    function writeRecord(folder, previous, key, seenAt) {
        if (!folder.exists && !folder.create()) E.fail(messages.storage);
        var revision = previous.record ? previous.record.revision + 1 : 1;
        var index = 1 - previous.index;
        var file = slot(folder, index);
        var data = { v: 1, revision: revision, key: key, seenAt: seenAt };
        file.encoding = "UTF-8";
        if (file.alias || !file.open("w")) E.fail(messages.storage);
        var written, closed;
        try { written = file.write(E.json.stringify(data)); }
        finally { closed = file.close(); }
        var saved = readSlot(folder, index).record;
        if (!written || !closed || !saved || saved.revision !== revision ||
                saved.key !== key || saved.seenAt !== seenAt) E.fail(messages.storage);
    }

    function metadata(payload, reason) {
        return {
            active: reason === null,
            reason: reason,
            type: payload ? payload.type : null,
            issuedAt: payload ? payload.issuedAt : null,
            expiresAt: payload ? payload.expiresAt : null,
            id: payload ? payload.id : null
        };
    }

    function validateTime(payload, now, seenAt) {
        if (!payload) return "invalid";
        if (!validInteger(now, MAX_TIME) || now + FIVE_MINUTES < payload.issuedAt) return "clock";
        if (payload.expiresAt !== null) {
            var last = Math.max(seenAt, observed);
            if (Math.max(now, last) >= payload.expiresAt) return "expired";
            if (now + FIVE_MINUTES < last) return "clock";
        }
        return null;
    }

    function status() {
        try {
            var folder = stateFolder();
            var latest = currentRecord(folder);
            if (latest.damaged) return metadata(null, "storage");
            var record = latest.record;
            if (!record || !record.key) return metadata(null, "missing");
            var payload = signedPayload(record.key);
            var now = new Date().getTime();
            var reason = validateTime(payload, now, record.seenAt);
            if ((!reason || reason === "expired") && payload.expiresAt !== null) {
                observed = Math.max(observed, record.seenAt, Math.min(now, payload.expiresAt));
                if (observed - record.seenAt >= FIVE_MINUTES || (reason === "expired" && observed > record.seenAt)) {
                    try { writeRecord(folder, latest, record.key, observed); }
                    catch (unavailable) { }
                }
            }
            return metadata(payload, reason);
        } catch (unavailable) {
            return metadata(null, "storage");
        }
    }

    E.commands.licenseStatus = status;

    E.commands.activateLicense = function (request) {
        if (typeof request.key !== "string" || request.key.length > MAX_RECORD_LENGTH) E.fail(messages.invalid);
        var key = request.key.replace(/^\s+|\s+$/g, "");
        var payload = signedPayload(key);
        if (!payload) E.fail(messages.invalid);
        var folder = stateFolder();
        var latest = currentRecord(folder);
        var seenAt = latest.record ? latest.record.seenAt : 0;
        var now = new Date().getTime();
        var reason = validateTime(payload, now, seenAt);
        if (reason) E.fail(messages[reason]);
        if (payload.expiresAt !== null) observed = Math.max(seenAt, observed, now);
        writeRecord(folder, latest, key, Math.max(seenAt, observed));
        return metadata(payload, null);
    };

    E.commands.deactivateLicense = function () {
        var folder = stateFolder();
        var latest = currentRecord(folder);
        if (!latest.record && !latest.damaged) return metadata(null, "missing");
        var seenAt = latest.record ? latest.record.seenAt : 0;
        writeRecord(folder, latest, null, Math.max(seenAt, observed));
        var previous = slot(folder, latest.index);
        if (previous.exists && !previous.alias) {
            try { previous.remove(); } catch (unavailable) { }
        }
        cachedKey = null;
        cachedPayload = null;
        return metadata(null, "missing");
    };

    E.license = {
        denial: function (command) {
            if (command === "licenseStatus" || command === "activateLicense" || command === "deactivateLicense") return null;
            var current = status();
            return current.active ? null : messages[current.reason];
        }
    };
}(EDT));


(function (E) {
    var rolePrefix = "[[com.eventdesigntoolkit.role.v1:";
    var roleSuffix = /[\r\n]\[\[com\.eventdesigntoolkit\.role\.v1:([^\]\r\n]+)\]\]$/;
    var anchors = {tl: [0, 0], tc: [0.5, 0], tr: [1, 0], ml: [0, 0.5], mc: [0.5, 0.5], mr: [1, 0.5], bl: [0, 1], bc: [0.5, 1], br: [1, 1]};
    var factors = {pt: 1, mm: 72 / 25.4, cm: 72 / 2.54};
    var yDirection = 1;
    var selectionError = "Hãy chọn đối tượng bằng công cụ Selection.";
    var epsilon = 0.0001;

    function withDocumentCoordinates(fn) {
        var previous = app.coordinateSystem;
        var previousDirection = yDirection;
        var doc = app.documents.length ? app.activeDocument : null;
        var boardIndex = doc ? doc.artboards.getActiveArtboardIndex() : -1;
        try {
            app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
            if (doc && boardIndex >= 0) {
                var raw = doc.artboards[boardIndex].artboardRect;
                yDirection = raw[1] < raw[3] ? -1 : 1;
            }
            return fn();
        } finally {
            yDirection = previousDirection;
            try {
                if (doc && boardIndex >= 0 && doc.artboards.getActiveArtboardIndex() !== boardIndex &&
                    boardIndex < doc.artboards.length) {
                    doc.artboards.setActiveArtboardIndex(boardIndex);
                }
            } finally {
                app.coordinateSystem = previous;
            }
        }
    }

    function rect(raw) {
        if (!raw || raw.length !== 4) {
            E.fail("Illustrator không trả về đủ bốn tọa độ.");
        }
        var l = Number(raw[0]);
        var t = Number(raw[1]) * yDirection;
        var r = Number(raw[2]);
        var b = Number(raw[3]) * yDirection;
        if (!(isFinite(l) && isFinite(t) && isFinite(r) && isFinite(b))) {
            E.fail("Tọa độ không hợp lệ.");
        }
        return [Math.min(l, r), Math.max(t, b), Math.max(l, r), Math.min(t, b)];
    }

    function nativeRect(box) {
        return [box[0], box[1] * yDirection, box[2], box[3] * yDirection];
    }

    function boardRect(doc, index) {
        return rect(doc.artboards[index].artboardRect);
    }

    function boards(doc) {
        var out = [];
        for (var i = 0; i < doc.artboards.length; i += 1) {
            out.push({index: i, number: i + 1, name: doc.artboards[i].name, rect: boardRect(doc, i)});
        }
        return out;
    }

    function anchor(box, key) {
        key = key || "mc";
        var fraction = anchors[key];
        if (!fraction || fraction.length !== 2) {
            E.fail("Điểm neo không hợp lệ.");
        }
        return [box[0] + (box[2] - box[0]) * fraction[0], box[1] - (box[1] - box[3]) * fraction[1]];
    }

    function translate(item, dx, dy) {
        if (!isFinite(dx) || !isFinite(dy)) {
            E.fail("Độ dịch chuyển không hợp lệ.");
        }
        if (Math.abs(dx) > epsilon || Math.abs(dy) > epsilon) {
            item.translate(dx, dy * yDirection, true, true, true, true);
        }
    }

    function combine(a, b) {
        return a ? [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])] : b;
    }

    function clippingPath(group) {
        var children = group.pageItems;
        for (var i = 0; i < children.length; i += 1) {
            var item = children[i];
            if (!sameItem(item.parent, group)) {
                continue;
            }
            if (item.typename === "PathItem" && item.clipping) {
                return item;
            }
            if (item.typename === "CompoundPathItem") {
                for (var j = 0; j < item.pathItems.length; j += 1) {
                    if (item.pathItems[j].clipping) {
                        return item;
                    }
                }
            }
        }
        E.fail("Nhóm clipping có mặt nạ mà Illustrator không đọc được.");
    }

    function outlineBounds(item) {
        if (item.typename !== "TextFrame" ||
            (item.kind !== TextType.POINTTEXT && item.kind !== TextType.AREATEXT) ||
            linkedText(item) || !item.contents) {
            E.fail("Đo phần chữ nhìn thấy chỉ hỗ trợ Point Text và Area Text đơn, có nội dung.");
        }
        var doc = E.doc();
        var selected = doc.selection;
        if (selected && typeof selected.translate !== "function" && selected.typename === "TextRange") {
            E.fail("Thoát khỏi chế độ sửa chữ trước khi đo phần chữ nhìn thấy.");
        }
        var originalSelection = [];
        for (var i = 0; selected && i < selected.length; i += 1) {
            if (!selected[i] || typeof selected[i].translate !== "function") {
                E.fail("Thoát khỏi chế độ sửa chữ trước khi đo phần chữ nhìn thấy.");
            }
            originalSelection.push(selected[i]);
        }
        var copy = null;
        var outline = null;
        try {
            copy = item.duplicate();
            outline = copy.createOutline();
            copy = null;
            return bounds(outline, "geometric");
        } finally {
            try {
                if (outline) {
                    outline.remove();
                } else if (copy) {
                    copy.remove();
                }
            } finally {
                doc.selection = null;
                for (i = 0; i < originalSelection.length; i += 1) {
                    originalSelection[i].selected = true;
                }
            }
        }
    }

    function linkedText(item) {
        if (item.typename !== "TextFrame" || item.kind === TextType.POINTTEXT) {
            return false;
        }
        if (!item.story || !item.story.textFrames) {
            E.fail("Illustrator không trả về thông tin liên kết của khung chữ.");
        }
        return item.story.textFrames.length > 1;
    }

    function bounds(item, mode) {
        mode = mode || "geometric";
        if (mode === "ink" || mode === "visibleText") {
            return outlineBounds(item);
        }
        if (mode === "frame" || mode === "textFrame") {
            if (item.typename === "TextFrame" && item.kind === TextType.AREATEXT) {
                var path = item.textPath;
                return rect([path.left, path.top, path.left + path.width, path.top - path.height * yDirection]);
            }
            if (item.typename === "TextFrame" && item.kind === TextType.PATHTEXT) {
                E.fail("Path Text không hỗ trợ đo khung chữ.");
            }
            mode = "geometric";
        }
        if (mode !== "geometric" && mode !== "visible") {
            E.fail("Kiểu bounds không hợp lệ.");
        }
        var property = mode === "visible" ? "visibleBounds" : "geometricBounds";
        if (item.typename !== "GroupItem") {
            return rect(item[property]);
        }
        if (item.clipped) {
            // A clipped item can extend beyond the mask. The clip frame is the stable anchor.
            return rect(clippingPath(item)[property]);
        }
        var union = null;
        var children = item.pageItems;
        for (var i = 0; i < children.length; i += 1) {
            var child = children[i];
            if (sameItem(child.parent, item) && !child.hidden && !(child.typename === "PathItem" && child.guides)) {
                union = combine(union, bounds(child, mode));
            }
        }
        return union || rect(item[property]);
    }

    function intersects(a, b) {
        if (a[2] - a[0] <= epsilon && a[1] - a[3] <= epsilon) {
            return a[0] >= b[0] && a[0] <= b[2] && a[1] <= b[1] && a[1] >= b[3];
        }
        var xStart = Math.max(a[0], b[0]);
        var xEnd = Math.min(a[2], b[2]);
        var yStart = Math.max(a[3], b[3]);
        var yEnd = Math.min(a[1], b[1]);
        var xOverlaps = a[2] - a[0] <= epsilon ? xEnd >= xStart : xEnd - xStart > epsilon;
        var yOverlaps = a[1] - a[3] <= epsilon ? yEnd >= yStart : yEnd - yStart > epsilon;
        return xOverlaps && yOverlaps;
    }

    function artboardOf(box, doc, cachedBoards) {
        var indices = [];
        var found = cachedBoards || boards(doc);
        for (var i = 0; i < found.length; i += 1) {
            if (intersects(box, found[i].rect)) {
                indices.push(found[i].index);
            }
        }
        if (indices.length === 1) {
            return {index: indices[0], indices: indices, reason: ""};
        }
        return {
            index: -1,
            indices: indices,
            reason: indices.length ? "Đối tượng giao nhiều artboard hoặc nằm trên vùng artboard chồng nhau." : "Đối tượng nằm ngoài artboard."
        };
    }

    function targets(doc, scope) {
        scope = scope || {kind: "current"};
        var kind = typeof scope === "string" ? scope : scope.kind;
        var count = doc.artboards.length;
        var out = [];
        var i;
        if (kind === "all" || kind === "document") {
            for (i = 0; i < count; i += 1) {
                out.push(i);
            }
            return out;
        }
        if (kind === "current" || kind === "active") {
            return [doc.artboards.getActiveArtboardIndex()];
        }
        if (kind !== "marked" && kind !== "list") {
            E.fail("Chưa chọn phạm vi artboard hợp lệ.");
        }
        var input = scope.list || scope.boards || scope.artboards || scope.indices;
        if (input instanceof Array) {
            input = input.join(",");
        }
        if (typeof input !== "string" || !/\S/.test(input)) {
            E.fail("Hãy nhập danh sách artboard, ví dụ 1,3,5-10.");
        }
        var parts = input.split(",");
        var seen = {};
        for (i = 0; i < parts.length; i += 1) {
            var match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(parts[i]);
            if (!match) {
                E.fail("Mục danh sách artboard không hợp lệ: " + parts[i]);
            }
            var first = Number(match[1]);
            var last = match[2] ? Number(match[2]) : first;
            if (first < 1 || last < first || last > count) {
                E.fail("Số artboard phải thuộc khoảng 1–" + count + ": " + parts[i]);
            }
            for (var n = first; n <= last; n += 1) {
                if (!seen[n]) {
                    seen[n] = true;
                    out.push(n - 1);
                }
            }
        }
        return out;
    }

    function canvasFactor(doc) {
        var factor;
        try { factor = doc.scaleFactor; } catch (unavailable) { }
        if (typeof factor === "undefined") {
            // Illustrator introduced Large Canvas in 24.2.
            var version = String(app.version).split(".");
            var major = Number(version[0]);
            if (major > 0 && (major < 24 || (major === 24 && Number(version[1]) < 2))) return 1;
        }
        factor = Number(factor);
        if (factor !== 1 && factor !== 10) {
            E.fail("Chưa xác định hệ số canvas từ Illustrator; không thể đổi sang đơn vị vật lý.");
        }
        return factor;
    }

    function scaleDenominator(scale) {
        if (scale === undefined || scale === null || scale === "") {
            return 1;
        }
        var value = Number(String(scale).replace(/^1:/, ""));
        if (value !== 1 && value !== 2 && value !== 5 && value !== 10) {
            E.fail("Tỷ lệ thiết kế phải là 1:1, 1:2, 1:5 hoặc 1:10.");
        }
        return value;
    }

    function unitFactor(unit) {
        if (unit !== "mm" && unit !== "cm" && unit !== "pt") {
            E.fail("Đơn vị phải là mm, cm hoặc pt.");
        }
        return factors[unit];
    }

    function unitToPoints(value, unit, designScale, doc) {
        if (value === undefined || value === null || value === "" || !isFinite(Number(value))) {
            E.fail("Giá trị đo không hợp lệ.");
        }
        return Number(value) * unitFactor(unit) / scaleDenominator(designScale) / canvasFactor(doc);
    }

    function pointsToUnit(value, unit, designScale, doc) {
        return value * canvasFactor(doc) * scaleDenominator(designScale) / unitFactor(unit);
    }

    function uuid(item) {
        try {
            return item.uuid ? String(item.uuid) : "";
        } catch (ignoredUuid) {
            return "";
        }
    }

    function itemByUuid(doc, id, type) {
        if (!id) return null;
        try {
            var direct = doc.getPageItemFromUuid(id);
            if (direct && uuid(direct) === id && (!type || direct.typename === type)) return direct;
        } catch (unavailable) {
            // Some native PageItem types cannot be resolved through the UUID method.
        }
        var items = collectItems(doc);
        for (var i = 0; i < items.length; i++) {
            if ((!type || items[i].typename === type) && uuid(items[i]) === id) return items[i];
        }
        return null;
    }

    function sameItem(a, b) {
        if (a === b || a == b) {
            return true;
        }
        if (!a || !b || a.typename !== b.typename || a.typename === "Layer" || a.typename === "Document") {
            return false;
        }
        var id = uuid(a);
        return Boolean(id && id === uuid(b));
    }

    function findItem(items, item) {
        for (var i = 0; i < items.length; i += 1) {
            if (sameItem(items[i], item)) {
                return i;
            }
        }
        return -1;
    }

    function collectItems(doc) {
        var items = [];
        var seen = {};
        var withoutIds = [];
        function add(collection, directParent) {
            for (var i = 0; i < collection.length; i += 1) {
                var item = collection[i];
                if (directParent && !sameItem(item.parent, directParent)) {
                    continue;
                }
                var id = uuid(item);
                if (id ? seen["uuid:" + id] : findItem(withoutIds, item) >= 0) {
                    continue;
                }
                if (id) {
                    seen["uuid:" + id] = true;
                } else {
                    withoutIds.push(item);
                }
                items.push(item);
                if (item.typename === "GroupItem") {
                    add(item.pageItems, item);
                }
            }
        }
        add(doc.pageItems, null);
        return items;
    }

    function hasAncestor(item, candidates) {
        var parent = item.parent;
        while (parent && parent.typename !== "Document") {
            if (findItem(candidates, parent) >= 0) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    function selectedItems(doc) {
        var selection = doc.selection;
        if (!selection || typeof selection.length !== "number") {
            E.fail(selectionError);
        }
        var items = [];
        for (var i = 0; i < selection.length; i += 1) {
            var item = selection[i];
            if (!item || !item.typename || typeof item.translate !== "function") {
                E.fail(selectionError);
            }
            items.push(item);
        }
        if (!items.length) {
            E.fail(selectionError);
        }
        return items;
    }

    function lockedReason(item) {
        var current = item;
        while (current && current.typename !== "Document") {
            if (current.locked) {
                return "Đối tượng hoặc lớp/nhóm cha đang khóa.";
            }
            if (current.typename === "Layer" ? !current.visible : current.hidden) {
                return "Đối tượng hoặc lớp/nhóm cha đang ẩn.";
            }
            if (current.typename === "PathItem" && current.guides) {
                return "Đường hướng dẫn.";
            }
            current = current.parent;
        }
        return "";
    }

    function readNote(item) {
        try {
            return typeof item.note === "string" ? item.note : null;
        } catch (error) {
            return null;
        }
    }

    function roleRecord(note) {
        var match = note === null ? null : roleSuffix.exec(note);
        if (match && match.index + match[0].length === note.length) {
            try {
                var value = decodeURIComponent(match[1]);
                if (value && encodeURIComponent(value) === match[1]) {
                    return {base: note.slice(0, match.index), value: value};
                }
            } catch (ignoredEncoding) {
                // An ill-formed marker is ordinary user text and stays in the note.
            }
        }
        return {base: note, value: ""};
    }

    function role(item) {
        return roleRecord(readNote(item)).value;
    }

    function roleValue(value, allowEmpty) {
        var clean = String(value || "").replace(/^\s+|\s+$/g, "");
        if (clean.length > 80 || /[\u0000-\u001F\u007F]/.test(clean) || (!clean && !allowEmpty)) {
            E.fail("Vai trò phải có 1–80 ký tự và không chứa ký tự điều khiển.");
        }
        return clean;
    }

    function setRole(item, value) {
        value = roleValue(value, true);
        var previous = readNote(item);
        if (previous === null) {
            E.fail("Loại đối tượng này không hỗ trợ metadata vai trò.");
        }
        var before = roleRecord(previous);
        if (value === before.value) {
            return;
        }
        item.note = before.base + (value ? "\n" + rolePrefix + encodeURIComponent(value) + "]]" : "");
        var after = roleRecord(readNote(item));
        if (after.base !== before.base || after.value !== value) {
            item.note = previous;
            E.fail("Illustrator không giữ nguyên phần ghi chú khi cập nhật vai trò.");
        }
    }

    E.geo = {
        epsilon: epsilon,
        withDocumentCoordinates: withDocumentCoordinates,
        rect: rect,
        nativeRect: nativeRect,
        boardRect: boardRect,
        boards: boards,
        bounds: bounds,
        anchor: anchor,
        translate: translate,
        combine: combine,
        intersects: intersects,
        artboardOf: artboardOf,
        targets: targets,
        canvasFactor: canvasFactor,
        scaleDenominator: scaleDenominator,
        unitToPoints: unitToPoints,
        pointsToUnit: pointsToUnit,
        uuid: uuid,
        itemByUuid: itemByUuid,
        sameItem: sameItem,
        findItem: findItem,
        collectItems: collectItems,
        hasAncestor: hasAncestor,
        selectedItems: selectedItems,
        lockedReason: lockedReason,
        linkedText: linkedText,
        role: role,
        roleValue: roleValue,
        setRole: setRole
    };
}(EDT));


(function (E) {
    var openDocuments = [];

    function documentKey(doc) {
        try {
            var file = doc.fullName;
            if (file && file.exists) return file.fsName;
        } catch (unsavedDocument) {}
        for (var i = 0; i < openDocuments.length; i++) {
            if (openDocuments[i] === doc) return "untitled:" + (i + 1);
        }
        openDocuments.push(doc);
        return "untitled:" + openDocuments.length;
    }

    E.commands.context = function () {
        if (!app.documents.length) return {version: app.version, document: null};
        var doc = E.doc();
        return E.geo.withDocumentCoordinates(function () {
            var measured = E.geo.boards(doc);
            var boards = [];
            var factor = E.geo.canvasFactor(doc);
            for (var i = 0; i < measured.length; i++) {
                var rect = measured[i].rect;
                boards.push({index: i + 1, name: measured[i].name, width: (rect[2] - rect[0]) * factor,
                    height: (rect[1] - rect[3]) * factor});
            }
            return {version: app.version, document: {name: doc.name, key: documentKey(doc),
                selectionCount: doc.selection ? doc.selection.length || 0 : 0,
                activeArtboard: doc.artboards.getActiveArtboardIndex() + 1, artboards: boards, scaleFactor: factor}};
        });
    };
}(EDT));


(function (E) {
    var G = E.geo;
    var sample = null;
    var sampleVersion = 0;
    var positionTolerance = 0.004;
    var kinds = {
        PathItem: true, CompoundPathItem: true, GroupItem: true, PlacedItem: true,
        RasterItem: true, SymbolItem: true, TextFrame: true
    };

    function message(error) {
        return error && error.message ? String(error.message) : String(error);
    }

    function name(item) {
        return String(item.name || item.typename);
    }

    function identity(item) {
        return {name: name(item), uuid: G.uuid(item), role: G.role(item), typename: item.typename};
    }

    function childOfClippingGroup(item) {
        var parent = item.parent;
        while (parent && parent.typename === "GroupItem") {
            if (parent.clipped) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    function objectLimit(item) {
        var reason = G.lockedReason(item);
        if (reason) {
            return reason;
        }
        if (kinds[item.typename] !== true) {
            return "Loại đối tượng chưa hỗ trợ đo và di chuyển.";
        }
        if (item.parent && item.parent.typename === "CompoundPathItem") {
            return "Chọn cả compound path để giữ hình ghép.";
        }
        if (item.typename === "TextFrame" && (item.kind === TextType.PATHTEXT || G.linkedText(item))) {
            return "Path Text hoặc text liên kết cần xử lý thủ công.";
        }
        if (childOfClippingGroup(item)) {
            return "Hãy đồng bộ cả nhóm clipping để giữ mặt nạ.";
        }
        return item.typename === "GroupItem" ? groupDescendantLimit(item) : "";
    }

    function groupDescendantLimit(group) {
        var children = group.pageItems;
        for (var i = 0; i < children.length; i += 1) {
            var child = children[i];
            if (!G.sameItem(child.parent, group)) {
                continue;
            }
            if (G.lockedReason(child) || (child.typename === "TextFrame" &&
                (child.kind === TextType.PATHTEXT || G.linkedText(child)))) {
                return "Nhóm chứa phần tử khóa, ẩn, hướng dẫn hoặc text chưa hỗ trợ.";
            }
            if (child.typename === "GroupItem") {
                var reason = groupDescendantLimit(child);
                if (reason) {
                    return reason;
                }
            }
        }
        return "";
    }

    function label(board) {
        return {boardNumber: board.number, boardName: board.name};
    }

    function issue(item, reason) {
        var info = identity(item);
        info.reason = reason;
        return info;
    }

    function boardState(board) {
        return [board.index, board.name, board.rect];
    }

    function equivalent(a, b) {
        if (a === b) {
            return true;
        }
        if (typeof a === "number" && typeof b === "number") {
            return Math.abs(a - b) <= G.epsilon;
        }
        if (!(a instanceof Array) || !(b instanceof Array) || a.length !== b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i += 1) {
            if (!equivalent(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    function closePoint(points, wanted) {
        return Math.abs(points[0] - wanted[0]) <= positionTolerance &&
            Math.abs(points[1] - wanted[1]) <= positionTolerance;
    }

    function reroute(item, info) {
        info.name = name(item);
        info.role = G.role(item);
        info.uuid = G.uuid(item);
        return info;
    }

    function findByUuid(doc, uuid) {
        if (!uuid) {
            E.fail("Đối tượng không có mã nhận diện để chọn lại.");
        }
        var item = G.itemByUuid(doc, uuid);
        if (item) return item;
        E.fail("Đối tượng không còn trong tài liệu.");
    }

    function matcher(request, model) {
        var mode = request.matchMode || "role";
        if (mode === "role") {
            var role = G.roleValue(request.role || G.role(model), false);
            return function (item) { return G.role(item) === role; };
        }
        if (mode === "name") {
            var itemName = String(request.name || model.name || "");
            if (!itemName) {
                E.fail("Nhập tên đối tượng hoặc đặt tên đối tượng mẫu.");
            }
            return function (item) { return item.name === itemName; };
        }
        E.fail("Chọn cách nhận diện theo vai trò hoặc tên đối tượng.");
    }

    function candidates(doc, boards, indices, matches) {
        var available = {};
        var blocked = {};
        var skipped = [];
        var unknown = [];
        var items = G.collectItems(doc);
        for (var i = 0; i < indices.length; i += 1) {
            available[indices[i]] = [];
            blocked[indices[i]] = [];
        }
        for (i = 0; i < items.length; i += 1) {
            var item = items[i];
            if (!matches(item)) {
                continue;
            }
            var assignment;
            var rect;
            var limit = "";
            try {
                rect = G.bounds(item, "geometric");
                assignment = G.artboardOf(rect, doc, boards);
            } catch (error) {
                limit = "Không đọc được bounds cần thiết. " + message(error);
                try {
                    rect = G.rect(item.geometricBounds);
                    assignment = G.artboardOf(rect, doc, boards);
                } catch (ignoredNativeBounds) {
                    var uncertain = issue(item, limit);
                    unknown.push(uncertain);
                    skipped.push(uncertain);
                    continue;
                }
            }
            if (!limit) {
                try {
                    limit = objectLimit(item);
                } catch (limitError) {
                    limit = message(limitError);
                }
            }
            var entry = {item: item, reason: limit, geometric: rect};
            if (assignment.index >= 0) {
                if (available[assignment.index]) {
                    available[assignment.index].push(entry);
                }
                continue;
            }
            entry.reason = assignment.reason;
            var concerned = !assignment.indices.length;
            for (var j = 0; j < assignment.indices.length; j += 1) {
                var list = blocked[assignment.indices[j]];
                if (list) {
                    list.push(entry);
                    concerned = true;
                }
            }
            if (concerned) {
                skipped.push(issue(item, entry.reason));
            }
        }
        return {available: available, blocked: blocked, skipped: skipped, unknown: unknown};
    }

    E.commands.roleAssign = function (request) {
        var doc = E.doc();
        var items = G.selectedItems(doc);
        var role = G.roleValue(request.role, true);
        var result = {count: 0, skipped: []};
        for (var i = 0; i < items.length; i += 1) {
            var item = items[i];
            var reason = G.lockedReason(item);
            if (!reason && G.hasAncestor(item, items)) {
                reason = "Đã chọn nhóm cha.";
            }
            if (!reason) {
                try {
                    if (G.role(item) !== role) {
                        G.setRole(item, role);
                        result.count += 1;
                    }
                    continue;
                } catch (error) {
                    reason = message(error);
                }
            }
            result.skipped.push(issue(item, reason));
        }
        return result;
    };

    E.commands.selectSyncItem = function (request) {
        var doc = E.doc();
        var item = findByUuid(doc, String(request.uuid || ""));
        if (!item) {
            E.fail("Đối tượng không còn trong tài liệu.");
        }
        var reason = G.lockedReason(item);
        if (reason) {
            E.fail(reason);
        }
        doc.selection = null;
        item.selected = true;
        return identity(item);
    };

    function rowMatches(row, available, blocked) {
        var combined = available.concat(blocked);
        row.matches = [];
        for (var i = 0; i < combined.length; i += 1) {
            row.matches.push(issue(combined[i].item, combined[i].reason));
        }
        if (combined.length === 1) {
            reroute(combined[0].item, row);
        }
    }

    function captureState(item, doc, boards) {
        var reason = objectLimit(item);
        if (reason) {
            E.fail(reason);
        }
        var box = G.bounds(item, "geometric");
        var assignment = G.artboardOf(box, doc, boards);
        if (assignment.index < 0) {
            E.fail(assignment.reason);
        }
        var board = boards[assignment.index];
        return {board: board, stamp: [boardState(board), box, name(item), G.role(item), G.uuid(item)]};
    }

    function sizeInUnit(box, doc, settings) {
        return [G.pointsToUnit(box[2] - box[0], settings.unit, settings.designScale, doc),
            G.pointsToUnit(box[1] - box[3], settings.unit, settings.designScale, doc)];
    }

    function sourceData(item, board, box, point, doc, settings) {
        var out = identity(item);
        var dimensions = sizeInUnit(box, doc, settings);
        out.boardNumber = board.number;
        out.boardName = board.name;
        out.objectName = String(item.name || "");
        out.point = point;
        out.bounds = box;
        out.width = dimensions[0];
        out.height = dimensions[1];
        out.unit = settings.unit;
        return out;
    }

    E.commands.captureSample = function (request) {
        return G.withDocumentCoordinates(function () {
            var doc = E.doc();
            var items = G.selectedItems(doc);
            if (items.length !== 1) {
                E.fail("Chọn đúng một đối tượng đã căn chỉnh để lấy làm mẫu.");
            }
            var item = items[0];
            var captured = captureState(item, doc, G.boards(doc));
            var box = G.bounds(item, modeForBounds(request.boundsMode));
            var point = G.anchor(box, request.objectAnchor || "mc");
            var settings = {unit: request.unit || "cm", designScale: G.scaleDenominator(request.designScale)};
            var data = sourceData(item, captured.board, box, point, doc, settings);
            sampleVersion += 1;
            sample = {doc: doc, item: item, version: sampleVersion, stamp: captured.stamp};
            return data;
        });
    };

    function modeForBounds(value) {
        var mode = value || "geometric";
        if (mode !== "geometric" && mode !== "frame" && mode !== "textFrame" && mode !== "visible") {
            E.fail("Đồng bộ yêu cầu bounds hình học, tính stroke hoặc khung chữ. Xem kế hoạch là thao tác chỉ đọc.");
        }
        return mode;
    }

    function readRequest(doc, request) {
        var purpose = request.purpose || "position";
        if (purpose !== "position" && purpose !== "size") {
            E.fail("Chọn đồng bộ vị trí hoặc kích thước.");
        }
        var settings = {
            purpose: purpose,
            mode: request.mode || "distance",
            sizeMode: request.sizeMode || "bothProportional",
            objectAnchor: request.objectAnchor || "mc",
            artboardAnchor: request.artboardAnchor || "tl",
            boundsMode: purpose === "size" ? "geometric" : modeForBounds(request.boundsMode),
            unit: request.unit || (purpose === "size" ? "cm" : "mm"),
            designScale: G.scaleDenominator(request.designScale)
        };
        if (settings.mode !== "distance" && settings.mode !== "ratio" && settings.mode !== "anchor") {
            E.fail("Chế độ tính vị trí không hợp lệ.");
        }
        if (purpose === "size" && settings.sizeMode !== "bothProportional" && settings.sizeMode !== "exact" &&
            settings.sizeMode !== "width" && settings.sizeMode !== "height") {
            E.fail("Chế độ tính kích thước không hợp lệ.");
        }
        settings.offsetX = G.unitToPoints(purpose === "position" && settings.mode === "anchor" && request.offsetX ? request.offsetX : 0,
            settings.unit, settings.designScale, doc);
        settings.offsetY = G.unitToPoints(purpose === "position" && settings.mode === "anchor" && request.offsetY ? request.offsetY : 0,
            settings.unit, settings.designScale, doc);
        return settings;
    }

    function placeOnBoard(sourcePoint, sourceRect, targetRect, settings) {
        var sourceOrigin = G.anchor(sourceRect, settings.artboardAnchor);
        var targetOrigin = G.anchor(targetRect, settings.artboardAnchor);
        var deltaX = 0;
        var deltaY = 0;
        if (settings.mode !== "anchor") {
            deltaX = sourcePoint[0] - sourceOrigin[0];
            deltaY = sourcePoint[1] - sourceOrigin[1];
        }
        if (settings.mode === "ratio") {
            deltaX *= (targetRect[2] - targetRect[0]) / (sourceRect[2] - sourceRect[0]);
            deltaY *= (targetRect[1] - targetRect[3]) / (sourceRect[1] - sourceRect[3]);
        }
        return [targetOrigin[0] + deltaX + settings.offsetX, targetOrigin[1] + deltaY - settings.offsetY];
    }

    function boardPoint(doc, point, board, settings) {
        var origin = G.anchor(board.rect, settings.artboardAnchor);
        return [G.pointsToUnit(point[0] - origin[0], settings.unit, settings.designScale, doc),
            G.pointsToUnit(origin[1] - point[1], settings.unit, settings.designScale, doc)];
    }

    function shifted(rect, dx, dy) {
        return [rect[0] + dx, rect[1] + dy, rect[2] + dx, rect[3] + dy];
    }

    function dimensionOf(rect) {
        return [rect[2] - rect[0], rect[1] - rect[3]];
    }

    function sizeLimit(item) {
        if (item.typename === "PathItem" || item.typename === "CompoundPathItem" ||
            item.typename === "PlacedItem" || item.typename === "RasterItem") {
            return "";
        }
        if (item.typename === "TextFrame") {
            return (item.kind === TextType.POINTTEXT || item.kind === TextType.AREATEXT) && !G.linkedText(item) ?
                "" : "Chỉ hỗ trợ chữ điểm và khung chữ độc lập.";
        }
        if (item.typename !== "GroupItem") {
            return "Loại đối tượng này chưa hỗ trợ đồng bộ kích thước.";
        }
        var children = item.pageItems;
        for (var i = 0; i < children.length; i += 1) {
            if (!G.sameItem(children[i].parent, item)) {
                continue;
            }
            var reason = sizeLimit(children[i]);
            if (reason) {
                return "Nhóm có phần tử chưa hỗ trợ: " + reason;
            }
        }
        return "";
    }

    function collectTextLayout(item, layouts) {
        if (item.typename === "TextFrame") {
            var lines = [];
            for (var i = 0; i < item.lines.length; i += 1) {
                lines.push(item.lines[i].contents);
            }
            layouts.push([String(item.kind), item.contents, lines]);
        } else if (item.typename === "GroupItem") {
            var children = item.pageItems;
            for (var j = 0; j < children.length; j += 1) {
                if (G.sameItem(children[j].parent, item)) {
                    collectTextLayout(children[j], layouts);
                }
            }
        }
    }

    function textLayout(item) {
        var layouts = [];
        collectTextLayout(item, layouts);
        return layouts;
    }

    function sizePlan(item, sourceBox, targetBox, settings) {
        var reason = sizeLimit(item);
        if (reason) {
            E.fail(reason);
        }
        var from = dimensionOf(targetBox);
        var to = dimensionOf(sourceBox);
        if (from[0] <= G.epsilon || from[1] <= G.epsilon || to[0] <= G.epsilon || to[1] <= G.epsilon) {
            E.fail("Mẫu và đối tượng đích cần có chiều rộng và chiều cao lớn hơn 0.");
        }
        var sx = to[0] / from[0];
        var sy = to[1] / from[1];
        if (settings.sizeMode === "bothProportional" && !closePoint([from[0] * sx, from[1] * sx], to)) {
            E.fail("Tỷ lệ khác mẫu. Chọn Khớp rộng, Khớp cao hoặc Khớp chính xác Rộng × Cao.");
        }
        if (settings.sizeMode !== "exact") {
            sx = sy = settings.sizeMode === "height" ? sy : sx;
        }
        if (sx < 0.01 || sy < 0.01 || sx > 100 || sy > 100) {
            E.fail("Tỷ lệ thu phóng nằm ngoài khoảng 1–10000%.");
        }
        var wanted = [from[0] * sx, from[1] * sy];
        var unchanged = closePoint(from, wanted);
        return {scale: unchanged ? [1, 1] : [sx, sy], wanted: unchanged ? from : wanted};
    }

    function candidateState(item, geometric, reason) {
        return [G.uuid(item), name(item), G.role(item), geometric, reason, item.typename,
            item.typename === "TextFrame" ? item.contents : null];
    }

    function candidatesState(entries) {
        var out = [];
        for (var i = 0; i < entries.length; i += 1) {
            var entry = entries[i];
            out.push(candidateState(entry.item, entry.geometric, entry.reason));
        }
        return out;
    }

    function targetStep(context, entry, row, key, stamp) {
        var settings = context.settings;
        var doc = context.doc;
        var board = context.boards[row.boardNumber - 1];
        var sizing = settings.purpose === "size";
        var item = entry.item;
        var box, adjustment;
        try {
            box = sizing ? entry.geometric : G.bounds(item, settings.boundsMode);
            if (sizing) {
                row.beforeSize = sizeInUnit(box, doc, settings);
                adjustment = sizePlan(item, context.sourceBox, box, settings);
                adjustment.text = textLayout(item);
            }
        } catch (error) {
            row.status = "blocked";
            row.reason = message(error);
            return null;
        }
        var start = G.anchor(box, settings.objectAnchor);
        var end = sizing ? start : placeOnBoard(context.sourcePoint, context.sourceBoard.rect, board.rect, settings);
        var projected;
        if (sizing) {
            var wanted = adjustment.wanted;
            var factor = adjustment.scale;
            row.afterSize = [G.pointsToUnit(wanted[0], settings.unit, settings.designScale, doc),
                G.pointsToUnit(wanted[1], settings.unit, settings.designScale, doc)];
            row.changes = settings.sizeMode === "exact" ? ["Khớp chính xác Rộng × Cao"] : ["Đổi kích thước theo tỷ lệ"];
            if (adjustment.text.length) {
                row.changes.push("Co giãn chữ sống");
            }
            projected = [start[0] + (box[0] - start[0]) * factor[0],
                start[1] + (box[1] - start[1]) * factor[1],
                start[0] + (box[2] - start[0]) * factor[0],
                start[1] + (box[3] - start[1]) * factor[1]];
        } else {
            row.before = boardPoint(doc, start, board, settings);
            row.after = boardPoint(doc, end, board, settings);
            row.changes = ["Vị trí"];
            projected = shifted(entry.geometric, end[0] - start[0], end[1] - start[1]);
        }
        var assignment = G.artboardOf(projected, doc, context.boards);
        stamp.push([box, start, end, assignment.index, sizing ? adjustment.scale : null, sizing ? adjustment.text : null]);
        if (assignment.index !== board.index) {
            row.status = "blocked";
            row.reason = assignment.reason || "Kết quả sẽ thuộc artboard khác.";
            return null;
        }
        if (sizing ? adjustment.scale[0] === 1 && adjustment.scale[1] === 1 : closePoint(start, end)) {
            row.status = "skip";
            row.reason = sizing ? "Đối tượng đã đúng kích thước." : "Đối tượng đã ở đúng vị trí.";
            return null;
        }
        row.status = "ready";
        return {row: row, key: key, boardIndex: board.index, item: item, start: start, end: end, adjustment: adjustment || null};
    }

    function selectedPlan(context, model, plan) {
        var doc = context.doc;
        var boards = context.boards;
        var items = G.selectedItems(doc);
        plan.selection = items;
        for (var i = 0; i < items.length; i += 1) {
            var item = items[i];
            if (G.findItem(items, item) !== i) {
                continue;
            }
            var row = identity(item);
            row.matches = [];
            row.unit = context.settings.unit;
            row.changes = [];
            plan.indices.push(i);
            plan.preview.rows.push(row);
            var reason = "";
            var box = null;
            var assignment = null;
            if (G.sameItem(item, model)) {
                row.status = "skip";
                reason = "Đối tượng mẫu.";
            } else if (G.hasAncestor(item, [model]) || G.hasAncestor(model, [item])) {
                reason = "Đối tượng nằm trong hoặc chứa mẫu.";
            } else if (G.hasAncestor(item, items)) {
                reason = "Nhóm cha cũng đang được chọn.";
            } else {
                try {
                    reason = objectLimit(item);
                    if (!reason) {
                        box = G.bounds(item, "geometric");
                        assignment = G.artboardOf(box, doc, boards);
                        reason = assignment.reason;
                    }
                } catch (error) {
                    reason = message(error);
                }
            }
            var board = assignment && assignment.index >= 0 ? boards[assignment.index] : null;
            row.boardNumber = board ? board.number : null;
            row.boardName = board ? board.name : "";
            var stamp = [board ? boardState(board) : null, candidateState(item, box, reason)];
            plan.stamps[i] = stamp;
            if (reason) {
                row.status = row.status || "blocked";
                row.reason = reason;
                continue;
            }
            var step = targetStep(context, {item: item, geometric: box}, row, i, stamp);
            if (step) {
                plan.work.push(step);
            }
        }
    }

    function planSync(doc, request) {
        if (!sample || sample.doc != doc) {
            E.fail("Lấy đối tượng làm mẫu trong tài liệu hiện tại trước.");
        }
        var model = sample.item;
        var settings = readRequest(doc, request);
        var sizing = settings.purpose === "size";
        var boards = G.boards(doc);
        var captured;
        try {
            captured = captureState(model, doc, boards);
        } catch (error) {
            E.fail("Mẫu không còn khả dụng. Lấy mẫu lại. " + message(error));
        }
        if (!equivalent(captured.stamp, sample.stamp)) {
            E.fail("Đối tượng mẫu hoặc artboard nguồn đã thay đổi. Lấy mẫu lại.");
        }
        var sourceBoard = captured.board;
        var sourceBox = G.bounds(model, settings.boundsMode);
        if (sizing) {
            var limit = sizeLimit(model);
            if (limit) {
                E.fail("Đối tượng mẫu: " + limit);
            }
            var sourceSize = dimensionOf(sourceBox);
            if (sourceSize[0] <= G.epsilon || sourceSize[1] <= G.epsilon) {
                E.fail("Mẫu cần có chiều rộng và chiều cao lớn hơn 0.");
            }
        }
        var sourcePoint = G.anchor(sourceBox, settings.objectAnchor);
        var source = sourceData(model, sourceBoard, sourceBox, sourcePoint, doc, settings);
        var scope = request.scope || {kind: "all"};
        var selectionScope = scope.kind === "selection" || scope === "selection";
        if (selectionScope && !sizing) {
            E.fail("Phạm vi đối tượng đang chọn dành cho Đồng bộ kích thước.");
        }
        var warnings = [];
        if (sizing && settings.sizeMode === "exact") {
            warnings.push("Khớp chính xác có thể làm thay đổi tỷ lệ hình của đối tượng đích.");
        }
        var common = [sample.version, captured.stamp, sourceBox, sourcePoint, G.canvasFactor(doc),
            settings.purpose, settings.sizeMode, settings.mode, settings.objectAnchor, settings.artboardAnchor,
            settings.boundsMode, settings.unit, settings.designScale, settings.offsetX, settings.offsetY, selectionScope];
        var context = {doc: doc, boards: boards, sourceBoard: sourceBoard, sourceBox: sourceBox,
            sourcePoint: sourcePoint, settings: settings};
        var stamps = {};
        var rows = [];
        var work = [];
        var plan = {common: common, stamps: stamps, indices: [], work: work, settings: settings, boards: boards,
            selection: null, preview: {source: source, rows: rows, count: 0, skipped: [], warnings: warnings}};
        if (selectionScope) {
            selectedPlan(context, model, plan);
            plan.preview.count = work.length;
            return plan;
        }
        var indices = G.targets(doc, scope);
        plan.indices = indices;
        var found = candidates(doc, boards, indices, matcher(request, model));
        plan.preview.skipped = found.skipped;
        var ambiguousUnknown = [];
        for (var k = 0; k < found.unknown.length; k += 1) {
            ambiguousUnknown.push([found.unknown[k].name, found.unknown[k].uuid, found.unknown[k].reason]);
        }
        common.push(ambiguousUnknown);
        for (var i = 0; i < indices.length; i += 1) {
            var index = indices[i];
            var board = boards[index];
            var matched = found.available[index];
            var blocked = found.blocked[index];
            var row = label(board);
            row.role = source.role;
            row.unit = settings.unit;
            row.changes = [];
            rowMatches(row, matched, blocked);
            rows.push(row);
            var stamp = [boardState(board), candidatesState(matched), candidatesState(blocked)];
            stamps[index] = stamp;
            if (index === sourceBoard.index) {
                row.status = "skip";
                row.reason = "Artboard nguồn.";
                continue;
            }
            if (found.unknown.length) {
                row.status = "blocked";
                row.reason = "Có đối tượng khớp chưa xác định được artboard.";
                continue;
            }
            if (blocked.length) {
                row.status = "blocked";
                row.reason = "Có đối tượng giao nhiều artboard hoặc ở vùng chồng nhau.";
                continue;
            }
            if (matched.length > 1) {
                row.status = "duplicate";
                row.reason = "Nhiều đối tượng khớp. Cần xử lý trùng trước.";
                continue;
            }
            if (!matched.length) {
                row.status = "missing";
                row.reason = "Không có đối tượng khớp.";
                continue;
            }
            var entry = matched[0];
            if (entry.reason) {
                row.status = "blocked";
                row.reason = entry.reason;
                continue;
            }
            var step = targetStep(context, entry, row, index, stamp);
            if (step) {
                work.push(step);
            }
        }
        var plannedItems = [];
        for (i = 0; i < work.length; i += 1) {
            plannedItems.push(work[i].item);
        }
        for (i = work.length - 1; i >= 0; i -= 1) {
            if (G.hasAncestor(work[i].item, plannedItems)) {
                work[i].row.status = "blocked";
                work[i].row.reason = "Nhóm cha cũng nằm trong kế hoạch.";
                work.splice(i, 1);
            }
        }
        plan.preview.count = work.length;
        return plan;
    }

    E.commands.scanSync = function (request) {
        return G.withDocumentCoordinates(function () {
            var doc = E.doc();
            var plan = planSync(doc, request);
            var pending = [];
            for (var i = 0; i < plan.work.length; i += 1) {
                pending.push(plan.work[i].key);
            }
            return E.plan.put("sync", doc, request, {
                common: plan.common, stamps: plan.stamps, indices: plan.indices, pending: pending, cursor: 0,
                selection: plan.selection, skipped: plan.preview.rows.length - plan.work.length
            }, plan.preview);
        });
    };

    function scaleItem(item, sx, sy) {
        item.resize(sx * 100, sy * 100, true, true, true, true, 100, Transformation.CENTER);
    }

    function moveAnchor(item, boundsMode, anchor, destination) {
        var current = G.anchor(G.bounds(item, boundsMode), anchor);
        G.translate(item, destination[0] - current[0], destination[1] - current[1]);
    }

    function verifyStep(doc, item, step, plan) {
        var settings = plan.settings;
        var adjustment = step.adjustment;
        var actual = G.bounds(item, settings.boundsMode);
        if (!closePoint(G.anchor(actual, settings.objectAnchor), step.end)) {
            E.fail("Illustrator không trả về điểm neo dự kiến.");
        }
        if (adjustment) {
            if (!closePoint(dimensionOf(actual), adjustment.wanted)) {
                E.fail("Illustrator không trả về kích thước dự kiến.");
            }
            if (adjustment.text.length && !equivalent(textLayout(item), adjustment.text)) {
                E.fail("Kích thước này làm đổi nội dung hoặc cách xuống dòng của chữ.");
            }
        }
        var result = G.artboardOf(G.bounds(item, "geometric"), doc, plan.boards);
        if (result.index !== step.boardIndex) {
            E.fail(result.reason || "Đối tượng ở ngoài artboard đích.");
        }
    }

    function selectionMatches(first, second) {
        if (first.length !== (second ? second.length : 0)) {
            return false;
        }
        for (var i = 0; i < first.length; i += 1) {
            if (!G.sameItem(first[i], second[i])) {
                return false;
            }
        }
        return true;
    }

    function testTextResize(doc, step, plan) {
        var settings = plan.settings;
        var previousSelection = doc.selection;
        var originalSelection = previousSelection && (previousSelection.length || previousSelection.typename) ?
            G.selectedItems(doc) : [];
        var trial = null;
        try {
            trial = step.item.duplicate();
            scaleItem(trial, step.adjustment.scale[0], step.adjustment.scale[1]);
            moveAnchor(trial, settings.boundsMode, settings.objectAnchor, step.end);
            verifyStep(doc, trial, step, plan);
        } catch (error) {
            E.fail("Không thể áp dụng cho chữ. " + message(error));
        } finally {
            try {
                if (trial) {
                    trial.remove();
                }
            } finally {
                if (!selectionMatches(originalSelection, doc.selection)) {
                    doc.selection = null;
                    for (var i = 0; i < originalSelection.length; i += 1) {
                        originalSelection[i].selected = true;
                    }
                }
            }
        }
    }

    function restoreStep(item, step, boundsMode, anchor, originalSize, inverseNeeded) {
        var text = step.adjustment ? step.adjustment.text : [];
        if (originalSize) {
            if (inverseNeeded) {
                var factor = step.adjustment.scale;
                scaleItem(item, 1 / factor[0], 1 / factor[1]);
            }
            var current = dimensionOf(G.bounds(item, boundsMode));
            if (!text.length && !closePoint(current, originalSize)) {
                if (current[0] <= G.epsilon || current[1] <= G.epsilon) {
                    E.fail("Kích thước hiện tại quá nhỏ để khôi phục.");
                }
                scaleItem(item, originalSize[0] / current[0], originalSize[1] / current[1]);
            }
        }
        moveAnchor(item, boundsMode, anchor, step.start);
        var restored = G.bounds(item, boundsMode);
        if (!closePoint(G.anchor(restored, anchor), step.start) ||
            (originalSize && !closePoint(dimensionOf(restored), originalSize)) ||
            (text.length && !equivalent(textLayout(item), text))) {
            E.fail("Không xác minh được kích thước, điểm neo hoặc bố cục chữ ban đầu sau khôi phục.");
        }
    }

    function applyStep(doc, step, plan) {
        var item = step.item;
        var settings = plan.settings;
        var adjustment = step.adjustment;
        var originalSize = null;
        var textScaled = false;
        if (adjustment && adjustment.text.length) {
            testTextResize(doc, step, plan);
        }
        try {
            if (adjustment) {
                originalSize = dimensionOf(G.bounds(item, settings.boundsMode));
                scaleItem(item, adjustment.scale[0], adjustment.scale[1]);
                textScaled = adjustment.text.length > 0;
            }
            moveAnchor(item, settings.boundsMode, settings.objectAnchor, step.end);
            verifyStep(doc, item, step, plan);
        } catch (error) {
            try {
                restoreStep(item, step, settings.boundsMode, settings.objectAnchor, originalSize, textScaled);
            } catch (rollbackError) {
                E.fail(message(error) + " Khôi phục hình học không thành công. " + message(rollbackError));
            }
            throw error;
        }
    }

    E.commands.applySync = function (request) {
        return G.withDocumentCoordinates(function () {
            var doc = E.doc();
            var stored = E.plan.get("sync", doc, request.token);
            var plan = planSync(doc, stored.request);
            var state = stored.state;
            if (!equivalent(plan.common, state.common) || !equivalent(plan.indices, state.indices)) {
                E.fail("Tài liệu, artboard hoặc đối tượng đích đã đổi. Hãy xem kế hoạch lại.");
            }
            if (state.selection) {
                if (state.selection.length !== plan.selection.length) {
                    E.fail("Vùng chọn đã đổi. Hãy xem kế hoạch lại.");
                }
                for (var j = 0; j < state.selection.length; j += 1) {
                    if (!G.sameItem(state.selection[j], plan.selection[j])) {
                        E.fail("Vùng chọn đã đổi. Hãy xem kế hoạch lại.");
                    }
                }
            }
            if (request.index !== undefined && Number(request.index) !== state.cursor) {
                E.fail("Thứ tự áp dụng đã đổi. Hãy xem kế hoạch lại.");
            }
            var compare = state.cursor ? state.pending : state.indices;
            var i;
            for (i = state.cursor || 0; i < compare.length; i += 1) {
                var index = compare[i];
                if (!equivalent(state.stamps[index], plan.stamps[index])) {
                    E.fail(state.selection ? "Đối tượng đang chọn đã đổi. Hãy xem kế hoạch lại." :
                        "Đối tượng đích trên Artboard " + (index + 1) + " đã đổi. Hãy xem kế hoạch lại.");
                }
            }
            var steps = {};
            for (i = 0; i < plan.work.length; i += 1) {
                steps[plan.work[i].key] = plan.work[i];
            }
            var size = request.batchSize === undefined ? state.pending.length : Number(request.batchSize);
            if (!isFinite(size) || size < 0 || (request.batchSize !== undefined && size < 1)) {
                E.fail("Số đối tượng trong mỗi nhóm không hợp lệ.");
            }
            var end = Math.min(state.cursor + (request.batchSize === undefined ? size : Math.min(50, Math.floor(size))), state.pending.length);
            var result = {count: 0, applied: 0, failed: 0, rows: [], skipped: state.cursor ? 0 : state.skipped,
                warnings: state.cursor ? [] : plan.preview.warnings};
            for (i = state.cursor; i < end; i += 1) {
                var step = steps[state.pending[i]];
                if (!step) {
                    E.fail("Đối tượng đích đã thay đổi. Hãy xem kế hoạch lại.");
                }
                var row = step.row;
                try {
                    applyStep(doc, step, plan);
                    result.count += 1;
                    result.applied += 1;
                    row.status = "applied";
                } catch (error) {
                    row.status = "failed";
                    row.reason = message(error);
                    result.failed += 1;
                }
                result.rows.push(row);
                state.cursor = i + 1;
            }
            result.nextIndex = state.cursor;
            result.remaining = state.pending.length - state.cursor;
            result.done = result.remaining === 0;
            if (result.done) {
                E.plan.remove(request.token);
            }
            return result;
        });
    };

    E.commands.cancelSync = function (request) {
        var record = E.plan.get("sync", E.doc(), request.token);
        E.plan.remove(request.token);
        return {appliedOrAttempted: record.state.cursor, remaining: record.state.pending.length - record.state.cursor};
    };

}(EDT));


(function (E) {
    var SAMPLE = null;
    var MAX_SIZE = 1296;
    var MIN_SIZE = 0.1;
    var PT_EPSILON = 0.001;
    var PROP_NAMES = {size: "size", font: "textFont"};

    function contains(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (list[i] === value) { return true; }
        }
        return false;
    }

    function provided(value) {
        return value !== null && typeof value !== "undefined" && value !== "";
    }

    function number(value, label) {
        if ((typeof value !== "number" && typeof value !== "string") ||
                String(value).replace(/^\s+|\s+$/g, "") === "" || !isFinite(Number(value))) {
            E.fail(label + " phải là số.");
        }
        return Number(value);
    }

    function limitSize(value, pointsFactor) {
        if (value < MIN_SIZE || value > MAX_SIZE || !isFinite(value)) {
            E.fail("Cỡ theo pt phải nằm trong khoảng " + (MIN_SIZE * pointsFactor) + "–" + (MAX_SIZE * pointsFactor) + " pt.");
        }
        return value;
    }

    function inputPoints(value, label, pointsFactor) {
        return limitSize(number(value, label) / pointsFactor, pointsFactor);
    }

    function isText(item) {
        return item && (item.typename === "TextFrame" || item.typename === "TextFrameItem");
    }

    function textKind(frame) {
        if (frame.kind === TextType.POINTTEXT) { return "Point Text"; }
        if (frame.kind === TextType.AREATEXT) { return "Area Text"; }
        if (frame.kind === TextType.PATHTEXT) { return "Path Text"; }
        return "Chữ chưa xác định";
    }

    function linked(frame) {
        return Boolean(frame.story && frame.story.textFrames.length > 1);
    }

    function parentNamed(frame, layer) {
        for (var item = frame.parent; item && item.typename !== "Document"; item = item.parent) {
            if (item.typename === "Layer" && item.name === layer) { return true; }
        }
        return false;
    }

    function selected(frame, selection) {
        for (var item = frame; item && item.typename !== "Document"; item = item.parent) {
            for (var i = 0; i < selection.length; i++) {
                if (E.geo.sameItem(item, selection[i])) { return true; }
            }
        }
        return false;
    }

    function nameOf(frame) {
        return frame.name || String(frame.contents).replace(/[\r\n\t]+/g, " ").substr(0, 55) || "(khung chữ rỗng)";
    }

    function fontKey(font) {
        try { return font ? font.name : ""; }
        catch (ignore) { return ""; }
    }

    function sameValue(prop, a, b) {
        if (prop === "font") { return fontKey(a) === fontKey(b); }
        return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < PT_EPSILON;
    }

    function characterState(frame, props) {
        var chars = frame.textRange.characters;
        var rows = [], length = chars.length;
        for (var i = 0; i < length; i++) {
            var attr = chars[i].characterAttributes;
            var row = {};
            for (var j = 0; j < props.length; j++) {
                row[props[j]] = attr[PROP_NAMES[props[j]]];
            }
            rows.push(row);
        }
        return rows;
    }

    E.commands.captureTextStyle = function () {
        var doc = E.doc();
        var selection = E.geo.selectedItems(doc);
        if (selection.length !== 1 || !isText(selection[0])) {
            E.fail("Chọn đúng một khung chữ bằng công cụ Selection.");
        }
        var frame = selection[0];
        var type = textKind(frame);
        if ((type !== "Point Text" && type !== "Area Text") || linked(frame)) {
            E.fail("Chọn Point Text hoặc Area Text độc lập để lấy cỡ mẫu.");
        }
        var sizes = characterState(frame, ["size"]);
        if (!sizes.length) { E.fail("Khung mẫu cần có ít nhất một ký tự."); }
        var size = limitSize(sizes[0].size, E.geo.canvasFactor(doc));
        for (var i = 1; i < sizes.length; i++) {
            if (!sameValue("size", size, sizes[i].size)) { E.fail("Khung mẫu có nhiều cỡ chữ. Hãy chọn khung chỉ có một cỡ."); }
        }
        SAMPLE = {doc: doc, size: size};
        return {size: rounded(size * E.geo.canvasFactor(doc)), name: nameOf(frame)};
    };

    function textOperation(requested, doc) {
        var op = requested || {};
        var result = {kind: op.kind, pointsFactor: E.geo.canvasFactor(doc)};
        switch (op.kind) {
        case "absolute":
            result.size = inputPoints(op.value, "Cỡ chữ", result.pointsFactor);
            break;
        case "delta":
            result.factor = number(op.value, "Mức thay đổi") / result.pointsFactor;
            break;
        case "percent":
            result.factor = number(op.value, "Tỷ lệ phần trăm");
            if (result.factor <= 0) { E.fail("Tỷ lệ phần trăm phải lớn hơn 0."); }
            break;
        case "sample":
            if (!SAMPLE || SAMPLE.doc !== doc) { E.fail("Lấy mẫu chữ trong tài liệu này trước."); }
            result.size = SAMPLE.size;
            break;
        default:
            E.fail("Chọn đặt cỡ, tăng/giảm theo pt, tỷ lệ phần trăm hoặc cỡ mẫu.");
        }
        return result;
    }

    function readScope(doc, scope) {
        var kind = scope.kind || "selection";
        var result = { kind: kind };
        if (kind === "selection") {
            result.selection = E.geo.selectedItems(doc);
        } else if (kind === "active" || kind === "list" || kind === "marked") {
            result.boards = E.geo.targets(doc, { kind: kind, list: scope.ids || scope.list || scope.boards });
        } else if (kind === "layer" || kind === "role") {
            if (!scope[kind]) { E.fail(kind === "layer" ? "Nhập tên layer." : "Nhập vai trò."); }
            result.key = String(scope[kind]);
        } else if (kind !== "document") {
            E.fail("Phạm vi chữ không hợp lệ.");
        }
        return result;
    }

    function inScope(frame, scope) {
        if (scope.kind === "selection") { return selected(frame, scope.selection); }
        if (scope.kind === "layer") { return parentNamed(frame, scope.key); }
        if (scope.kind === "role") { return E.geo.role(frame) === scope.key; }
        return true;
    }

    function getFilters(raw, pointsFactor) {
        var filters = raw || {};
        var result = {};
        var fields = ["font", "keyword", "name", "layer", "role"];
        for (var i = 0; i < fields.length; i++) {
            if (filters[fields[i]]) { result[fields[i]] = String(filters[fields[i]]); }
        }
        if (provided(filters.size)) {
            result.size = inputPoints(filters.size, "Cỡ chữ lọc", pointsFactor);
        }
        return result;
    }

    function lower(value) {
        return String(value).toLowerCase();
    }

    function matchesFrame(frame, filters) {
        return (!filters.keyword || lower(frame.contents).indexOf(lower(filters.keyword)) !== -1) &&
            (!filters.name || lower(frame.name).indexOf(lower(filters.name)) !== -1) &&
            (!filters.layer || parentNamed(frame, filters.layer)) &&
            (!filters.role || E.geo.role(frame) === filters.role);
    }

    function matchesCharacter(values, filters) {
        if (!filters.font && typeof filters.size === "undefined") { return true; }
        var fontMatch = !filters.font || lower(fontKey(values.font)) === lower(filters.font);
        if (!fontMatch && values.font) {
            try { fontMatch = lower(values.font.family) === lower(filters.font); }
            catch (ignore) {}
        }
        return fontMatch && (typeof filters.size === "undefined" || sameValue("size", values.size, filters.size));
    }

    function sizeTarget(op, before) {
        if (op.kind === "delta") { return before + op.factor; }
        if (op.kind === "percent") { return before * op.factor / 100; }
        return op.size;
    }

    function reasonUnsupported(frame, mode) {
        var reason = E.geo.lockedReason(frame);
        if (reason) { return reason; }
        var type = textKind(frame);
        if (type !== "Point Text" && type !== "Area Text") {
            return "Chỉ xử lý Point Text và Area Text."; 
        }
        if (linked(frame)) { return "Bỏ qua khung chữ liên kết để giữ các khung khác."; }
        if (mode === "visibleText") {
            if (!String(frame.contents).replace(/\s/g, "")) { return "Khung không có ký tự nhìn thấy để đo."; }
            for (var parent = frame.parent; parent && parent.typename === "GroupItem"; parent = parent.parent) {
                if (parent.clipped) { return "Đo phần chữ nhìn thấy trong nhóm clipping chưa được xác minh."; }
            }
        }
        return "";
    }

    function rounded(value) {
        return Math.round(value * 1000) / 1000;
    }

    function sameRect(a, b) {
        for (var i = 0; i < 4; i++) {
            if (Math.abs(a[i] - b[i]) > PT_EPSILON) { return false; }
        }
        return true;
    }

    function scanMode(mode) {
        if (mode === "ink" || mode === "visibleText") { return "textFrame"; }
        return mode;
    }

    function normalizedMode(mode) {
        switch (mode) {
        case "geometric": return "geometric";
        case "visible": return "visible";
        case "ink":
        case "visibleText": return "visibleText";
        case "frame":
        case "textFrame": return "textFrame";
        default: E.fail("Chọn kiểu bounds chữ hợp lệ.");
        }
    }

    function collectRow(frame, request, op, filters) {
        var mode = normalizedMode(request.boundsMode || "geometric");
        var row = {status: "skipped", name: nameOf(frame), type: textKind(frame), artboards: [],
            before: null, after: null, reason: reasonUnsupported(frame, mode)};
        if (row.reason) { return {row: row}; }
        var props = filters.font ? ["size", "font"] : ["size"];
        var states = characterState(frame, props);
        var edits = [], before = [], after = [];
        for (var i = 0; i < states.length; i++) {
            var state = states[i];
            if (!matchesCharacter(state, filters)) { continue; }
            var size = limitSize(sizeTarget(op, state.size), op.pointsFactor);
            var current = rounded(state.size * op.pointsFactor);
            var next = rounded(size * op.pointsFactor);
            if (!contains(before, current)) { before.push(current); }
            if (!contains(after, next)) { after.push(next); }
            if (!sameValue("size", size, state.size)) { edits.push({index: i, before: state.size, after: size}); }
        }
        if (!before.length && states.length && (filters.font || provided(filters.size))) { return null; }
        if (before.length) { row.before = before.join(" / ") + " pt"; row.after = after.join(" / ") + " pt"; }
        if (!edits.length) {
            row.reason = states.length ? "Các ký tự đã đúng cỡ." : "Khung chữ rỗng.";
            return {row: row};
        }
        row.status = "ready";
        row.reason = mode === "visibleText" ? "Đo phần chữ thấy bằng bản sao khi áp dụng." : "";
        var job = {frame: frame, uuid: E.geo.uuid(frame), rect: E.geo.bounds(frame, scanMode(mode)), content: String(frame.contents),
            props: props, states: states, edits: edits, name: frame.name, role: E.geo.role(frame), mode: mode};
        return {row: row, job: job};
    }

    function oneBased(indices) {
        var result = [];
        for (var i = 0; i < indices.length; i++) { result.push(indices[i] + 1); }
        return result;
    }

    function errorText(error) {
        return error && error.message ? error.message : String(error);
    }

    function queryText(doc, request, op, filters) {
        var scope = readScope(doc, request.scope || {});
        var frames = doc.textFrames;
        var rows = [], jobs = [], affected = [], boards = E.geo.boards(doc);
        var length = frames.length;
        for (var i = 0; i < length; i++) {
            var frame = frames[i];
            if (!inScope(frame, scope) || !matchesFrame(frame, filters)) { continue; }
            var loc = { index: -1, indices: [] };
            try { loc = E.geo.artboardOf(E.geo.bounds(frame, "geometric"), doc, boards); }
            catch (ignore) {}
            if (scope.boards && !contains(scope.boards, loc.index)) {
                var ambiguous = false;
                if (loc.index < 0) {
                    for (var k = 0; k < loc.indices.length; k++) {
                        if (contains(scope.boards, loc.indices[k])) { ambiguous = true; }
                    }
                }
                if (ambiguous) {
                    rows.push({ status: "skipped", name: nameOf(frame), type: textKind(frame),
                        artboards: oneBased(loc.indices), reason: loc.reason || "Khung giao nhiều artboard." });
                }
                continue;
            }
            try {
                var entry = collectRow(frame, request, op, filters);
                if (!entry) { continue; }
                var indices = loc.index < 0 ? loc.indices : [loc.index];
                entry.row.artboards = oneBased(indices);
                if (entry.job) {
                    entry.job.rowIndex = rows.length;
                    entry.job.artboards = entry.row.artboards;
                    jobs.push(entry.job);
                    for (var j = 0; j < indices.length; j++) {
                        if (!contains(affected, indices[j])) { affected.push(indices[j]); }
                    }
                    if (loc.index < 0) {
                        entry.row.reason += (entry.row.reason ? " " : "") + (loc.reason || "Khung không thuộc riêng một artboard.");
                    }
                }
                rows.push(entry.row);
            } catch (error) {
                rows.push({ status: "skipped", name: nameOf(frame), type: textKind(frame),
                    artboards: oneBased(loc.indices), reason: errorText(error) });
            }
        }
        return { rows: rows, jobs: jobs, artboards: affected, boards: boards };
    }

    E.commands.scanText = function (request) {
        var doc = E.doc();
        var op = textOperation(request.operation, doc);
        var filters = getFilters(request.filters, op.pointsFactor);
        var anchor = request.anchor || "tl";
        if (!/^(tl|tc|tr|ml|mc|mr|bl|bc|br)$/.test(anchor)) { E.fail("Điểm neo chữ không hợp lệ."); }
        var warnings = [];
        if (op.pointsFactor === 10) {
            warnings.push("Large Canvas: cỡ chữ hiển thị theo pt của tài liệu Illustrator.");
        }
        if (scanMode(request.boundsMode) !== request.boundsMode && request.boundsMode) {
            warnings.push("Quét chỉ đọc khung chữ. Khi áp dụng, đo outline trên bản sao tạm. Hiệu ứng sống có thể khác phần outline.");
        }
        return E.geo.withDocumentCoordinates(function () {
            var plan = queryText(doc, request, op, filters);
            var preview = { total: plan.jobs.length, artboardCount: plan.artboards.length, rows: plan.rows, warnings: warnings };
            return E.plan.put("text", doc, request, { jobs: plan.jobs, boards: plan.artboards, boardState: plan.boards,
                skipped: plan.rows.length - plan.jobs.length, op: op, anchor: anchor, cursor: 0, filters: filters, rows: plan.rows }, preview);
        });
    };

    function statesMatch(a, b, props) {
        if (a.length !== b.length) { return false; }
        for (var i = 0; i < a.length; i++) {
            for (var j = 0; j < props.length; j++) {
                var prop = props[j];
                if (!sameValue(prop, a[i][prop], b[i][prop])) { return false; }
            }
        }
        return true;
    }

    function sameList(a, b) { return a.join(",") === b.join(","); }

    function validateJob(job, doc, boards) {
        var frame = job.frame;
        var rect = E.geo.bounds(frame, scanMode(job.mode));
        var location = E.geo.artboardOf(E.geo.bounds(frame, "geometric"), doc, boards);
        var indices = location.index < 0 ? location.indices : [location.index];
        var reason = reasonUnsupported(frame, job.mode);
        if (reason || (job.uuid && frame.uuid !== job.uuid) || job.name !== frame.name ||
                job.role !== E.geo.role(frame) || String(frame.contents) !== job.content || !sameRect(job.rect, rect) ||
                !sameList(oneBased(indices), job.artboards) ||
                !statesMatch(job.states, characterState(frame, job.props), job.props)) {
            E.fail("Khung chữ đã thay đổi sau khi quét: " + nameOf(frame) + ". Hãy quét lại.");
        }
    }

    function sameJob(a, b) {
        return a.frame === b.frame || (a.uuid && a.uuid === b.uuid);
    }

    function validateInitialPlan(doc, plan) {
        var fresh = queryText(doc, plan.request, plan.state.op, plan.state.filters);
        var jobs = plan.state.jobs;
        if (fresh.jobs.length !== jobs.length || !sameList(fresh.artboards, plan.state.boards)) {
            E.fail("Phạm vi hoặc đối tượng đã thay đổi sau khi quét. Hãy quét lại.");
        }
        for (var i = 0; i < jobs.length; i++) {
            if (!sameJob(jobs[i], fresh.jobs[i])) { E.fail("Phạm vi chữ đã thay đổi. Hãy quét lại."); }
            if (jobs[i].name !== fresh.jobs[i].name || jobs[i].role !== fresh.jobs[i].role ||
                    jobs[i].content !== fresh.jobs[i].content || !sameRect(jobs[i].rect, fresh.jobs[i].rect) ||
                    !sameList(jobs[i].artboards, fresh.jobs[i].artboards) ||
                    !statesMatch(jobs[i].states, fresh.jobs[i].states, jobs[i].props)) {
                E.fail("Khung chữ đã thay đổi sau khi quét: " + nameOf(jobs[i].frame) + ". Hãy quét lại.");
            }
        }
    }

    function moveToAnchor(frame, originalAnchor, mode, anchorKey) {
        var current = E.geo.anchor(E.geo.bounds(frame, mode), anchorKey);
        var dx = originalAnchor[0] - current[0], dy = originalAnchor[1] - current[1];
        if (Math.abs(dx) > PT_EPSILON || Math.abs(dy) > PT_EPSILON) {
            E.geo.translate(frame, dx, dy);
        }
    }

    function applyOne(job, anchor) {
        var frame = job.frame, count = 0;
        var chars = frame.textRange.characters;
        var originalAnchor = E.geo.anchor(E.geo.bounds(frame, job.mode), anchor);
        try {
            while (count < job.edits.length) {
                var edit = job.edits[count++];
                chars[edit.index].characterAttributes.size = edit.after;
            }
            moveToAnchor(frame, originalAnchor, job.mode, anchor);
        } catch (error) {
            try {
                while (count > 0) {
                    var previous = job.edits[--count];
                    chars[previous.index].characterAttributes.size = previous.before;
                }
                moveToAnchor(frame, originalAnchor, job.mode, anchor);
            } catch (restoreError) {
                E.fail(errorText(error) + " / Khôi phục chưa hoàn tất: " + errorText(restoreError));
            }
            throw error;
        }
    }

    E.commands.applyText = function (request) {
        var doc = E.doc();
        var plan = E.plan.get("text", doc, request.token);
        var state = plan.state;
        return E.geo.withDocumentCoordinates(function () {
            var start = state.cursor, count = state.jobs.length;
            if (state.op.pointsFactor !== E.geo.canvasFactor(doc)) { E.fail("Hệ số canvas đã đổi. Hãy quét lại."); }
            var boards = E.geo.boards(doc);
            if (!boardsMatch(state.boardState, boards)) { E.fail("Artboard đã thay đổi. Hãy quét lại."); }
            if (!start) { validateInitialPlan(doc, plan); }
            var batch = provided(request.batchSize) ? number(request.batchSize, "Số đối tượng mỗi nhóm") : Math.max(1, count);
            if (batch < 1 || Math.floor(batch) !== batch) { E.fail("Số đối tượng mỗi nhóm phải là số nguyên dương."); }
            var end = Math.min(count, start + batch);
            if (start) {
                for (var i = start; i < end; i++) { validateJob(state.jobs[i], doc, boards); }
            }
            var rows = [], applied = 0, failed = 0;
            while (state.cursor < end) {
                var job = state.jobs[state.cursor++];
                var oldRow = state.rows[job.rowIndex];
                var row = { name: oldRow.name, type: oldRow.type, artboards: oldRow.artboards, rowIndex: job.rowIndex };
                try {
                    applyOne(job, state.anchor);
                    row.status = "applied";
                    applied++;
                } catch (error) {
                    row.status = "failed";
                    row.reason = errorText(error);
                    failed++;
                }
                rows.push(row);
            }
            var done = state.cursor >= count;
            if (done) { E.plan.remove(request.token); }
            return { done: done, remaining: count - state.cursor, applied: applied, failed: failed,
                skipped: start ? 0 : state.skipped, rows: rows };
        });
    };

    function boardsMatch(a, b) {
        if (a.length !== b.length) { return false; }
        for (var i = 0; i < a.length; i++) {
            if (a[i].name !== b[i].name || !sameRect(a[i].rect, b[i].rect)) { return false; }
        }
        return true;
    }

    E.commands.cancelText = function (request) {
        E.plan.get("text", E.doc(), request.token);
        E.plan.remove(request.token);
        return { cancelled: true };
    };

}(EDT));


(function (E) {
    var G = E.geo;
    var CANVAS_SPAN = 16380;
    var MIN_FILL_SIZE = 0.1;
    var ARTWORK_CHECK_SIZE = 96;
    var ARTWORK_CHECK_MS = 180;
    var CHAR_PROPS = ["size", "tracking", "autoLeading", "leading", "horizontalScale",
        "verticalScale", "baselineShift", "rotation", "capitalization", "strokeWeight"];
    var PARA_PROPS = ["justification", "autoLeadingAmount", "leftIndent", "rightIndent",
        "firstLineIndent", "spaceBefore", "spaceAfter", "hyphenation"];
    var LABEL = "Mẫu";

    function trim(value) {
        return String(value).replace(/^\s+|\s+$/g, "");
    }

    function parseList(raw) {
        if (typeof raw !== "string" || raw.length > 120000) {
            E.fail("Nhập danh sách văn bản có tối đa 120.000 ký tự.");
        }
        var parts = raw.replace(/\r\n?|\u2028|\u2029/g, "\n").split(";");
        var entries = [];
        for (var i = 0; i < parts.length; i++) {
            var value = trim(parts[i]);
            if (!value) continue;
            if (value.length > 3000 || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value)) {
                E.fail("Mục " + (i + 1) + " quá dài hoặc chứa ký tự điều khiển.");
            }
            entries.push(value);
        }
        if (!entries.length) E.fail("Dán ít nhất một mục. Dùng dấu ; để phân cách các mục.");
        return entries;
    }

    function bounded(value, defaultValue, min, max, name, integer) {
        if (value === undefined) return defaultValue;
        if ((typeof value !== "number" && typeof value !== "string") || !trim(value)) {
            E.fail(name + " phải là số.");
        }
        var number = Number(value);
        if (!isFinite(number) || number < min || number > max || (integer && Math.floor(number) !== number)) {
            E.fail(name + " phải nằm trong khoảng " + min + "–" + max + (integer ? " và là số nguyên." : "."));
        }
        return number;
    }

    function snapshotProperties(object, properties) {
        var result = [];
        for (var i = 0; i < properties.length; i++) {
            try {
                var value = object[properties[i]];
                result.push(value === undefined ? null : String(value));
            } catch (unavailable) {
                result.push(null);
            }
        }
        return result;
    }

    function colorState(color) {
        if (!color) return null;
        return [color.typename, snapshotProperties(color,
            ["red", "green", "blue", "cyan", "magenta", "yellow", "black", "gray", "l", "a", "b", "tint"]),
            color.typename === "SpotColor" ? color.spot.name : null,
            color.typename === "GradientColor" ? color.gradient.name : null,
            color.typename === "PatternColor" ? color.pattern.name : null];
    }

    function characterStamp(attributes) {
        var properties = snapshotProperties(attributes, CHAR_PROPS);
        properties.push(attributes.textFont.name, colorState(attributes.fillColor), colorState(attributes.strokeColor));
        return E.json.stringify(properties);
    }

    function checkTextStyle(frame) {
        var characters = frame.textRange.characters;
        var paragraphs = frame.paragraphs;
        var characterCount = characters.length;
        var paragraphCount = paragraphs.length;
        var charStamp = null;
        var paraStamp = null;
        var style;
        var i, current, attributes;
        for (i = 0; i < characterCount; i++) {
            var character = characters[i];
            if (/^[\r\n]+$/.test(character.contents)) continue;
            attributes = character.characterAttributes;
            current = characterStamp(attributes);
            if (charStamp === null) {
                style = { font: String(attributes.textFont.name), size: Number(attributes.size) };
                charStamp = current;
            } else if (charStamp !== current) {
                E.fail("Khung chữ mẫu cần dùng một font, một cỡ và một kiểu chữ thống nhất.");
            }
        }
        if (!style || !style.font || !isFinite(style.size) || style.size <= 0 || !trim(frame.contents)) {
            E.fail("Khung chữ mẫu cần có nội dung và font hợp lệ.");
        }
        for (i = 0; i < paragraphCount; i++) {
            var paragraph = paragraphs[i];
            if (!trim(paragraph.contents)) continue;
            current = E.json.stringify(snapshotProperties(paragraph.paragraphAttributes, PARA_PROPS));
            if (paraStamp === null) paraStamp = current;
            else if (paraStamp !== current) E.fail("Các đoạn trong khung chữ mẫu cần có cùng kiểu căn và định dạng đoạn.");
        }
        style.fingerprint = [charStamp, paraStamp];
        return style;
    }

    function matchesTextStyle(frame, expected) {
        try {
            var range = frame.textRange;
            if (characterStamp(range.characterAttributes) === expected[0] &&
                    E.json.stringify(snapshotProperties(range.paragraphAttributes, PARA_PROPS)) === expected[1]) {
                return true;
            }
        } catch (unsupportedRangeAttributes) { }
        var actual = checkTextStyle(frame).fingerprint;
        return actual[0] === expected[0] && actual[1] === expected[1];
    }

    function checkSelectedFrame(frame) {
        if (frame.typename !== "TextFrame") {
            E.fail("Chỉ chọn các khung chữ còn chỉnh sửa được trên artboard mẫu. Giữ Shift để chọn thêm khung chữ.");
        }
        if ((frame.kind !== TextType.POINTTEXT && frame.kind !== TextType.AREATEXT) || G.linkedText(frame)) {
            E.fail("Chọn chữ điểm hoặc chữ vùng độc lập. Chữ chạy theo đường dẫn và chữ nối nhiều khung chưa được hỗ trợ.");
        }
        var locked = G.lockedReason(frame);
        if (locked) E.fail(locked);
    }

    function firstStyle(frame, contents) {
        var index = contents.search(/[^\r\n]/);
        if (index < 0 || !trim(contents)) E.fail("Khung chữ mẫu cần có nội dung và font hợp lệ.");
        var attributes = frame.textRange.characters[index].characterAttributes;
        var font = attributes.textFont;
        var size = Number(attributes.size);
        if (!font || !font.name || !isFinite(size) || size <= 0) {
            E.fail("Khung chữ mẫu cần có nội dung và font hợp lệ.");
        }
        return {font: String(font.name), size: size};
    }

    function orientation(frame) {
        var matrix = frame.matrix;
        return [matrix.mValueA, matrix.mValueB, matrix.mValueC, matrix.mValueD];
    }

    function keepsOrientation(frame, reference) {
        var actual = orientation(frame);
        for (var i = 0; i < actual.length; i++) {
            if (Math.abs(actual[i] - reference[i]) > G.epsilon) return false;
        }
        return true;
    }

    function children(group) {
        var output = [];
        var items = group.pageItems;
        for (var i = 0; i < items.length; i++) {
            if (G.sameItem(items[i].parent, group)) output.push(items[i]);
        }
        return output;
    }

    function locator(frame, resolvePath) {
        var item = frame;
        var path = [];
        while (item.parent.typename === "GroupItem") {
            var parent = item.parent;
            if (resolvePath) {
                var index = G.findItem(children(parent), item);
                if (index < 0) E.fail("Không xác định được khung chữ trong nhóm mẫu.");
                path.unshift(index);
            }
            item = parent;
        }
        if (item.parent.typename !== "Layer" && item.parent.typename !== "Document") {
            E.fail("Không xác định được cấu trúc chứa khung chữ mẫu.");
        }
        return {root: item, path: path};
    }

    function textCopy(root, path) {
        var item = root;
        for (var i = 0; i < path.length; i++) {
            if (item.typename !== "GroupItem") E.fail("Cấu trúc nhóm trong bản sao không khớp mẫu.");
            item = children(item)[path[i]];
            if (!item) E.fail("Không tìm thấy khung chữ trong nhóm vừa sao chép.");
        }
        if (item.typename !== "TextFrame") E.fail("Không tìm thấy khung chữ đúng loại trong bản sao.");
        return item;
    }

    function startArtworkCheck(doc, boards, board) {
        var envelope = null;
        var occupied = [];
        for (var i = 0; i < boards.length; i++) {
            envelope = G.combine(envelope, boards[i].rect);
            occupied.push(boards[i].rect);
        }
        return {
            roots: [], footprint: board.rect, occupied: occupied, envelope: envelope,
            jobs: [{ layers: doc.layers, index: 0, length: doc.layers.length }], checked: 0
        };
    }

    function addArtwork(item, art, doc, boards, board) {
        var type = item.typename;
        if (item.hidden || (type === "PathItem" && item.guides)) return;
        // Native bounds keep groups opaque; only clip masks require a narrower box.
        var clipped = type === "GroupItem" && item.clipped;
        var bounds = clipped ? G.bounds(item, "visible") : G.rect(item.visibleBounds);
        var meetsSource = G.intersects(bounds, board.rect);
        var owner = meetsSource ? G.artboardOf(bounds, doc, boards).index : -1;
        if (meetsSource && owner !== board.index && type === "GroupItem" && !clipped) {
            // A nested mask can make a group's native bounds look larger than the rendered artwork.
            bounds = G.bounds(item, "visible");
            meetsSource = G.intersects(bounds, board.rect);
            owner = meetsSource ? G.artboardOf(bounds, doc, boards).index : -1;
        }
        art.occupied.push(bounds);
        art.envelope = G.combine(art.envelope, bounds);
        if (!meetsSource) return;
        if (owner !== board.index) {
            E.fail("Có artwork của mẫu nằm trên nhiều artboard. Hãy tách hoặc cắt phần giao trước khi nhân bản.");
        }
        if (typeof item.duplicate !== "function" || typeof item.translate !== "function") {
            E.fail("Illustrator không hỗ trợ nhân bản một đối tượng trên artboard mẫu (" + type + ").");
        }
        art.roots.push(item);
        art.footprint = G.combine(art.footprint, bounds);
    }

    function checkArtwork(art, doc, boards, board, incremental) {
        var remaining = incremental ? ARTWORK_CHECK_SIZE : Infinity;
        var stopAt = incremental ? new Date().getTime() + ARTWORK_CHECK_MS : Infinity;
        while (art.jobs.length && remaining > 0 && new Date().getTime() < stopAt) {
            var job = art.jobs[art.jobs.length - 1];
            var collection = job.layers || job.items;
            if (job.index >= job.length) {
                if (collection.length !== job.length) E.fail("Danh sách artwork đã thay đổi. Hãy xem trước lại.");
                art.jobs.pop();
                continue;
            }
            var object = collection[job.index++];
            remaining--;
            if (!object) E.fail("Danh sách artwork đã thay đổi. Hãy xem trước lại.");
            if (job.layers) {
                if (object.visible) {
                    var items = object.pageItems;
                    var layers = object.layers;
                    art.jobs.push({ layers: layers, index: 0, length: layers.length });
                    art.jobs.push({ items: items, index: 0, length: items.length, owner: object });
                }
            } else if (G.sameItem(object.parent, job.owner)) {
                addArtwork(object, art, doc, boards, board);
                art.checked++;
            }
        }
        return !art.jobs.length;
    }

    function artboardSettings(board) {
        return {rulerOrigin: board.rulerOrigin, rulerPAR: board.rulerPAR, showCenter: board.showCenter,
            showCrossHairs: board.showCrossHairs, showSafeAreas: board.showSafeAreas};
    }

    function boardSnapshot(boards) {
        return E.json.stringify(boards);
    }

    function template(doc, boards, anchor, validateStyles) {
        var selected = G.selectedItems(doc);
        var frames = [];
        var stamps = [];
        var board;
        for (var i = 0; i < selected.length; i++) {
            var frame = selected[i];
            checkSelectedFrame(frame);
            var bounds = G.bounds(frame, "frame");
            var location = G.artboardOf(bounds, doc, boards);
            if (location.index < 0) E.fail("Khung chữ mẫu " + (i + 1) + ". " + location.reason);
            if (board && board.index !== location.index) {
                E.fail("Chọn các khung chữ nằm trên cùng một artboard mẫu.");
            }
            board = boards[location.index];
            var contents = frame.contents;
            var summary = firstStyle(frame, contents);
            var transform = orientation(frame);
            var marked = locator(frame, validateStyles);
            var style = validateStyles ? checkTextStyle(frame) : summary;
            frames.push({frame: frame, root: marked.root, path: marked.path, style: style, transform: transform,
                anchor: G.anchor(bounds, anchor)});
            stamps.push(E.json.stringify([G.uuid(frame), G.uuid(marked.root), frame.kind, contents, bounds,
                summary.font, summary.size, transform]));
        }
        var settings = artboardSettings(doc.artboards[board.index]);
        return {frames: frames, board: board, settings: settings,
            stamp: E.json.stringify([stamps.sort(), board, settings])};
    }

    function shift(box, dx, dy) {
        return [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy];
    }

    function fits(box, boundary) {
        return box[0] >= boundary[0] - G.epsilon && box[1] <= boundary[1] + G.epsilon &&
            box[2] <= boundary[2] + G.epsilon && box[3] >= boundary[3] - G.epsilon;
    }

    function layout(doc, boards, source, count, columns, gapMm) {
        var art = source.art;
        var gap = G.unitToPoints(gapMm, "mm", 1, doc);
        var w = art.footprint[2] - art.footprint[0];
        var h = art.footprint[1] - art.footprint[3];
        var gridW = Math.min(columns, count) * (w + gap) - gap;
        var gridH = Math.ceil(count / columns) * (h + gap) - gap;
        if (gridW >= CANVAS_SPAN || gridH >= CANVAS_SPAN) {
            E.fail("Lưới vượt giới hạn canvas. Giảm số cột, khoảng cách hoặc chia danh sách thành từng tài liệu.");
        }
        var env = art.envelope;
        // Use the first artboard to prefer a side with room. Artboards.add is the final canvas check.
        var centre = G.anchor(boards[0].rect, "mc");
        var half = CANVAS_SPAN / 2;
        var limit = [centre[0] - half, centre[1] + half, centre[0] + half, centre[1] - half];
        var x = Math.max(limit[0], Math.min(art.footprint[0], limit[2] - gridW));
        var y = Math.min(limit[1], Math.max(art.footprint[1], limit[3] + gridH));
        var options = [[env[2] + gap, y], [x, env[3] - gap], [env[0] - gap - gridW, y],
            [x, env[1] + gap + gridH]];
        var start = options[0];
        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            if (fits([option[0], option[1], option[0] + gridW, option[1] - gridH], limit)) {
                start = option;
                break;
            }
        }
        var locations = [];
        for (i = 0; i < count; i++) {
            var dx = start[0] + (i % columns) * (w + gap) - art.footprint[0];
            var dy = start[1] - Math.floor(i / columns) * (h + gap) - art.footprint[1];
            locations.push({dx: dx, dy: dy, rect: shift(source.board.rect, dx, dy),
                footprint: shift(art.footprint, dx, dy)});
        }
        return locations;
    }

    function rowsFor(entries, boards) {
        var names = {};
        var i;
        for (i = 0; i < boards.length; i++) names["name:" + boards[i].name] = true;
        var digits = Math.max(2, String(entries.length).length);
        var rows = [];
        for (i = 0; i < entries.length; i++) {
            var order = ("000" + (i + 1)).slice(-digits);
            var label = trim(entries[i].replace(/\s+/g, " ")).substr(0, 88).replace(/[\uD800-\uDBFF]$/, "");
            var base = order + " - " + (label || LABEL);
            var name = base;
            var suffix = 2;
            while (names["name:" + name]) name = base + " (" + (suffix++) + ")";
            names["name:" + name] = true;
            rows.push({name: name, text: entries[i], status: "ready", boardNumber: boards.length + i + 1});
        }
        return rows;
    }

    function unlockLayers(items, locked) {
        for (var i = 0; i < items.length; i++) {
            var stack = [];
            var parent = items[i].parent;
            while (parent.typename === "Layer") {
                if (parent.locked) stack.push(parent);
                parent = parent.parent;
            }
            for (var j = stack.length - 1; j >= 0; j--) {
                stack[j].locked = false;
                locked.push(stack[j]);
            }
        }
    }

    function restoreLayers(locked) {
        var error = null;
        for (var i = locked.length - 1; i >= 0; i--) {
            try { locked[i].locked = true; }
            catch (lockError) { error = E.errorMessage(lockError); }
        }
        if (error) E.fail("Không thể khôi phục khóa lớp. " + error);
    }

    function restoreSelection(doc, frames) {
        var current = doc.selection || [];
        var intact = current.length === frames.length;
        var i;
        for (i = 0; intact && i < frames.length; i++) {
            intact = G.findItem(current, frames[i].frame) >= 0;
        }
        if (intact) return;
        doc.selection = null;
        for (i = 0; i < frames.length; i++) frames[i].frame.selected = true;
    }

    function textOverflow(frame, board) {
        var area = frame.kind === TextType.AREATEXT;
        if (area) {
            var lines = frame.lines;
            if (!lines.length || lines[lines.length - 1].end < frame.textRange.end) {
                return "Nội dung vượt khung chữ vùng.";
            }
        }
        if (fits(G.bounds(frame, "visible"), board)) return "";
        // An area frame can cross the edge even when all its printed text fits.
        if (area && fits(G.bounds(frame, "ink"), board)) return "";
        return "Chữ vượt mép artboard.";
    }

    function positionPointText(frame, anchor, position) {
        if (frame.kind !== TextType.POINTTEXT) return;
        var actual = G.anchor(G.bounds(frame, "geometric"), anchor);
        G.translate(frame, position[0] - actual[0], position[1] - actual[1]);
    }

    function setFillSize(frame, size, anchor, position) {
        frame.textRange.characterAttributes.size = size;
        positionPointText(frame, anchor, position);
    }

    function fitFilledText(frame, board, originalSize, anchor, position) {
        positionPointText(frame, anchor, position);
        var overflow = textOverflow(frame, board);
        if (!overflow) return "";

        if (originalSize > MIN_FILL_SIZE) {
            var low = MIN_FILL_SIZE;
            var high = originalSize;
            setFillSize(frame, low, anchor, position);
            if (!textOverflow(frame, board)) {
                // Keep a known fitting size while searching for the largest one.
                for (var i = 0; i < 18 && high - low > 0.01; i++) {
                    var size = (low + high) / 2;
                    setFillSize(frame, size, anchor, position);
                    if (textOverflow(frame, board)) high = size;
                    else low = size;
                }
                setFillSize(frame, low, anchor, position);
                if (!textOverflow(frame, board)) return "";
            }
            setFillSize(frame, originalSize, anchor, position);
        }
        return overflow + " Không thể co chữ để vừa. Hãy kiểm tra bản này trước khi in.";
    }

    function noCollision(box, locations, index, occupied) {
        for (var i = 0; i < occupied.length; i++) {
            if (G.intersects(box, occupied[i])) return false;
        }
        for (i = index + 1; i < locations.length; i++) {
            if (G.intersects(box, locations[i].footprint)) return false;
        }
        return true;
    }

    function rollback(board, copies) {
        var failures = [];
        for (var i = copies.length - 1; i >= 0; i--) {
            try {
                copies[i].item.locked = false;
                copies[i].item.remove();
            } catch (copyError) { failures.push(E.errorMessage(copyError)); }
        }
        if (board) {
            try { board.remove(); } catch (boardError) { failures.push(E.errorMessage(boardError)); }
        }
        if (failures.length) E.fail("Không dọn hết bản sao lỗi. " + failures.join(" / "));
    }

    function generate(doc, source, state, index, occupied) {
        var row = state.rows[index];
        var slot = state.locations[index];
        var board = null;
        var copies = [];
        var roots = source.art.roots;
        try {
            try {
                board = doc.artboards.add(G.nativeRect(slot.rect));
            } catch (canvasError) {
                E.fail("Illustrator không thể thêm artboard tại vị trí đã tính. Hãy thử giảm số cột, khoảng cách hoặc chia danh sách. " +
                    E.errorMessage(canvasError));
            }
            board.name = row.name;
            var settings = source.settings;
            board.rulerOrigin = settings.rulerOrigin;
            board.rulerPAR = settings.rulerPAR;
            board.showCenter = settings.showCenter;
            board.showCrossHairs = settings.showCrossHairs;
            board.showSafeAreas = settings.showSafeAreas;
            for (var i = 0; i < roots.length; i++) {
                var original = roots[i];
                var copy = original.duplicate(original, ElementPlacement.PLACEAFTER);
                copies.push({item: copy, locked: Boolean(original.locked)});
                if (copy.locked) copy.locked = false;
                G.translate(copy, slot.dx, slot.dy);
            }
            var text = row.text.replace(/\n/g, "\r");
            var boxes = [];
            var warnings = [];
            for (i = 0; i < source.frames.length; i++) {
                var field = source.frames[i];
                var frame = textCopy(copies[field.rootNumber].item, field.path);
                var label = source.frames.length > 1 ? "Khung chữ " + (i + 1) + ". " : "";
                frame.contents = text;
                if (frame.contents !== text || !matchesTextStyle(frame, field.style.fingerprint)) {
                    E.fail(label + "Illustrator không giữ nguyên nội dung hoặc định dạng chữ trong bản sao.");
                }
                var position = [field.anchor[0] + slot.dx, field.anchor[1] + slot.dy];
                var warning = fitFilledText(frame, slot.rect, field.style.size, state.anchor, position);
                // Illustrator can select the area text copy while composing its contents.
                frame.selected = false;
                if (!keepsOrientation(frame, field.transform)) {
                    E.fail(label + "Illustrator không giữ nguyên chiều xoay của chữ trong bản sao.");
                }
                var box = G.bounds(frame, "visible");
                if (!noCollision(box, state.locations, index, occupied)) {
                    E.fail(label + "Chữ chạm artboard hoặc artwork bên cạnh." + (warning ? " " + warning : ""));
                }
                boxes.push(box);
                if (warning) warnings.push(label + warning);
            }
            for (i = 0; i < copies.length; i++) if (copies[i].locked) copies[i].item.locked = true;
            occupied.push(slot.footprint);
            for (i = 0; i < boxes.length; i++) occupied.push(boxes[i]);
            return {name: row.name, text: row.text, status: "applied", boardNumber: doc.artboards.length,
                reason: warnings.join(" ")};
        } catch (error) {
            try { rollback(board, copies); }
            catch (cleanupError) { E.fail(E.errorMessage(error) + " " + E.errorMessage(cleanupError)); }
            return {name: row.name, text: row.text, status: "failed", reason: E.errorMessage(error)};
        }
    }

    E.commands.scanFill = function (request) {
        return G.withDocumentCoordinates(function () {
            var doc = E.doc();
            var entries = parseList(request.list === undefined ? request.text : request.list);
            var columns = bounded(request.columns, 4, 1, 24, "Số cột", true);
            var gapMm = bounded(request.gapMm, 5, 0, 1000, "Khoảng cách (mm)", false);
            var anchor = request.anchor || "mc";
            var boards = G.boards(doc);
            var maxArtboards = parseInt(app.version, 10) < 22 ? 100 : 1000;
            if (entries.length + boards.length > maxArtboards) {
                E.fail("Danh sách vượt giới hạn " + maxArtboards + " artboard trong một tài liệu.");
            }
            var source = template(doc, boards, anchor, false);
            var rows = rowsFor(entries, boards);
            var state = {source: source.stamp, boards: boardSnapshot(boards), rows: rows, cursor: 0,
                columns: columns, gapMm: gapMm, anchor: anchor};
            var previewFrames = [];
            var canvasFactor = G.canvasFactor(doc);
            for (var i = 0; i < source.frames.length; i++) {
                var style = source.frames[i].style;
                previewFrames.push({font: style.font, size: style.size * canvasFactor});
            }
            var preview = {count: entries.length, rows: rows, frameCount: previewFrames.length, frames: previewFrames,
                font: previewFrames[0].font, size: previewFrames[0].size,
                sourceBoard: {number: source.board.number, name: source.board.name}, warnings: []};
            return E.plan.put("fill", doc, request, state, preview);
        });
    };

    E.commands.applyFill = function (request) {
        return G.withDocumentCoordinates(function () {
            var doc = E.doc();
            var record = E.plan.get("fill", doc, request.token);
            var state = record.state;
            if (request.index !== undefined && Number(request.index) !== state.cursor) {
                E.fail("Lượt áp dụng không khớp. Hãy xem kế hoạch lại.");
            }
            var boards = G.boards(doc);
            if (boardSnapshot(boards) !== state.boards) E.fail("Artboard đã thay đổi. Hãy xem kế hoạch lại.");
            var source = template(doc, boards, state.anchor);
            if (source.stamp !== state.source) E.fail("Khung chữ mẫu đã thay đổi. Hãy xem trước lại.");
            var size = bounded(request.batchSize, state.rows.length, 1, 50, "Số artboard trong mỗi lượt", true);
            if (!state.art) state.art = startArtworkCheck(doc, boards, source.board);
            if (!state.copySource) {
                if (!checkArtwork(state.art, doc, boards, source.board, request.batchSize !== undefined)) {
                    return { phase: "prepare", checked: state.art.checked, applied: 0, failed: 0, rows: [],
                        nextIndex: state.cursor, remaining: state.rows.length - state.cursor, done: false };
                }
                source = template(doc, boards, state.anchor, true);
                source.art = state.art;
                for (var f = 0; f < source.frames.length; f++) {
                    var frame = source.frames[f];
                    frame.rootNumber = G.findItem(source.art.roots, frame.root);
                    if (frame.rootNumber < 0) E.fail("Không xác định được một khung chữ mẫu trong artwork sẽ sao chép.");
                }
                state.locations = layout(doc, boards, source, state.rows.length, state.columns, state.gapMm);
                state.copySource = source;
            }
            source = state.copySource;
            var occupied = state.art.occupied;
            var end = Math.min(state.cursor + size, state.rows.length);
            for (var i = state.cursor; i < end; i++) {
                for (var j = 0; j < occupied.length; j++) {
                    if (G.intersects(state.locations[i].footprint, occupied[j])) {
                        E.fail("Artwork hoặc artboard đã chiếm vị trí dự kiến. Hãy xem kế hoạch lại.");
                    }
                }
            }
            var locked = [];
            var out = {applied: 0, failed: 0, rows: [], warnings: []};
            try {
                unlockLayers(source.art.roots, locked);
                for (i = state.cursor; i < end; i++) {
                    var row = generate(doc, source, state, i, occupied);
                    out[row.status]++;
                    out.rows.push(row);
                    state.cursor = i + 1;
                }
            } finally {
                try { restoreLayers(locked); }
                finally { restoreSelection(doc, source.frames); }
            }
            state.boards = boardSnapshot(G.boards(doc));
            out.nextIndex = state.cursor;
            out.remaining = state.rows.length - state.cursor;
            out.done = out.remaining === 0;
            if (out.done) E.plan.remove(request.token);
            return out;
        });
    };

    E.commands.cancelFill = function (request) {
        var record = E.plan.get("fill", E.doc(), request.token);
        E.plan.remove(request.token);
        return {appliedOrAttempted: record.state.cursor, remaining: record.state.rows.length - record.state.cursor};
    };
}(EDT));

(function (E) {
    if (typeof CoordinateSystem === 'undefined') {
        alert('Phiên bản này cần Illustrator CS5 trở lên để làm việc với tọa độ artboard.', 'EVENT DESIGN TOOLKIT');
        return;
    }

    function licenseSummary(state) {
        if (!state.active) {
            if (state.reason === 'expired') return 'Key đã hết hạn. Nhập key mới để tiếp tục.';
            if (state.reason === 'clock') return 'Hãy kiểm tra ngày và giờ của máy rồi mở lại Toolkit.';
            if (state.reason === 'invalid') return 'Key đã lưu không hợp lệ. Nhập key do người quản trị cấp.';
            if (state.reason === 'storage') return 'Không đọc được key đã lưu. Kiểm tra quyền truy cập hồ sơ người dùng.';
            return 'Dán key do người quản trị cấp để mở các công cụ. Có thể kích hoạt offline.';
        }
        if (state.type === 'permanent') return 'Đang dùng key vĩnh viễn.';
        var date = new Date(state.expiresAt);
        function two(value) { return ('0' + value).slice(-2); }
        var term = {day:'ngày',month:'tháng',year:'năm'}[state.type];
        return 'Key ' + term + '. Hết hạn lúc ' + two(date.getHours()) + ':' + two(date.getMinutes()) +
            ' ngày ' + two(date.getDate()) + '/' + two(date.getMonth() + 1) + '/' + date.getFullYear() + '.';
    }

    function manageLicense() {
        var result = E.call('licenseStatus');
        if (!result.ok) {
            alert(result.error, 'EVENT DESIGN TOOLKIT');
            return false;
        }
        var state = result.data;
        var activation = new Window('dialog', state.active ? 'Quản lý key' : 'Kích hoạt EVENT DESIGN TOOLKIT');
        activation.alignChildren = ['fill', 'top'];
        var info = activation.add('statictext', undefined, licenseSummary(state), {multiline:true});
        info.preferredSize = [420, 42];
        activation.add('statictext', undefined, 'Key sử dụng');
        var key = activation.add('edittext', undefined, '', {multiline:true, scrolling:true});
        key.preferredSize = [420, 88];
        key.helpTip = 'Dán toàn bộ key do người quản trị cấp.';
        var controls = activation.add('group');
        controls.alignment = 'right';
        if (state.active) {
            controls.add('button', undefined, 'Gỡ key').onClick = function () {
                if (!confirm('Gỡ key khỏi hồ sơ này? Bạn sẽ cần key để kích hoạt lại.')) return;
                var removed = E.call('deactivateLicense');
                if (removed.ok) activation.close();
                else info.text = removed.error;
            };
        }
        var unlock = controls.add('button', undefined, state.active ? 'Đổi key' : 'Kích hoạt');
        unlock.onClick = function () {
            if (!/\S/.test(key.text)) {
                info.text = 'Dán key sử dụng trước khi kích hoạt.';
                return;
            }
            var attempt = E.call('activateLicense', {key:key.text});
            if (attempt.ok && attempt.data.active) {
                key.text = '';
                activation.close();
            } else {
                info.text = attempt.error || licenseSummary(attempt.data);
            }
        };
        controls.add('button', undefined, 'Đóng', {name:'cancel'});
        activation.show();
        result = E.call('licenseStatus');
        return result.ok && result.data.active;
    }

    var license = E.call('licenseStatus');
    if ((!license.ok || !license.data.active) && !manageLicense()) return;
    var dialog = new Window('dialog', 'EVENT DESIGN TOOLKIT');
    dialog.orientation = 'column';
    dialog.alignChildren = ['fill', 'top'];

    var tabs = dialog.add('tabbedpanel');
    tabs.preferredSize = [520, 350];
    var output = dialog.add('edittext', undefined, '', {
        multiline: true, readonly: true, scrolling: true
    });
    output.preferredSize = [520, 176];

    var anchorNames = ['Trên trái', 'Trên giữa', 'Trên phải', 'Giữa trái', 'Tâm', 'Giữa phải',
        'Dưới trái', 'Dưới giữa', 'Dưới phải'];
    var anchors = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
    var statuses = {
        ready: 'Sẵn sàng', applied: 'Đã áp dụng', skipped: 'Bỏ qua', skip: 'Bỏ qua',
        blocked: 'Bỏ qua', duplicate: 'Trùng đối tượng', missing: 'Thiếu đối tượng', failed: 'Lỗi'
    };
    var views = [];
    var syncViews = [];
    var sample = null;
    var selectedSizeHint = 'Để đổi cỡ các đối tượng đang chọn trên cùng artboard, dùng panel CEP.';
    var reviewGuide = 'Bấm Xem kế hoạch để kiểm tra mục sẵn sàng và lý do bỏ qua từng mục. Bấm Áp dụng khi danh sách đích đúng.';
    var identificationGuide = 'Cùng vai trò: gán một mã như logo-chinh cho mẫu và các logo tương ứng. ' +
        'Giữ Shift để chọn thêm từng đối tượng trong Illustrator trước khi mở JSX, nhập mã rồi bấm Gán vai trò cho vùng chọn. ' +
        'Đóng JSX, chọn riêng mẫu rồi mở lại để đồng bộ.\n' +
        'Cùng tên đối tượng: mở Window → Layers và dùng cùng tên cho mẫu và các đích. ' +
        'Để trống ô Vai trò hoặc tên sẽ lấy thông tin từ mẫu. Mỗi artboard đích cần một đối tượng khớp.';
    var sourceGuide = 'Chọn đúng một mẫu bằng công cụ Selection (V) trước khi mở JSX. ' +
        'Nếu thiết kế gồm nhiều phần, chọn cả group. Bấm Lấy làm mẫu.';
    var destinationGuide = 'Ở Artboard đích, chọn tất cả hoặc nhập các số artboard như 2, 5-8.';
    var textGuide = [
        '1. Chọn các khung chữ hoặc group trong Illustrator trước khi mở JSX nếu muốn đổi phần đang chọn.',
        '2. Chọn Phạm vi. Bạn có thể dùng artboard hiện tại, nhập danh sách như 2, 5-8 hoặc chọn toàn tài liệu.',
        '3. Chọn Cách đổi cỡ. Đặt cỡ: nhập 36 để được 36 pt. Tăng hoặc giảm: nhập +2 hoặc -2 để đổi 2 pt. ' +
            'Nhân tỷ lệ: nhập 150 để mỗi cỡ chữ tăng lên 1,5 lần. ' +
            'Dùng cỡ chữ mẫu: chọn một khung có một cỡ chữ trước khi mở JSX, bấm Lấy cỡ mẫu rồi chọn phạm vi đích.',
        '4. Điểm neo giữ nguyên là điểm trên khung bao quanh chữ sẽ ở nguyên chỗ khi cỡ chữ đổi. ' +
            'Ví dụ, Trên trái giữ góc trên bên trái và Tâm giữ chính giữa.',
        '5. ' + reviewGuide
    ].join('\n\n');
    var positionGuide = [
        '1. ' + sourceGuide,
        '2. Ở Nhận diện theo, chọn cách Illustrator tìm đúng đối tượng ở mỗi đích.\n' + identificationGuide,
        '3. ' + destinationGuide,
        '4. Chọn cách tính vị trí. Giữ khoảng cách khi muốn cùng số cm tính từ góc trên trái của artboard. ' +
            'Chọn vị trí tương đối khi muốn giữ tỷ lệ theo khổ artboard, ví dụ 50% chiều rộng.',
        '5. Điểm neo đối tượng là điểm dùng để so với mẫu. Ví dụ, Tâm căn theo chính giữa và Trên trái căn theo góc của khung bao.',
        '6. ' + reviewGuide
    ].join('\n\n');
    var sizeGuide = [
        '1. ' + sourceGuide + ' Mẫu hiển thị kích thước khung theo thứ tự Rộng × Cao, ví dụ Rộng 10 × Cao 9 cm. ' +
            'Có thể dùng cho logo, nhóm vector và khung chữ điểm hoặc chữ vùng độc lập. Chữ vẫn chỉnh sửa được. ' +
            'Dùng Đổi cỡ chữ để đặt cỡ font tính bằng pt.',
        '2. Ở Nhận diện theo, chọn cách Illustrator tìm đúng đối tượng ở mỗi đích.\n' + identificationGuide,
        '3. ' + destinationGuide + ' ' + selectedSizeHint,
        '4. Giữ tỷ lệ mặc định sẽ khớp cả hai chiều khi tỷ lệ đã giống mẫu. Nếu tỷ lệ khác, chọn khớp riêng chiều rộng ' +
            'hoặc chiều cao để giữ hình. Chọn Khớp đúng Rộng × Cao nếu chấp nhận hình hoặc chữ có thể bị kéo giãn.',
        '5. Điểm neo giữ nguyên là điểm trên từng đối tượng đích sẽ ở nguyên chỗ khi đổi kích thước. ' +
            'Ví dụ, chọn Tâm để logo lớn lên hoặc nhỏ lại quanh chính giữa.',
        '6. ' + reviewGuide
    ].join('\n\n');
    var fillGuide = [
        '1. Chuẩn bị một artboard có nền, hình và chữ mẫu. Dùng mũi tên đen (V), giữ Shift để chọn các khung chữ trên cùng một artboard rồi mở JSX. Với biển gấp, chọn chữ ở cả hai mặt.',
        '2. Dán danh sách vào ô lớn. Dùng dấu ; giữa hai mục. Nhấn Enter bên trong mục để chữ xuống dòng. Mỗi mục được điền vào mọi khung đã chọn trên artboard mới.',
        'Ví dụ sau có ba mục. Hai mục đầu có hai dòng.\n\nCO-CHAIR\nMALAYSIA;\nCO-CHAIR\nCHINA;\nASEAN SECRETARIAT',
        '3. Để mặc định Tâm nếu muốn chữ một dòng và nhiều dòng cân quanh tâm của chữ mẫu. Số cột và khoảng cách xác định cách xếp các artboard mới.',
        '4. Bấm Xem trước để kiểm tra chữ từng mục. Khi bấm Tạo artboard, mỗi mục dùng một bản sao của trang mẫu cùng nền và hình trên trang đó. ' +
            'Mỗi khung giữ font và góc xoay riêng theo mẫu. Chữ tràn ở bản mới sẽ tự co cỡ. Trang mẫu được giữ nguyên.'
    ].join('\n\n');

    function addView(title, guide) {
        var panel = tabs.add('tab', undefined, title);
        panel.alignChildren = ['fill', 'top'];
        var view = {panel: panel, token: null, guide: guide};
        views.push(view);
        return view;
    }

    function showGuide() {
        for (var i = 0; i < views.length; i++) {
            if (views[i].panel === tabs.selection) {
                output.text = views[i].guide;
                return;
            }
        }
        output.text = textGuide;
    }

    function clearPlan(view) {
        view.token = null;
        if (view.apply) view.apply.enabled = false;
    }

    function clearPlans() {
        for (var i = 0; i < views.length; i++) clearPlan(views[i]);
    }

    function field(view, parent, title, options, initial, update) {
        var group = parent.add('group');
        var label = group.add('statictext', undefined, title);
        label.preferredSize.width = 137;
        var control = options ? group.add('dropdownlist', undefined, options) :
            group.add('edittext', undefined, initial);
        if (options) control.selection = initial;
        control.preferredSize.width = 330;
        control.onChange = function () {
            clearPlan(view);
            if (update) update();
        };
        return control;
    }

    function selected(control) {
        return control.selection.index;
    }

    function cleaned(control) {
        return String(control.text).replace(/^\s+|\s+$/g, '');
    }

    function numberText(value) {
        return String(Math.round(value * 100) / 100).replace('.', ',');
    }

    function dimensions(pair, unit) {
        return 'Rộng ' + numberText(pair[0]) + ' × Cao ' + numberText(pair[1]) + ' ' + unit;
    }

    function sampleText(data) {
        var parts = ['Mẫu trên artboard ' + data.boardNumber + ' · ' + data.name];
        if (typeof data.width === 'number' && typeof data.height === 'number') {
            parts.push(dimensions([data.width, data.height], data.unit || 'cm'));
        }
        return parts.join('\n');
    }

    function rowText(row) {
        var board = row.boardNumber || row.artboard || (row.artboards && row.artboards.join(', '));
        var parts = [];
        if (board) parts.push('Artboard ' + board);
        if (row.name) parts.push(row.name);
        if (row.status) parts.push(statuses[row.status] || row.status);
        if (row.beforeSize && row.afterSize) {
            parts.push(dimensions(row.beforeSize, row.unit || 'cm') + ' → ' + dimensions(row.afterSize, row.unit || 'cm'));
        } else if (row.before !== null && row.before !== undefined && row.after !== null && row.after !== undefined) {
            if (row.before instanceof Array && row.after instanceof Array) {
                parts.push('X, Y (' + row.unit + '): ' + numberText(row.before[0]) + '; ' + numberText(row.before[1]) +
                    ' → ' + numberText(row.after[0]) + '; ' + numberText(row.after[1]));
            } else {
                parts.push(String(row.before) + ' → ' + String(row.after));
            }
        }
        if (row.reason) parts.push(row.reason);
        return parts.join(' · ') + (typeof row.text === 'string' ? '\n' + row.text + '\n' : '');
    }

    function invoke(command, payload) {
        var result = E.call(command, payload);
        if (result.ok) return result.data;
        output.text = result.error;
        return null;
    }

    function report(data) {
        var lines = [];
        if (data.source) lines.push(sampleText(data.source));
        if (data.sourceBoard) {
            lines.push('Artboard mẫu ' + data.sourceBoard.number + ' · ' + data.sourceBoard.name);
            if (data.frameCount > 0) lines.push(data.frameCount + ' khung chữ');
            var frames = data.frames && data.frames.length ? data.frames : [data];
            var styles = [];
            for (var frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                var frame = frames[frameIndex];
                if (!frame.font || typeof frame.size !== 'number') continue;
                var style = frame.font + ' ' + numberText(frame.size) + ' pt';
                var known = false;
                for (var styleIndex = 0; styleIndex < styles.length; styleIndex++) {
                    if (styles[styleIndex] === style) known = true;
                }
                if (!known) styles.push(style);
            }
            if (styles.length) lines.push(styles.join(' · '));
        }
        if (typeof data.applied === 'number') {
            lines.push('Đã áp dụng: ' + data.applied + ' · Bỏ qua: ' + (data.skipped || 0) + ' · Lỗi: ' + (data.failed || 0));
        } else {
            lines.push('Sẵn sàng: ' + (typeof data.total === 'number' ? data.total : data.count));
            if (typeof data.artboardCount === 'number') lines.push('Số artboard: ' + data.artboardCount);
        }
        var rows = data.rows || [];
        for (var i = 0; i < Math.min(rows.length, 70); i++) lines.push(rowText(rows[i]));
        if (rows.length > 70) lines.push('Hiển thị 70 mục đầu. Dùng panel CEP để xem thêm.');
        if (data.warnings && data.warnings.length) lines.push(data.warnings.join('\n'));
        output.text = lines.join('\n');
    }

    function preview(view, command, payload) {
        clearPlans();
        var data = invoke(command, payload);
        if (!data) return;
        report(data);
        var count = typeof data.total === 'number' ? data.total : data.count;
        if (data.token && count > 0) {
            view.token = data.token;
            view.apply.enabled = true;
        }
    }

    function actionButtons(view, group, previewAction, command) {
        var createsArtboards = command === 'applyFill';
        var previewButton = group.add('button', undefined, createsArtboards ? 'Xem trước' : 'Xem kế hoạch');
        previewButton.helpTip = 'Xem thay đổi dự kiến và lý do bỏ qua từng mục.';
        previewButton.onClick = previewAction;
        view.apply = group.add('button', undefined, createsArtboards ? 'Tạo artboard' : 'Áp dụng');
        view.apply.helpTip = 'Áp dụng cho các mục sẵn sàng trong kế hoạch vừa xem.';
        view.apply.enabled = false;
        view.apply.onClick = function () {
            var token = view.token;
            clearPlans();
            if (!token) return;
            var data = invoke(command, {token: token});
            if (data) report(data);
        };
    }

    var textView = addView('Đổi cỡ chữ', textGuide);
    var textPanel = textView.panel;
    var scopes = ['selection', 'active', 'list', 'document'];
    var textOperations = ['absolute', 'delta', 'percent', 'sample'];
    var textScope = field(textView, textPanel, 'Phạm vi', [
        'Đang chọn / trong group', 'Artboard hiện tại', 'Danh sách artboard', 'Toàn tài liệu'
    ], 0, function () {
        textList.enabled = selected(textScope) === 2;
    });
    textScope.helpTip = 'Phạm vi đang chọn dùng các khung chữ và group đã chọn trước khi mở JSX.';
    var textList = field(textView, textPanel, 'Danh sách artboard', null, '');
    textList.enabled = false;
    textList.helpTip = 'Ví dụ: 2, 5-8.';
    var textMethod = field(textView, textPanel, 'Cách đổi cỡ', [
        'Đặt cỡ chữ (pt)', 'Tăng hoặc giảm (pt)', 'Nhân tỷ lệ (%)', 'Dùng cỡ chữ mẫu'
    ], 0, function () {
        var usingSample = selected(textMethod) === 3;
        value.enabled = !usingSample;
        takeTextSample.enabled = usingSample;
    });
    var value = field(textView, textPanel, 'Giá trị (pt hoặc %)', null, '36');
    value.helpTip = 'Nhập 36 để đặt cỡ 36 pt, +2 hoặc -1 để đổi theo pt, hoặc 150 để nhân cỡ hiện tại 1,5 lần.';
    var textAnchor = field(textView, textPanel, 'Điểm neo giữ nguyên', anchorNames, 1);
    textAnchor.helpTip = 'Điểm trên khung bao quanh chữ sẽ ở nguyên chỗ khi thay cỡ. Ví dụ, chọn Tâm để giữ chính giữa.';
    var textActions = textPanel.add('group');
    var takeTextSample = textActions.add('button', undefined, 'Lấy cỡ mẫu');
    takeTextSample.helpTip = 'Trước khi mở JSX, chọn đúng một khung có một cỡ chữ. Sau đó chọn phạm vi đích.';
    takeTextSample.enabled = false;
    takeTextSample.onClick = function () {
        clearPlans();
        var data = invoke('captureTextStyle', {});
        if (data) output.text = typeof data.size === 'number' ? 'Cỡ chữ mẫu: ' + numberText(data.size) + ' pt.' :
            'Hãy chọn text có cỡ chữ đồng nhất để lấy mẫu.';
    };
    actionButtons(textView, textActions, function () {
        var kind = scopes[selected(textScope)];
        if (kind === 'list' && !cleaned(textList)) {
            clearPlans();
            output.text = 'Hãy nhập danh sách artboard.';
            return;
        }
        preview(textView, 'scanText', {
            scope: {kind: kind, ids: cleaned(textList)},
            operation: {kind: textOperations[selected(textMethod)], value: cleaned(value)},
            anchor: anchors[selected(textAnchor)],
            boundsMode: 'geometric'
        });
    }, 'applyText');

    function fillSyncSources(data) {
        sample = data;
        for (var i = 0; i < syncViews.length; i++) {
            var view = syncViews[i];
            view.summary.text = sampleText(data) + (view.isSize ? '\n' + selectedSizeHint : '');
            if (!cleaned(view.target) && !data.role && data.name && data.name !== data.typename) {
                view.match.selection = 1;
                view.updateMatch();
            }
        }
    }

    function makeSyncView(purpose, title) {
        var isSize = purpose === 'size';
        var view = addView(title, isSize ? sizeGuide : positionGuide);
        var panel = view.panel;
        view.isSize = isSize;
        syncViews.push(view);
        var hint = 'Chọn một đối tượng trong Illustrator trước khi mở JSX.';
        if (isSize) hint += '\n' + selectedSizeHint;
        view.summary = panel.add('statictext', undefined, hint, {multiline: true});
        view.summary.preferredSize = [480, isSize ? 52 : 35];
        view.summary.alignment = ['fill', 'top'];

        var sampleControls = panel.add('group');
        var takeSample = sampleControls.add('button', undefined, 'Lấy làm mẫu');
        takeSample.helpTip = 'Dùng đối tượng đã chọn trong Illustrator làm mẫu cho các artboard khác.';
        takeSample.onClick = function () {
            clearPlans();
            var data = invoke('captureSample', {
                unit: 'cm', boundsMode: 'geometric', objectAnchor: anchors[selected(anchor)]
            });
            if (data) {
                fillSyncSources(data);
                output.text = sampleText(data);
            }
        };
        var assignRole = sampleControls.add('button', undefined, 'Gán vai trò cho vùng chọn');
        assignRole.helpTip = 'Trước khi mở JSX, chọn các đối tượng tương ứng. Nhập một mã như logo-chinh rồi bấm nút này.';
        assignRole.onClick = function () {
            clearPlans();
            var role = cleaned(view.target);
            if (!role) {
                output.text = 'Hãy nhập mã vai trò cần gán.';
                return;
            }
            var data = invoke('roleAssign', {role: role});
            if (data) {
                var lines = ['Đã gán vai trò cho ' + data.count + ' đối tượng.'];
                for (var i = 0; data.skipped && i < Math.min(data.skipped.length, 70); i++) {
                    lines.push(rowText(data.skipped[i]));
                }
                if (sample) lines.push('Lấy mẫu lại nếu đối tượng mẫu vừa đổi vai trò.');
                output.text = lines.join('\n');
            }
        };

        view.updateMatch = function () {
            assignRole.enabled = selected(view.match) === 0;
            view.target.helpTip = assignRole.enabled ?
                'Ví dụ: logo-hoi-nghi. Để trống sẽ dùng vai trò của mẫu.' :
                'Ví dụ: Logo hội nghị. Để trống sẽ dùng tên của mẫu.';
        };
        view.match = field(view, panel, 'Nhận diện theo', ['Cùng vai trò', 'Cùng tên đối tượng'], 0, view.updateMatch);
        view.match.helpTip = 'Cách tìm đối tượng tương ứng trên mỗi artboard. Dùng mã đã gán hoặc tên trong bảng Layers.';
        view.target = field(view, panel, 'Vai trò hoặc tên', null, '');
        view.updateMatch();
        var scope = field(view, panel, 'Artboard đích', ['Tất cả artboard khác', 'Danh sách artboard'], 0, function () {
            list.enabled = selected(scope) === 1;
        });
        scope.helpTip = 'Chọn các artboard nhận thay đổi từ mẫu. Để chỉ định vài artboard, chọn Danh sách artboard.';
        var list = field(view, panel, 'Danh sách artboard', null, '');
        list.enabled = false;
        list.helpTip = 'Ví dụ: 2, 5-8.';
        var mode = isSize ? field(view, panel, 'Cách khớp kích thước', [
            'Khớp hai chiều khi cùng tỷ lệ',
            'Khớp chiều rộng và giữ tỷ lệ',
            'Khớp chiều cao và giữ tỷ lệ',
            'Khớp đúng Rộng × Cao (có thể biến dạng)'
        ], 0) : field(view, panel, 'Cách tính vị trí', [
            'Cùng khoảng cách từ góc trên trái',
            'Cùng vị trí tương đối trong artboard'
        ], 0);
        mode.helpTip = isSize ?
            'Nếu tỷ lệ khác mẫu, chọn khớp một chiều để giữ hình hoặc khớp cả hai chiều nếu chấp nhận kéo dãn.' :
            'Chọn cùng khoảng cách từ góc trên trái hoặc cùng vị trí theo tỷ lệ khổ artboard.';
        var anchor = field(view, panel, isSize ? 'Điểm neo giữ nguyên' : 'Điểm neo đối tượng',
            anchorNames, 4);
        anchor.helpTip = isSize ?
            'Điểm trên từng đối tượng đích sẽ ở nguyên chỗ khi đổi kích thước. Ví dụ, chọn Tâm để giữ chính giữa.' :
            'Điểm trên khung bao dùng để căn theo mẫu. Ví dụ, chọn Tâm để căn theo chính giữa.';
        var actions = panel.add('group');
        actionButtons(view, actions, function () {
            if (!sample) {
                clearPlans();
                output.text = 'Bấm Lấy làm mẫu trước khi xem kế hoạch.';
                return;
            }
            var targetScope = selected(scope) === 1 ? 'list' : 'all';
            if (targetScope === 'list' && !cleaned(list)) {
                clearPlans();
                output.text = 'Hãy nhập danh sách artboard đích.';
                return;
            }
            var byRole = selected(view.match) === 0;
            var payload = {
                purpose: purpose,
                unit: 'cm',
                boundsMode: 'geometric',
                objectAnchor: anchors[selected(anchor)],
                scope: {kind: targetScope, list: cleaned(list)},
                matchMode: byRole ? 'role' : 'name'
            };
            if (byRole) payload.role = cleaned(view.target);
            else payload.name = cleaned(view.target);
            if (isSize) payload.sizeMode = ['bothProportional', 'width', 'height', 'exact'][selected(mode)];
            else {
                payload.mode = selected(mode) === 0 ? 'distance' : 'ratio';
                payload.artboardAnchor = 'tl';
            }
            preview(view, 'scanSync', payload);
        }, 'applySync');
    }

    makeSyncView('position', 'Đồng bộ vị trí');
    makeSyncView('size', 'Đồng bộ kích thước');

    var fillView = addView('Điền theo danh sách', fillGuide);
    var fillPanel = fillView.panel;
    fillPanel.add('statictext', undefined, 'Danh sách chữ, mỗi mục cách nhau bằng dấu ;');
    var fillList = fillPanel.add('edittext', undefined, '', {multiline: true, scrolling: true});
    fillList.preferredSize = [467, 142];
    fillList.helpTip = 'Nhấn Enter để xuống dòng trên cùng một artboard. Dùng dấu ; để chuyển sang artboard tiếp theo.';
    fillList.onChanging = fillList.onChange = function () { clearPlan(fillView); };

    var fillColumns = field(fillView, fillPanel, 'Số cột xếp trang', null, '4');
    fillColumns.helpTip = 'Số artboard mới tối đa trên một hàng.';
    var fillGap = field(fillView, fillPanel, 'Khoảng cách (mm)', null, '5');
    fillGap.helpTip = 'Khoảng cách giữa các artboard mới, tính bằng milimét.';
    var fillAnchor = field(fillView, fillPanel, 'Giữ điểm neo chữ', anchorNames, 4);
    fillAnchor.helpTip = 'Tâm giữ chính giữa của chữ mẫu khi mục mới dài hơn hoặc có nhiều dòng.';
    var fillActions = fillPanel.add('group');
    actionButtons(fillView, fillActions, function () {
        var columns = cleaned(fillColumns);
        var gap = cleaned(fillGap).replace(',', '.');
        preview(fillView, 'scanFill', {
            list: fillList.text, columns: columns ? Number(columns) : undefined,
            gapMm: gap ? Number(gap) : undefined, anchor: anchors[selected(fillAnchor)]
        });
    }, 'applyFill');

    tabs.selection = textPanel;
    tabs.onChange = function () {
        clearPlans();
        showGuide();
    };

    var footer = dialog.add('group');
    footer.alignment = 'right';
    footer.add('button', undefined, 'Quản lý key').onClick = function () {
        if (!manageLicense()) dialog.close();
    };
    footer.add('button', undefined, 'Xem hướng dẫn').onClick = showGuide;
    footer.add('button', undefined, 'Đóng', {name: 'cancel'});
    showGuide();
    dialog.show();
}(EDT));
