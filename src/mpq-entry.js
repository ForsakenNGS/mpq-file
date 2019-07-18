// Nodejs dependencies
const path = require('path');

// Local classes
const MpqTools = require('./mpq-tools.js');

const MpqFileFlags = {
    CompressedPK: 0x100, // AKA Imploded
    CompressedMulti: 0x200,
    Compressed: 0xff00,
    Encrypted: 0x10000,
    BlockOffsetAdjustedKey: 0x020000, // AKA FixSeed
    SingleUnit: 0x1000000,
    FileHasMetadata: 0x04000000, // Appears in WoW 1.10 or newer.  Indicates the file has associated metadata.
    Exists: 0x80000000
};

class MpqEntry {

    static getSize() {
        return 16;
    }

    /**
     * @param {Buffer} buffer
     * @param {Number} offset
     * @param {Number} headerOffset
     */
    constructor(buffer, offset, headerOffset) {
        this.fileOffset = null;
        this.filePos = null;
        this.compressedSize = null;
        this.fileSize = null;
        this.flags = null;
        this.encryptionSeed = 0;
        this.filename = null;
        // Read on creation?
        if ((typeof buffer !== "undefined") && (typeof offset !== "undefined") && (typeof headerOffset !== "undefined")) {
            this.readFromBuffer(buffer, offset, headerOffset);
        }
    }

    /**
     * @param {Buffer} buffer
     * @param {Number} offset
     * @param {Number} headerOffset
     */
    readFromBuffer(buffer, offset, headerOffset) {
        // Read core data
        this.fileOffset = buffer.readUInt32LE(offset);
        this.filePos = this.fileOffset + headerOffset;
        this.compressedSize = buffer.readUInt32LE(offset+4);
        this.fileSize = buffer.readUInt32LE(offset+8);
        this.flags = buffer.readUInt32LE(offset+12);
    }

    calculateEncryptionSeed() {
        if (this.filename === null) {
            return 0;
        }
        let seed = MpqTools.hashString(path.basename(this.filename), 0x300) >>> 0;
        if ((this.flags & MpqFileFlags.BlockOffsetAdjustedKey) === MpqFileFlags.BlockOffsetAdjustedKey) {
            seed = ((seed + this.fileOffset) ^ this.fileSize) >>> 0;
        }
        return seed;
    }

    exists() {
        return this.flags !== 0;
    }
    hasMetaData() {
        return (this.flags & MpqFileFlags.FileHasMetadata) !== 0;
    }
    isEncrypted() {
        return (this.flags & MpqFileFlags.Encrypted) !== 0;
    }
    isCompressed() {
        return (this.flags & MpqFileFlags.Compressed) !== 0;
    }
    isCompressedMulti() {
        return (this.flags & MpqFileFlags.CompressedMulti) !== 0;
    }
    isCompressedPK() {
        return (this.flags & MpqFileFlags.CompressedPK) !== 0;
    }
    isSingleUnit() {
        return (this.flags & MpqFileFlags.SingleUnit) !== 0;
    }

    setFilename(name) {
        this.filename = name;
        this.encryptionSeed = this.calculateEncryptionSeed();
    }

    toString() {
        if (this.filename === null) {
            if (this.exists()) {
                return "Unknown file @ 0x"+this.filePos.toString(16);
            } else {
                return "(Deleted file)";
            }
        }
        return this.filename;
    }

}

module.exports = MpqEntry;
