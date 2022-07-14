import React, { ChangeEvent } from 'react';
import convertAudio from './convertAudio';
import { IConvertedAudio, TAudioFormat } from './types';

const App = () => {

  const convertToAudio = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event?.target?.files?.length && event?.target?.files?.length > 0) {
      let sourceVideoFile: File = event.target.files[0];
      let targetAudioFormat: TAudioFormat = "wav";
      const convertedAudioDataObj: IConvertedAudio | void = await convertAudio(sourceVideoFile, targetAudioFormat);

      if(convertedAudioDataObj) {
        let a = document.createElement("a");
        a.href = convertedAudioDataObj.data;
        a.download = convertedAudioDataObj.name + "." + convertedAudioDataObj.format;
        a.click();
      }
    }
  }

  return (
    <div >
      <input type='file' accept=".mp4, .avi, .mov" onChange={convertToAudio} />

    </div>
  );
}

export default App;
