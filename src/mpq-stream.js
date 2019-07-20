const MpqBuffer = require('./mpq-buffer.js');
const MpqTools = require('./mpq-tools.js');

class MpqStream {

    static getSize() {
        return 16;
    }

    /**
     * @param {MpqFile} file
     * @param {MpqEntry} entry
     */
    constructor(file, entry) {
        this.file = file;
        this.entry = entry;
        this.blockSize = file.blockSize;
        this.blockPositions = [0, this.entry.compressedSize];
        this.currentBlockIndex = -1;
        this.currentData = null;
        if (this.entry.isCompressed()) {
            if (this.entry.isSingleUnit()) {
                this.blockSize = this.entry.fileSize;
            } else {
                this.loadBlockPositions();
            }
        }
    }

    loadBlockPositions() {
        let blockPosCount = Math.floor( (this.entry.fileSize + this.blockSize - 1) / this.blockSize) + 1;
        // Files with metadata have an extra block containing block checksums
        if (this.entry.hasMetaData()) {
            blockPosCount++;
        }
        this.blockPositions = [];
        // Read block positions
        for (let i = 0; i < blockPosCount; i++) {
            this.blockPositions.push( this.file.buffer.readUInt32LE( this.entry.filePos + (i * 4) ) );
        }

        console.log("blockPosCount: "+blockPosCount);
        console.log("blockPositions: ");
        console.log(this.blockPositions);
        throw new Error("Not implemented: MpqStream.loadBlockPositions()");
    }
    loadBlock(blockIndex, expectedLength) {
        let offset = null;
        let toRead = null;
        if (this.entry.isCompressed()) {
            offset = this.blockPositions[blockIndex];
            toRead = this.blockPositions[blockIndex + 1] - offset;
        } else {
            offset = blockIndex * this.blockSize;
            toRead = expectedLength;
        }
        offset += this.entry.filePos;
        let buffer = Buffer.from(this.file.buffer.buffer, offset, toRead);

        if (this.entry.isEncrypted() && (this.entry.fileSize > 3)) {
            if (this.entry.encryptionSeed === 0) {
                throw new Error("Unable to determine encryption key");
            }
            let encryptionSeed = (blockIndex + this.entry.encryptionSeed) >>> 0;
            MpqTools.decryptBlockBytes(buffer, encryptionSeed);
        }

        if (this.entry.isCompressed() && (toRead != expectedLength)) {
            if (this.entry.isCompressedMulti()) {
                buffer = MpqTools.decompressMulti(buffer, expectedLength);
            } else {
                throw new Error("Decompression not yet implemented! (PK)");
            }
        }

        return buffer;
    }
    bufferData(offset) {
        let requiredBlock = Math.floor(offset / this.blockSize);
        if (requiredBlock != this.currentBlockIndex) {
            let expectedLength = Math.floor(Math.min(this.length() - (requiredBlock * this.blockSize), this.blockSize));
            this.currentData = this.loadBlock(requiredBlock, expectedLength);
            this.currentBlockIndex = requiredBlock;
        }
    }
    read(offset, count) {
        let result = Buffer.alloc(count);
        let readLeft = count;
        let readTotal = 0;
        while (readLeft > 0) {
            let read = this.readInternal(offset, readLeft, result, readTotal);
            if (read === 0) {
                break;
            }
            readLeft -= read;
            readTotal += read;
            offset += read;
        }
        return new MpqBuffer(result);
    }
    readFile() {
        return this.read(0, this.entry.fileSize);
    }
    readInternal(offsetRead, count, buffer, offsetWrite) {
        this.bufferData(offsetRead);
        let localPosition = (offsetRead % this.blockSize);
        let bytesToCopy = Math.min(this.currentData.length - localPosition, count);
        if (bytesToCopy <= 0) {
            return 0;
        }
        return this.currentData.copy(buffer, offsetWrite, localPosition, localPosition + bytesToCopy);
    }
    length() {
        return this.entry.fileSize;
    }

}

module.exports = MpqStream;
