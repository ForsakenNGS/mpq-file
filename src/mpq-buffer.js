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
    alignOffset(offset) {
        if (offset < 0) {
            // Negative offset -> From end of buffer
            return this.buffer.length + offset;
        } else {
            // Positive offset -> From 0
            return offset;
        }
    }

    done() {
        return (this.nextBits === 0) && (this.used >= this.buffer.length);
    }

    seekByte(offset) {
        this.used = offset;
    }
    seekToString(expected, consume, encoding, offset) {
        if (typeof consume === "undefined") {
            consume = false;
        }
        if (typeof encoding === "undefined") {
            encoding = 'utf8';
        }
        if (typeof offset === "undefined") {
            offset = this.used;
        }
        this.alignToByte();
        let expectedLength = Buffer.byteLength(expected, encoding);
        let posMax = this.buffer.length - expectedLength;
        for (let i = this.alignOffset(offset); i < posMax; i++) {
            this.used = i;
            let read = this.readBlob(expectedLength).toString(encoding);
            if (read === expected) {
                if (!consume) {
                    this.used -= expectedLength;
                }
                return read;
            }
        }
        throw new Error("Failed seeking to blob '"+expected+"'! Reached end of stream.");
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
    readString(encoding) {
        if (typeof encoding === "undefined") {
            encoding = 'utf8';
        }
        // Read null terminated string
        let stringStart = this.used;
        // Continue until zero terminator
        while (this.readAlignedBytes(1) !== 0);
        // Return string
        return Buffer.from(this.buffer.buffer, this.buffer.byteOffset + stringStart, this.used - stringStart - 1).toString(encoding);
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
