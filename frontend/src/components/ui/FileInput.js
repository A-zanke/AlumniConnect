import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';

const FileInput = ({
  label,
  accept = 'image/*',
  onChange,
  multiple = false,
  showPreview = true,
  previewClassName = 'h-32',
  name,
  error,
  required = false,
}) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Generate previews for images and videos
      const previewURLs = selectedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return { url: URL.createObjectURL(file), type: 'image' };
        } else if (file.type.startsWith('video/')) {
          return { url: URL.createObjectURL(file), type: 'video' };
        } else {
          return { url: null, type: 'file', name: file.name };
        }
      });
      
      setPreviews(previewURLs);
      
      // Call parent onChange handler with the selected files
      if (onChange) {
        onChange(multiple ? selectedFiles : selectedFiles[0]);
      }
    }
  };

  const clearFiles = () => {
    // Revoke object URLs to prevent memory leaks
    previews.forEach(preview => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });
    
    setFiles([]);
    setPreviews([]);
    
    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call parent onChange handler with null/empty value
    if (onChange) {
      onChange(multiple ? [] : null);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="form-label flex items-center">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          name={name}
        />

        {files.length === 0 ? (
          <div className="py-4">
            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400">
              {accept === 'image/*'
                ? 'PNG, JPG, GIF up to 10MB'
                : accept === 'video/*'
                ? 'MP4, MOV up to 50MB'
                : 'Files up to 10MB'}
            </p>
          </div>
        ) : showPreview ? (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFiles();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
              aria-label="Remove file"
            >
              <FiX size={16} />
            </button>

            <div className={`grid gap-2 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
              {previews.map((preview, index) => (
                <div key={index} className="rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                  {preview.type === 'image' ? (
                    <img
                      src={preview.url}
                      alt={`Preview ${index}`}
                      className={`w-full object-cover ${previewClassName}`}
                    />
                  ) : preview.type === 'video' ? (
                    <video
                      src={preview.url}
                      controls
                      className={`w-full object-cover ${previewClassName}`}
                    />
                  ) : (
                    <div className={`flex flex-col items-center justify-center ${previewClassName}`}>
                      <FiFile size={24} className="text-gray-500" />
                      <span className="mt-2 text-sm text-gray-500 truncate max-w-full px-2">
                        {preview.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {multiple
                ? `${files.length} file${files.length !== 1 ? 's' : ''} selected`
                : files[0].name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFiles();
              }}
              className="ml-2 text-red-500 hover:text-red-700"
              aria-label="Remove file"
            >
              <FiX size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FileInput;