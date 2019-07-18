
class MpqHeader {

    static getMpqId() {
        return 0x1a51504d;
    }

    static getSize() {
        return 32;
    }

    constructor() {
        this.id = null;
        this.dataOffset = null;
        this.archiveSize = null;
        this.mpqVersion = null;
        this.blockSize = null;
        this.hashTablePos = null;
        this.blockTablePos = null;
        this.hashTableSize = null;
        this.blockTableSize = null;
        // Version 1 fields
        // The extended block table is an array of Int16 - higher bits of the offests in the block table.
        this.extendedBlockTableOffset = 0;
        this.hashTableOffsetHigh = 0;
        this.blockTableOffsetHigh = 0;
        // Offset in file
        this.headerOffset = 0;
    }

    /**
     *
     * @param {Buffer} buffer
     * @param {Number} offset
     */
    readFromBuffer(buffer, offset) {
        // Read id
        this.id = buffer.readUInt32LE(offset);
        if (this.id !== MpqHeader.getMpqId()) {
            throw new Error("Invalid MPQ header id! Expected: "+MpqHeader.getMpqId()+" Got: "+this.id);
        }
        // Read core data
        this.dataOffset = buffer.readUInt32LE(offset+4);
        this.archiveSize = buffer.readUInt32LE(offset+8);
        this.mpqVersion = buffer.readUInt16LE(offset+12);
        this.blockSize = buffer.readUInt16LE(offset+14);
        this.hashTablePos = buffer.readUInt32LE(offset+16);
        this.blockTablePos = buffer.readUInt32LE(offset+20);
        this.hashTableSize = buffer.readUInt32LE(offset+24);
        this.blockTableSize = buffer.readUInt32LE(offset+28);

        // Read version 1 fields if relevant
        if (this.mpqVersion === 1) {
            this.extendedBlockTableOffset = buffer.readBigInt64LE(offset+32);
            this.hashTableOffsetHigh = buffer.readInt16LE(offset+40);
            this.blockTableOffsetHigh = buffer.readInt16LE(offset+42);
        }
    }

    setHeaderOffset(headerOffset) {
        this.headerOffset = headerOffset;
        this.hashTablePos += headerOffset;
        this.blockTablePos += headerOffset;
        if (this.dataOffset == 0x6d9e4b86) { // A protected archive.  Seen in some custom wc3 maps.
            this.dataOffset = (MpqHeader.getSize() + headerOffset);
        }
    }

}

module.exports = MpqHeader;
