import React from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';

export interface FileUploadProps {
  /** Accepted file types (e.g., 'image/*,.pdf') */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Callback fired when files are selected */
  onUpload?: (files: File[]) => void;
  /** Visual variant: single, multiple, dragdrop */
  variant?: 'single' | 'multiple' | 'dragdrop';
  /** Button label */
  label?: string;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({ accept, maxSize, multiple = false, onUpload, variant = 'single', label = 'Selecionar ficheiro' }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [selectedFiles, setSelectedFiles] = React.useState<string[]>([]);

    const handleFiles = (files: FileList | null) => {
      if (!files) return;
      const fileArray = Array.from(files);
      const valid = maxSize ? fileArray.filter(f => f.size <= maxSize) : fileArray;
      setSelectedFiles(valid.map(f => f.name));
      onUpload?.(valid);
    };

    const handleClick = () => inputRef.current?.click();

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    };

    if (variant === 'dragdrop') {
      return (
        <Box ref={ref}>
          <Paper
            variant="outlined"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={handleClick}
            sx={{
              p: 4, textAlign: 'center', cursor: 'pointer',
              borderStyle: 'dashed', borderWidth: 2,
              backgroundColor: dragOver ? 'action.hover' : 'transparent',
              transition: 'background-color 0.2s',
            }}
          >
            <Typography variant="body1" gutterBottom>
              Arraste ficheiros para aqui
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ou clique para selecionar
            </Typography>
          </Paper>
          <input ref={inputRef} type="file" hidden accept={accept} multiple={multiple} onChange={e => handleFiles(e.target.files)} />
          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {selectedFiles.map((name, i) => (
                <Typography key={i} variant="caption" display="block" color="text.secondary">{name}</Typography>
              ))}
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Box ref={ref}>
        <Button variant="outlined" onClick={handleClick}>
          {label}
        </Button>
        <input ref={inputRef} type="file" hidden accept={accept} multiple={variant === 'multiple' || multiple} onChange={e => handleFiles(e.target.files)} />
        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {selectedFiles.map((name, i) => (
              <Typography key={i} variant="caption" display="block" color="text.secondary">{name}</Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  }
);

FileUpload.displayName = 'FileUpload';
export default FileUpload;
