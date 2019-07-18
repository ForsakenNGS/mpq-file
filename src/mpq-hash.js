class MpqHash {

    static getSize() {
        return 16;
    }

    /**
     * @param {Buffer} buffer
     * @param {Number} offset
     */
    constructor(buffer, offset) {
        this.name1 = null;
        this.name2 = null;
        this.locale = null;
        this.blockIndex = null;
        // Read on creation?
        if ((typeof buffer !== "undefined") && (typeof offset !== "undefined")) {
            this.readFromBuffer(buffer, offset);
        }
    }

    /**
     * @param {Buffer} buffer
     * @param {Number} offset
     */
    readFromBuffer(buffer, offset) {
        // Read core data
        this.name1 = buffer.readUInt32LE(offset);
        this.name2 = buffer.readUInt32LE(offset+4);
        this.locale = buffer.readUInt32LE(offset+8);
        this.blockIndex = buffer.readUInt32LE(offset+12);
    }

}

module.exports = MpqHash;
