// Nodejs dependencies
const fs = require('fs');

// Decompression
const seekBzip = require('seek-bzip');

// Static variables
let stormBuffer = null;

class MpqTools {

    /**
     * @returns {Buffer}
     */
    static buildStormBuffer() {
        if (stormBuffer === null) {
            stormBuffer = Buffer.alloc(0x500 * 4);
            let seed = 0x100001;
            for (let index1 = 0; index1 < 0x100; index1++) {
                let index2 = index1;
                for (let i = 0; i < 5; i++, index2 += 0x100) {
                    seed = ((seed * 125 + 3) % 0x2aaaab) >>> 0;
                    let temp = (seed & 0xffff) << 16;
                    seed = ((seed * 125 + 3) % 0x2aaaab) >>> 0;
                    stormBuffer.writeUInt32LE((temp | (seed & 0xffff)) >>> 0, index2 * 4);
                }
            }
        }
        return stormBuffer;
    }

    /**
     * @param {string} input
     * @param {number} offset
     * @returns {number}
     */
    static hashString(input, offset) {
        MpqTools.buildStormBuffer();
        let seed1 = 0x7fed7fed;
        let seed2 = 0xeeeeeeee;
        input = input.toUpperCase();
        for (let i = 0; i < input.length; i++) {
            let val = input.charCodeAt(i);
            seed1 = stormBuffer.readUInt32LE((offset + val) * 4) ^ (seed1 + seed2);
            seed2 = val + seed1 + seed2 + (seed2 << 5) + 3;
        }
        return seed1 >>> 0;
    }

    /**
     * @param {Buffer} buffer
     * @param {string} key
     */
    static decryptTable(buffer, key) {
        MpqTools.decryptBlockBytes(buffer, MpqTools.hashString(key, 0x300));
    }

    /**
     * @param {Buffer} buffer
     * @param {number} key
     */
    static decryptBlockBytes(buffer, seed1) {
        let seed2 = 0xeeeeeeee;
        // NB: If the block is not an even multiple of 4,
        // the remainder is not encrypted
        for (let i = 0; i < buffer.length - 3; i += 4) {
            seed2 = (seed2 + stormBuffer.readUInt32LE((0x400 + (seed1 & 0xFF)) * 4)) >>> 0;

            let result = buffer.readUInt32LE(i);
            result = (result ^ (seed1 + seed2)) >>> 0;

            seed1 = ((((~seed1 << 21) + 0x11111111) >>> 0) | (seed1 >>> 11)) >>> 0;
            seed2 = (result + seed2 + (seed2 << 5) + 3) >>> 0;

            buffer.writeUInt32LE(result >>> 0, i);
        }
    }

    /**
     * @param {Buffer} buffer
     * @param {number} expectedLength
     * @returns {Buffer}
     */
    static decompressMulti(buffer, expectedLength) {
        let result = Buffer.alloc(expectedLength);
        let compType = buffer.readUInt8(0);
        switch (compType) {
            case 1:
                throw new Error("Decompression not yet implemented! (Multi / Huffman)");
            case 2:
                throw new Error("Decompression not yet implemented! (Multi / ZLib/Deflate)");
            case 8:
                throw new Error("Decompression not yet implemented! (Multi / PKLib/Impode)");
            case 0x10:
                // BZip2
                let bufferCompression = Buffer.from(buffer.buffer, buffer.offset + 1, buffer.length-1);
                seekBzip.decode(bufferCompression, result);
                return result;
            case 0x12:
                throw new Error("Decompression not yet implemented! (Multi / LZMA)");
            case 0x22:
                throw new Error("Decompression not yet implemented! (Multi / sparse then zlib)");
            case 0x30:
                throw new Error("Decompression not yet implemented! (Multi / sparse then bzip2)");
            case 0x40:
                throw new Error("Decompression not yet implemented! (Multi / IMA ADPCM Stereo)");
            case 0x41:
                throw new Error("Decompression not yet implemented! (Multi / Huffman WAV #1)");
            case 0x48:
                throw new Error("Decompression not yet implemented! (Multi / PK WAV)");
            case 0x80:
                throw new Error("Decompression not yet implemented! (Multi / IMA ADPCM Mono)");
            case 0x81:
                throw new Error("Decompression not yet implemented! (Multi / Huffman WAV #2)");
            case 0x88:
                throw new Error("Decompression not yet implemented! (Multi / PK WAV #2)");
            default:
                throw new Error("Decompression not yet implemented! (Multi / 0x"+compType.toString(16)+")");
        }
        return undefined;
    }
}

module.exports = MpqTools;
