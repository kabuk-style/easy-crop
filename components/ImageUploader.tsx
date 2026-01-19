
import React, { useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-400');
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLLabelElement>) => {
    event.currentTarget.classList.add('border-indigo-400');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.currentTarget.classList.remove('border-indigo-400');
  };

  return (
    <div className="w-full">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className="flex flex-col items-center justify-center w-full h-64 px-4 transition bg-gray-800 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-gray-400 focus:outline-none"
      >
        <span className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </span>
        <span className="font-medium text-gray-400 mt-4 text-center">
          Drop your image here, or
          <span className="text-indigo-400 underline ml-1">browse</span>
        </span>
        <input type="file" name="file_upload" className="hidden" accept="image/*" onChange={handleFileChange} ref={inputRef} />
      </label>
    </div>
  );
};

export default ImageUploader;
