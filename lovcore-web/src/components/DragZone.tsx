'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';

interface DragZoneProps {
  onFileDrop: (file: File) => void;
}

export const DragZone: React.FC<DragZoneProps> = ({ onFileDrop }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        onFileDrop(file);
        e.dataTransfer.clearData();
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFileDrop]);

  return (
    <div className={`drag-overlay ${isDragging ? 'active' : ''}`}>
      <div className="drag-content">
        <div className="drag-archival-frame">
          <h2 className="drag-title">{t.dragZone.title}</h2>
          <p className="drag-subtitle">
            {t.dragZone.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
