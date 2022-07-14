import { IConvertedAudio, TAudioFormat } from "./types";

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext
    }
}

const convertAudio = (videoFileData: File, targetAudioFormat: TAudioFormat): Promise<IConvertedAudio> | void => {
    try {
        let reader = new FileReader();
        return new Promise((resolve) => {
            reader.onload = () => {
                let contentType = 'audio/' + targetAudioFormat;
                let audioContext = new (window.AudioContext || window.webkitAudioContext)();
                let myBuffer;
                const sampleRate = 16000;
                const numberOfChannels = 1;
                let videoFileAsBuffer: ArrayBuffer | string | null = reader.result;

                if(videoFileAsBuffer) {
                    audioContext.decodeAudioData(videoFileAsBuffer as ArrayBuffer).then(function (decodedAudioData) {
                        let duration = decodedAudioData.duration;
                        let offlineAudioContext = new OfflineAudioContext(numberOfChannels, sampleRate * duration, sampleRate);
                        let soundSource = offlineAudioContext.createBufferSource();
                        myBuffer = decodedAudioData;
                        soundSource.buffer = myBuffer;
                        soundSource.connect(offlineAudioContext.destination);
                        soundSource.start();
                        offlineAudioContext.startRendering().then(function (renderedBuffer) {
                            const UintWave = createWaveFileData(renderedBuffer);
                            const b64Data = window.btoa(uint8ToString(UintWave));
                            const blob = getBlobFromBase64Data(b64Data, contentType);
                            const blobUrl = URL.createObjectURL(blob);

                            const convertedAudio: IConvertedAudio = {
                                name: videoFileData.name.substring(0, videoFileData.name.lastIndexOf(".")),
                                format: targetAudioFormat,
                                data: blobUrl
                            }
                            resolve(convertedAudio);
                        }).catch(function (err) {
                            console.log('Rendering failed: ' + err);
                        });
                    });
                } else {
                    console.log("Video Buffer is Empty");
                }
            }
            reader.readAsArrayBuffer(videoFileData);
        });
    } catch (e) {
        console.log("Error occurred while converting : ", e);
    }
}

export default convertAudio;

const getBlobFromBase64Data = (b64Data: string, contentType: string, sliceSize = 512): Blob => {
    const byteCharacters: string = window.atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
}

const createWaveFileData = (audioBuffer: AudioBuffer): Uint8Array => {
    const frameLength: number = audioBuffer.length;
    const numberOfChannels: number = audioBuffer.numberOfChannels;
    const sampleRate: number = audioBuffer.sampleRate;
    const bitsPerSample: number = 16;
    const byteRate: number = sampleRate * numberOfChannels * bitsPerSample / 8;
    const blockAlign: number = numberOfChannels * bitsPerSample / 8;
    const wavDataByteLength: number = frameLength * numberOfChannels * 2;
    const headerByteLength: number = 44;
    const totalLength: number = headerByteLength + wavDataByteLength;

    const waveFileData: Uint8Array = new Uint8Array(totalLength);

    const subChunk1Size: number = 16;
    const subChunk2Size: number = wavDataByteLength;
    const chunkSize: number = 4 + (8 + subChunk1Size) + (8 + subChunk2Size);

    writeString("RIFF", waveFileData, 0);
    writeInt32(chunkSize, waveFileData, 4);
    writeString("WAVE", waveFileData, 8);
    writeString("fmt ", waveFileData, 12);

    writeInt32(subChunk1Size, waveFileData, 16);
    writeInt16(1, waveFileData, 20);
    writeInt16(numberOfChannels, waveFileData, 22);
    writeInt32(sampleRate, waveFileData, 24);
    writeInt32(byteRate, waveFileData, 28);
    writeInt16(blockAlign, waveFileData, 32);
    writeInt32(bitsPerSample, waveFileData, 34);

    writeString("data", waveFileData, 36);
    writeInt32(subChunk2Size, waveFileData, 40);


    writeAudioBuffer(audioBuffer, waveFileData, 44);

    return waveFileData;
}

const writeString = (s: string, a: Uint8Array, offset: number): void => {
    for (let i: number = 0; i < s.length; ++i) {
        a[offset + i] = s.charCodeAt(i);
    }
}

const writeInt16 = (n: number, a: Uint8Array, offset: number): void => {
    n = Math.floor(n);

    let b1: number = n & 255;
    let b2: number = (n >> 8) & 255;

    a[offset + 0] = b1;
    a[offset + 1] = b2;
}

const writeInt32 = (n: number, a: Uint8Array, offset: number): void => {
    n = Math.floor(n);
    const b1: number = n & 255;
    const b2: number = (n >> 8) & 255;
    const b3: number = (n >> 16) & 255;
    const b4: number = (n >> 24) & 255;

    a[offset + 0] = b1;
    a[offset + 1] = b2;
    a[offset + 2] = b3;
    a[offset + 3] = b4;
}

const writeAudioBuffer = (audioBuffer: AudioBuffer, a: Uint8Array, offset: number): void => {
    let n = audioBuffer.length;
    let channels = audioBuffer.numberOfChannels;

    for (let i = 0; i < n; ++i) {
        for (let k = 0; k < channels; ++k) {
            let buffer = audioBuffer.getChannelData(k);
            let sample = buffer[i] * 32768.0;

            if (sample < -32768)
                sample = -32768;
            if (sample > 32767)
                sample = 32767;

            writeInt16(sample, a, offset);
            offset += 2;
        }
    }
}

const uint8ToString = (buf: Uint8Array): string => {
    let i, length, out = "";
    for (i = 0, length = buf.length; i < length; i += 1) {
        out += String.fromCharCode(buf[i]);
    }
    return out;
}