// Nodejs dependencies
const fs = require('fs');

// Local classes
const MpqHeader = require('./mpq-header.js');
const MpqHash = require('./mpq-hash.js');
const MpqEntry = require('./mpq-entry.js');
const MpqStream = require('./mpq-stream.js');
const MpqTools = require('./mpq-tools.js');

class MpqFile {

    constructor(file, loadListFile) {
        this.file = file;
        this.buffer = fs.readFileSync(this.file);
        this.header = new MpqHeader();
        this.blockSize = 0;
        this.hashTable = null;
        this.hashes = [];
        this.entryTable = null;
        this.entries = [];
        // Read file
        this.init();
        // Read filenames from listfile
        if ((typeof loadListFile === "undefined") || loadListFile) {
            this.addListfileFilenames();
        }
    }
    init() {
        // Locate and read header
        if (!this.locateMpqHeader()) {
            throw new Error("Failed to locate MPQ header!");
        }
        // Check if version 1 features are present (and fail if so)
        if ((this.header.extendedBlockTableOffset !== 0) || (this.header.hashTableOffsetHigh !== 0) || (this.header.blockTableOffsetHigh !== 0)) {
            throw new Error("MPQ format version 1 features are not supported");
        }
        // Get block size
        this.blockSize = 0x200 << this.header.blockSize;
        // Load hash table
        this.hashTable = Buffer.from(this.buffer.buffer, this.header.hashTablePos, this.header.hashTableSize * MpqHash.getSize());
        MpqTools.decryptTable(this.hashTable, "(hash table)");
        for (let i = 0; i < this.header.hashTableSize; i++) {
            this.hashes.push( new MpqHash(this.hashTable, i * MpqHash.getSize()) );
        }
        // Load entry table
        this.entryTable = Buffer.from(this.buffer.buffer, this.header.blockTablePos, this.header.blockTableSize * MpqEntry.getSize());
        MpqTools.decryptTable(this.entryTable, "(block table)");
        for (let i = 0; i < this.header.blockTableSize; i++) {
            this.entries.push( new MpqEntry(this.entryTable, i * MpqEntry.getSize(), this.header.headerOffset) );
        }

    }
    locateMpqHeader() {
        let posMax = this.buffer.length - MpqHeader.getSize();
        for (let i = 0; i < posMax; i++) {
            try {
                this.header.readFromBuffer(this.buffer, i);
                this.header.setHeaderOffset(i);
                return true;
            } catch (error) {
                // Invalid header location
            }
        }
        return false;
    }
    addFilename(filename) {
        let hash = new MpqHash();
        if (!this.tryGetHashEntry(filename, hash)) {
            return false;
        }
        this.entries[ hash.blockIndex ].setFilename(filename);
        return true;
    }
    addFilenames(filenames) {
        let result = true;
        for (let i = 0; i < filenames.length; i++) {
            if (!this.addFilename(filenames[i])) {
                result = false;
            }
        }
        return result;
    }
    addListfileFilenames() {
        if (!this.addFilename("(listfile)")) {
            return false;
        }
        let fileStream = this.openFile("(listfile)");
        return this.addFilenames( fileStream.readFile().toString().split("\r\n") );
    }
    openFile(filename) {
        let hash = new MpqHash();
        if (!this.tryGetHashEntry(filename, hash)) {
            throw new Error("File not found: "+filename);
        }
        let entry = this.entries[ hash.blockIndex ];
        if (entry.filename === null) {
            entry.setFilename(filename);
        }
        return new MpqStream(this, entry);
    }
    tryGetHashEntry(filename, hashOut) {
        let index = MpqTools.hashString(filename, 0);
        index &= (this.header.hashTableSize - 1);
        let name1 = MpqTools.hashString(filename, 0x100);
        let name2 = MpqTools.hashString(filename, 0x200);
        for (let i = index; i < this.hashes.length; ++i) {
            let hash = this.hashes[i];
            if ((hash.name1 == name1) && (hash.name2 == name2)) {
                Object.assign(hashOut, hash);
                return true;
            }
        }
        for (let i = 0; i < index; i++) {
            let hash = this.hashes[i];
            if ((hash.name1 == name1) && (hash.name2 == name2)) {
                Object.assign(hashOut, hash);
                return true;
            }
        }
        return false;
    }

}

module.exports = MpqFile;
