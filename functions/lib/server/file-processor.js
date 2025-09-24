import { parse as parseCSV } from 'csv-parse';
import * as XLSX from 'xlsx';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
export class FileProcessor {
    static instance;
    options;
    tempFiles = new Set();
    static getInstance() {
        if (!FileProcessor.instance) {
            FileProcessor.instance = new FileProcessor();
        }
        return FileProcessor.instance;
    }
    constructor() {
        this.options = {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            streamingThreshold: 10 * 1024 * 1024, // 10MB
            chunkSize: 1024 * 1024, // 1MB chunks
            tempDir: 'temp',
            supportedFormats: [
                'text/csv',
                'application/json',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ],
            encoding: 'utf8'
        };
        // Ensure temp directory exists
        this.ensureTempDir();
    }
    /**
     * Process uploaded file with optimal strategy
     */
    async processFile(file) {
        const startTime = Date.now();
        const initialMemory = process.memoryUsage().heapUsed;
        try {
            // Validate file
            await this.validateFile(file);
            // Get file metadata
            const metadata = await this.analyzeFile(file);
            // Choose processing strategy based on file size
            let result;
            if (file.size > this.options.streamingThreshold) {
                result = await this.processFileStreaming(file, metadata);
            }
            else {
                result = await this.processFileInMemory(file, metadata);
            }
            const finalMemory = process.memoryUsage().heapUsed;
            result.processingTime = Date.now() - startTime;
            result.memoryUsage = finalMemory - initialMemory;
            return result;
        }
        catch (error) {
            return {
                success: false,
                metadata: { name: file.originalname, size: file.size, type: file.mimetype },
                error: error.message,
                processingTime: Date.now() - startTime,
                memoryUsage: 0
            };
        }
    }
    /**
     * Process file in memory (for smaller files)
     */
    async processFileInMemory(file, metadata) {
        let data = [];
        switch (file.mimetype) {
            case 'application/json':
                data = await this.parseJSON(file.buffer);
                break;
            case 'text/csv':
                data = await this.parseCSVBuffer(file.buffer);
                break;
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.ms-excel':
                data = await this.parseExcel(file.buffer);
                break;
            default:
                throw new Error(`Unsupported file format: ${file.mimetype}`);
        }
        return {
            success: true,
            metadata: {
                ...metadata,
                recordCount: data.length,
                fields: data.length > 0 ? Object.keys(data[0]) : [],
                sampleData: data.slice(0, 5)
            },
            data,
            processingTime: 0,
            memoryUsage: 0
        };
    }
    /**
     * Process file with streaming (for larger files)
     */
    async processFileStreaming(file, metadata) {
        const tempFilePath = await this.createTempFile(file);
        const processedFilePath = `${tempFilePath}.processed.json`;
        try {
            let recordCount = 0;
            let fields = [];
            let sampleData = [];
            switch (file.mimetype) {
                case 'text/csv':
                    ({ recordCount, fields, sampleData } = await this.processCSVStreaming(tempFilePath, processedFilePath));
                    break;
                case 'application/json':
                    ({ recordCount, fields, sampleData } = await this.processJSONStreaming(tempFilePath, processedFilePath));
                    break;
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                case 'application/vnd.ms-excel':
                    ({ recordCount, fields, sampleData } = await this.processExcelStreaming(tempFilePath, processedFilePath));
                    break;
                default:
                    throw new Error(`Streaming not supported for format: ${file.mimetype}`);
            }
            return {
                success: true,
                metadata: {
                    ...metadata,
                    recordCount,
                    fields,
                    sampleData
                },
                streamPath: processedFilePath,
                processingTime: 0,
                memoryUsage: 0
            };
        }
        finally {
            // Clean up original temp file
            await this.deleteTempFile(tempFilePath);
        }
    }
    /**
     * Stream CSV processing
     */
    async processCSVStreaming(inputPath, outputPath) {
        let recordCount = 0;
        let fields = [];
        const sampleData = [];
        const writeStream = createWriteStream(outputPath);
        // Start JSON array
        writeStream.write('[\n');
        return new Promise((resolve, reject) => {
            const readStream = createReadStream(inputPath);
            const parser = parseCSV({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                cast: true,
                cast_date: true
            });
            let isFirst = true;
            parser.on('readable', function () {
                let record;
                while (record = parser.read()) {
                    if (recordCount === 0) {
                        fields = Object.keys(record);
                    }
                    if (sampleData.length < 5) {
                        sampleData.push({ ...record });
                    }
                    // Write to output file
                    if (!isFirst) {
                        writeStream.write(',\n');
                    }
                    writeStream.write(JSON.stringify(record));
                    isFirst = false;
                    recordCount++;
                }
            });
            parser.on('error', reject);
            parser.on('end', () => {
                writeStream.write('\n]');
                writeStream.end();
                resolve({ recordCount, fields, sampleData });
            });
            readStream.pipe(parser);
        });
    }
    /**
     * Stream JSON processing (for large JSON arrays)
     */
    async processJSONStreaming(inputPath, outputPath) {
        const fileContent = await fs.readFile(inputPath, 'utf8');
        let data;
        try {
            data = JSON.parse(fileContent);
        }
        catch (error) {
            throw new Error('Invalid JSON format');
        }
        if (!Array.isArray(data)) {
            throw new Error('JSON must contain an array of records');
        }
        // Write processed data to output file
        await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
        return {
            recordCount: data.length,
            fields: data.length > 0 ? Object.keys(data[0]) : [],
            sampleData: data.slice(0, 5)
        };
    }
    /**
     * Stream Excel processing
     */
    async processExcelStreaming(inputPath, outputPath) {
        // For Excel files, we need to load the workbook first
        const workbook = XLSX.readFile(inputPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert to JSON with streaming-like processing
        const data = XLSX.utils.sheet_to_json(worksheet);
        // Write processed data to output file
        await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
        return {
            recordCount: data.length,
            fields: data.length > 0 ? Object.keys(data[0]) : [],
            sampleData: data.slice(0, 5)
        };
    }
    /**
     * Read data from processed stream file in chunks
     */
    async readStreamedData(streamPath, processor, chunkSize = 100) {
        try {
            const fileContent = await fs.readFile(streamPath, 'utf8');
            const data = JSON.parse(fileContent);
            if (!Array.isArray(data)) {
                throw new Error('Streamed data is not an array');
            }
            // Process in chunks
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await processor.processChunk(chunk);
            }
            await processor.finalize();
        }
        finally {
            // Clean up processed file
            await this.deleteTempFile(streamPath);
        }
    }
    /**
     * Get data preview from file without full processing
     */
    async getFilePreview(file, sampleSize = 10) {
        try {
            switch (file.mimetype) {
                case 'text/csv':
                    return this.getCSVPreview(file.buffer, sampleSize);
                case 'application/json':
                    return this.getJSONPreview(file.buffer, sampleSize);
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                case 'application/vnd.ms-excel':
                    return this.getExcelPreview(file.buffer, sampleSize);
                default:
                    throw new Error(`Preview not supported for format: ${file.mimetype}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to generate preview: ${error.message}`);
        }
    }
    // Preview methods
    async getCSVPreview(buffer, sampleSize) {
        const content = buffer.toString('utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const sampleLines = lines.slice(0, sampleSize + 1); // +1 for header
        return new Promise((resolve, reject) => {
            const sampleData = [];
            let fields = [];
            const parser = parseCSV({
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
            parser.on('readable', function () {
                let record;
                while (record = parser.read()) {
                    if (fields.length === 0) {
                        fields = Object.keys(record);
                    }
                    sampleData.push(record);
                }
            });
            parser.on('error', reject);
            parser.on('end', () => {
                resolve({
                    fields,
                    sampleData,
                    estimatedRecords: lines.length - 1 // Exclude header
                });
            });
            parser.write(sampleLines.join('\n'));
            parser.end();
        });
    }
    async getJSONPreview(buffer, sampleSize) {
        const content = buffer.toString('utf8');
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error('JSON must contain an array of records');
        }
        const sampleData = data.slice(0, sampleSize);
        const fields = data.length > 0 ? Object.keys(data[0]) : [];
        return {
            fields,
            sampleData,
            estimatedRecords: data.length
        };
    }
    async getExcelPreview(buffer, sampleSize) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        const sampleData = data.slice(0, sampleSize);
        const fields = data.length > 0 ? Object.keys(data[0]) : [];
        return {
            fields,
            sampleData,
            estimatedRecords: data.length
        };
    }
    // Parsing methods
    async parseJSON(buffer) {
        const content = buffer.toString('utf8');
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error('JSON must contain an array of records');
        }
        return data;
    }
    async parseCSVBuffer(buffer) {
        const content = buffer.toString('utf8');
        return new Promise((resolve, reject) => {
            const records = [];
            const parser = parseCSV({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                cast: true,
                cast_date: true
            });
            parser.on('readable', function () {
                let record;
                while (record = parser.read()) {
                    records.push(record);
                }
            });
            parser.on('error', reject);
            parser.on('end', () => resolve(records));
            parser.write(content);
            parser.end();
        });
    }
    async parseExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }
    // Utility methods
    async validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }
        if (file.size > this.options.maxFileSize) {
            throw new Error(`File size exceeds limit of ${this.formatFileSize(this.options.maxFileSize)}`);
        }
        if (!this.options.supportedFormats.includes(file.mimetype)) {
            throw new Error(`Unsupported file format: ${file.mimetype}`);
        }
        // Additional MIME type validation
        const extension = path.extname(file.originalname).toLowerCase();
        const expectedMimeTypes = {
            '.csv': ['text/csv', 'application/csv'],
            '.json': ['application/json'],
            '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            '.xls': ['application/vnd.ms-excel']
        };
        if (expectedMimeTypes[extension] && !expectedMimeTypes[extension].includes(file.mimetype)) {
            throw new Error(`File extension ${extension} does not match MIME type ${file.mimetype}`);
        }
    }
    async analyzeFile(file) {
        return {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            encoding: 'utf8'
        };
    }
    async createTempFile(file) {
        const tempFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.originalname}`;
        const tempFilePath = path.join(this.options.tempDir, tempFileName);
        await fs.writeFile(tempFilePath, file.buffer);
        this.tempFiles.add(tempFilePath);
        return tempFilePath;
    }
    async deleteTempFile(filePath) {
        try {
            await fs.unlink(filePath);
            this.tempFiles.delete(filePath);
        }
        catch (error) {
            console.error('Error deleting temp file:', error);
        }
    }
    async ensureTempDir() {
        try {
            await fs.mkdir(this.options.tempDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating temp directory:', error);
        }
    }
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    }
    /**
     * Clean up all temporary files
     */
    async cleanup() {
        const cleanupPromises = Array.from(this.tempFiles).map(filePath => this.deleteTempFile(filePath));
        await Promise.all(cleanupPromises);
    }
    /**
     * Get processing statistics
     */
    getStats() {
        return {
            tempFilesCount: this.tempFiles.size,
            maxFileSize: this.formatFileSize(this.options.maxFileSize),
            streamingThreshold: this.formatFileSize(this.options.streamingThreshold),
            supportedFormats: this.options.supportedFormats
        };
    }
    /**
     * Update processing options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
}
// Export singleton instance
export const fileProcessor = FileProcessor.getInstance();
//# sourceMappingURL=file-processor.js.map