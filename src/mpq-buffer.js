class MpqBuffer {

    /**
     * @param ${Buffer} buffer
     */
    constructor(buffer, offset, bigendian) {
        this.buffer = buffer;
        this.used = 0;
        this.next = null;
        this.nextBits = 0;
        this.bigendian = true;
        if (typeof offset !== "undefined") {
            this.used = offset;
        }
        if (typeof bigendian !== "undefined") {
            this.bigendian = bigendian;
        }
    }

    alignToByte() {
        this.nextBits = 0;
    }

    done() {
        return (this.nextBits === 0) && (this.used >= this.buffer.length);
    }

    seekByte(offset) {
        this.used = offset;
    }

    readBits(bits) {
        let result = 0;
        let resultBits = 0;
        while (resultBits != bits) {
            if (this.nextBits === 0) {
                if (this.done()) {
                    throw new Error("Truncated read!");
                }
                this.next = this.buffer.readUInt8(this.used++);
                this.nextBits = 8;
            }
            let copyBits = Math.min(bits - resultBits, this.nextBits);
            let copy = (this.next & ((1 << copyBits) - 1));
            if (this.bigendian) {
                result |= copy << (bits - resultBits - copyBits);
            } else {
                result |= copy << resultBits;
            }
            this.next >>>= copyBits;
            this.nextBits -= copyBits;
            resultBits += copyBits;
        }
        return result >>> 0;
    }
    readUnalignedBytes(bytes) {
        let result = "";
        for (let i = 0; i < bytes; i++) {
            result += String.fromCharCode( this.readBits(8) );
        }
        return result;
    }
    readAlignedBytes(bytes) {
        this.alignToByte();
        let result = 0;
        if (this.bigendian) {
            result = this.buffer.readUIntBE(this.used, bytes);
        } else {
            result = this.buffer.readUIntLE(this.used, bytes);
        }
        this.used += bytes;
        return result;
    }

    readBlob(length) {
        this.alignToByte();
        let result = Buffer.from(this.buffer.buffer, this.buffer.byteOffset + this.used, length);
        this.used += length;
        return result;
    }

    readVariableInt() {
        // Reads a signed integer of variable length
        // Code from https://github.com/ascendedguard/sc2replay-csharp
        let l2 = 0;
        for (let k = 0;; k += 7) {
            let l1 = this.readBits(8);
            l2 = (l2 | (l1 & 0x7F) << k) >>> 0;
            if ((l1 & 0x80) === 0) {
                return ((l2 & 1) >>> 0 > 0 ? -(l2 >>> 1) : l2 >>> 1);
            }
        }
    }

    toString(encoding, start, end) {
        return this.buffer.toString(encoding, start, end);
    }

}

module.exports = MpqBuffer;
