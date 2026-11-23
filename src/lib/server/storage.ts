import fs from 'fs'
import path from 'path'
import { Readable } from 'stream';
import { createClient, type FileStat, type WebDAVClient } from 'webdav';

/** A file or folder in a folder listing. Hidden entries (starting with ".") are left out. */
export interface StorageEntry {
    name: string;
    isFolder: boolean;
    size?: number; // bytes, files only
}

/** A file's content, streamed as is */
export interface FileStream {
    stream: ReadableStream<Uint8Array>;
    size: number; // bytes
}

export interface PersistedStorage {
    readTextFileContent(filePath: string): Promise<string>;
    writeTextFile(content: string, filePath: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    readFileStream(filePath: string): Promise<FileStream>;
    writeFile(filePath: string, data: Uint8Array): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    createDirectory(dirPath: string): Promise<void>;
    listFolder(dirPath: string): Promise<StorageEntry[]>;
}

const isHidden = (name: string) => name.startsWith('.');

/** A name that stays one entry of its folder: no separators, not "." or ".." */
export function isFolderName(name: unknown): name is string {
    return typeof name == 'string' && name != '' && name != '.' && name != '..' && !/[/\\\0]/.test(name);
}

/** Throws unless `fullPath` is `root` or inside it. Both normalised, absolute, in the syntax of `paths`. */
export function assertInside(root: string, fullPath: string, paths: path.PlatformPath): void {
    const relative = paths.relative(root, fullPath);
    if (fullPath.includes('\0') || relative == '..' || relative.startsWith('..' + paths.sep) || paths.isAbsolute(relative))
        throw new FileAccessError(`Outside the songs folder: ${fullPath}`);
}

/** Files under `basePath`. Paths are relative to it, and can't leave its folder `root`. */
export class FilesystemStorage implements PersistedStorage {
    basePath: string;
    root: string;

    constructor(basePath: string, root: string) {
        this.basePath = basePath;
        this.root = path.resolve(path.join(basePath, root));
    }

    private full(...pathSegments: string[]): string {
        const fullPath = path.join(this.basePath, ...pathSegments);
        assertInside(this.root, path.resolve(fullPath), path);
        return fullPath;
    }

    async readTextFileContent(filePath: string): Promise<string> {
        const fullPath = this.full(filePath);
        return fs.promises.readFile(fullPath, 'utf-8').catch(() => { throw new FileNotFoundError(filePath); });
    }

    async writeTextFile(content: string, filePath: string): Promise<void> {
        const fullPath = this.full(filePath);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, content, 'utf-8');
    }

    async deleteFile(filePath: string): Promise<void> {
        fs.rmSync(this.full(filePath));
    }

    async readFileStream(filePath: string): Promise<FileStream> {
        const fullPath = this.full(filePath);
        const stats = await fs.promises.stat(fullPath).catch(() => { throw new FileNotFoundError(filePath); });
        return {
            stream: Readable.toWeb(fs.createReadStream(fullPath)) as ReadableStream<Uint8Array>,
            size: stats.size,
        };
    }

    async writeFile(filePath: string, data: Uint8Array): Promise<void> {
        const fullPath = this.full(filePath);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, data);
    }

    async fileExists(filePath: string): Promise<boolean> {
        return fs.existsSync(this.full(filePath));
    }

    async createDirectory(dirPath: string): Promise<void> {
        fs.mkdirSync(this.full(dirPath), { recursive: true });
    }

    async listFolder(dirPath: string): Promise<StorageEntry[]> {
        const fullPath = this.full(dirPath);
        const dirents = await fs.promises.readdir(fullPath, { withFileTypes: true })
            .catch(() => { throw new FileNotFoundError(dirPath); });
        return dirents
            .filter(dirent => !isHidden(dirent.name))
            .map(dirent => ({
                name: dirent.name,
                isFolder: dirent.isDirectory(),
                size: dirent.isDirectory() ? undefined : fs.statSync(path.join(fullPath, dirent.name)).size,
            }));
    }

}

/** Files on a WebDAV server. Paths can't leave the folder `root`. */
export class WebdavStorage implements PersistedStorage {

    client: WebDAVClient;
    concurrency: number;
    root: string;

    constructor(server: string, username: string, password: string, root: string, concurrency: number = 5) {
        this.client = createClient(
            server,
            {
                username: username,
                password: password
            }
        );
        this.concurrency = concurrency;
        this.root = path.posix.join('/', root);
    }

    private full(...pathSegments: string[]): string {
        const fullPath = path.join(...pathSegments);
        assertInside(this.root, path.posix.join('/', fullPath), path.posix);
        return fullPath;
    }

    async readTextFileContent(filePath: string): Promise<string> {
        return await this.client.getFileContents(this.full(filePath), { format: "text" }).catch(webdavNotFound(filePath)) as string;
    }

    async writeTextFile(content: string, filePath: string): Promise<void> {
        await this.writeFile(filePath, new TextEncoder().encode(content));
    }

    async deleteFile(filePath: string): Promise<void> {
        await this.client.deleteFile(this.full(filePath));
    }

    async readFileStream(filePath: string): Promise<FileStream> {
        filePath = this.full(filePath);
        const stats = await this.client.stat(filePath).catch(webdavNotFound(filePath)) as FileStat;
        return {
            stream: Readable.toWeb(this.client.createReadStream(filePath) as Readable) as ReadableStream<Uint8Array>,
            size: stats.size,
        };
    }

    async writeFile(filePath: string, data: Uint8Array): Promise<void> {
        filePath = this.full(filePath);
        await this.client.createDirectory(path.dirname(filePath), { recursive: true });
        if (!await this.client.putFileContents(filePath, Buffer.from(data)))
            throw new FileAccessError("WebDAV 'putFileContents' call failed for path: " + filePath);
    }

    async fileExists(filePath: string): Promise<boolean> {
        return this.client.exists(this.full(filePath));
    }

    async listFolder(dirPath: string): Promise<StorageEntry[]> {
        const contents = await this.client.getDirectoryContents(this.full(dirPath)).catch(webdavNotFound(dirPath)) as FileStat[];
        return contents
            .filter(element => !isHidden(element.basename))
            .map(element => ({
                name: element.basename,
                isFolder: element.type == "directory",
                size: element.type == "file" ? element.size : undefined,
            }));
    }

    async createDirectory(dirPath: string): Promise<void> {
        await this.client.createDirectory(this.full(dirPath), {recursive: true});
    }
}

/** A WebDAV error handler that turns 404s into FileNotFoundError */
function webdavNotFound(filePath: string) {
    return (err: any): never => {
        if (err.response?.status == 404)
            throw new FileNotFoundError(filePath);
        throw Error("WebDAV error: " + err.toString());
    };
}

export class FileNotFoundError extends Error {};
export class FileAccessError extends Error {};