export type TAudioFormat = "wav" | "mp3" | "aac";

export interface IConvertedAudio {
    name: string;
    format: TAudioFormat;
    data: string;
}