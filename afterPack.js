/**
 * afterPack.js - electron-builder hook
 *
 * Replaces Electron's default libffmpeg (which lacks proprietary codecs)
 * with a Chromium-branded version that includes H.264 and AAC support.
 *
 * The Chromium-branded ffmpeg is fetched from the official Electron releases
 * for the exact Electron version being used.
 *
 * Reference: https://github.com/electron/electron/blob/main/docs/tutorial/represented-file.md
 * and: https://electronjs.org/releases/stable
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// Electron version from the local installation
function getElectronVersion() {
    try {
        const pkg = require(path.join(__dirname, 'node_modules', 'electron', 'package.json'));
        return pkg.version;
    } catch (e) {
        throw new Error('Could not determine Electron version: ' + e.message);
    }
}

function getPlatformLibName(platform) {
    if (platform === 'win32') return 'ffmpeg.dll';
    if (platform === 'darwin') return 'libffmpeg.dylib';
    return 'libffmpeg.so';
}

function getDownloadUrl(version, platform, arch) {
    const archMap = { x64: 'x64', arm64: 'arm64', ia32: 'ia32' };
    const platformMap = { win32: 'win32', darwin: 'darwin', linux: 'linux' };
    const electronArch = archMap[arch] || 'x64';
    const electronPlatform = platformMap[platform] || platform;
    return `https://github.com/electron/electron/releases/download/v${version}/ffmpeg-v${version}-${electronPlatform}-${electronArch}.zip`;
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const TIMEOUT_MS = 60000;

        const attempt = (reqUrl, hops = 0) => {
            if (hops > 5) return reject(new Error('Too many redirects'));

            console.log(`[afterPack] ${hops === 0 ? 'Downloading' : '  → redirect'}: ${reqUrl}`);

            const req = https.get(reqUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    res.resume(); // drain and ignore redirect response body
                    attempt(res.headers.location, hops + 1);
                    return;
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
                }
                // Only create the WriteStream for the final (non-redirect) response
                const file = fs.createWriteStream(destPath);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', (err) => {
                    fs.unlink(destPath, () => {});
                    reject(err);
                });
            });

            req.setTimeout(TIMEOUT_MS, () => {
                req.destroy();
                reject(new Error(`Download timed out after ${TIMEOUT_MS / 1000}s`));
            });

            req.on('error', reject);
        };

        attempt(url);
    });
}

exports.default = async function afterPack(context) {
    const { appOutDir, packager } = context;
    const platform = packager.platform.nodeName; // 'win32', 'darwin', 'linux'
    const arch = context.arch === 1 ? 'x64' : context.arch === 3 ? 'arm64' : 'x64'; // Arch enum: 1=x64, 3=arm64

    console.log(`[afterPack] Platform: ${platform}, Arch: ${arch}`);

    const electronVersion = getElectronVersion();
    console.log(`[afterPack] Electron version: ${electronVersion}`);

    const libName = getPlatformLibName(platform);

    // Locate the existing ffmpeg lib inside the packed app
    let libPath;
    if (platform === 'darwin') {
        libPath = path.join(appOutDir, `${packager.appInfo.productName}.app`, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Libraries', libName);
    } else if (platform === 'win32') {
        libPath = path.join(appOutDir, libName);
    } else {
        libPath = path.join(appOutDir, libName);
    }

    if (!fs.existsSync(libPath)) {
        console.warn(`[afterPack] FFmpeg lib not found at: ${libPath}. Skipping replacement.`);
        return;
    }

    // Download the Chromium-branded ffmpeg zip
    const tmpDir = require('os').tmpdir();
    const zipPath = path.join(tmpDir, `electron-ffmpeg-${electronVersion}-${platform}-${arch}.zip`);
    const extractDir = path.join(tmpDir, `electron-ffmpeg-${electronVersion}-${platform}-${arch}`);

    const downloadUrl = getDownloadUrl(electronVersion, platform, arch);

    try {
        if (!fs.existsSync(zipPath)) {
            await downloadFile(downloadUrl, zipPath);
        } else {
            console.log(`[afterPack] Using cached zip: ${zipPath}`);
        }

        // Extract the zip
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true });
        fs.mkdirSync(extractDir, { recursive: true });

        // Use system unzip or powershell on Windows
        if (platform === 'win32' || process.platform === 'win32') {
            execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
        } else {
            execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'inherit' });
        }

        // Find the extracted lib
        const extractedLib = path.join(extractDir, libName);
        if (!fs.existsSync(extractedLib)) {
            console.warn(`[afterPack] Extracted lib not found at: ${extractedLib}. Skipping.`);
            return;
        }

        // Replace the bundled ffmpeg
        console.log(`[afterPack] Replacing: ${libPath}`);
        fs.copyFileSync(extractedLib, libPath);
        console.log(`[afterPack] ✅ FFmpeg with proprietary codecs installed successfully.`);

    } catch (err) {
        // Non-fatal: Log the error but don't abort the build
        console.error(`[afterPack] ⚠️  FFmpeg replacement failed (non-fatal): ${err.message}`);
        console.error('[afterPack] Videos may lack audio on Windows for certain codecs.');
    }
};
