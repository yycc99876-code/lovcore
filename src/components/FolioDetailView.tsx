import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Item, LovcoreDocumentBody, LovcoreSpace } from '../types';
import { useTranslatedSpace } from '../i18n';
import { useTranslation } from '../i18n';
import { ContentCard } from './ContentCard';
import { MasonryWaterfall } from './MasonryWaterfall';
import { QuickNoteCard } from './QuickNoteCard';

interface FolioDetailViewProps {
  space: LovcoreSpace;
  items: Item[];
  onBack: () => void;
  onSelectCard: (item: Item) => void;
  onDeleteCard: (id: string, event: React.MouseEvent) => void;
  onFileDrop: (file: File, spaceId?: string) => void;
  onSaveQuickNote: (
    content: string,
    bodyOrSpaceId?: LovcoreDocumentBody | string,
    noteBgColorOrSpaceId?: string,
    spaceId?: string,
  ) => void;
  onDeleteSpace?: () => void;
}

const getFolioItems = (space: LovcoreSpace, items: Item[]) => {
  if (space.id === 'space-all') return items;

  return items.filter((item) => {
    // Explicit assignment
    if (item.assignedSpaceIds?.includes(space.id)) return true;

    if (space.selectedType && space.selectedType !== 'all' && item.type !== space.selectedType) return false;
    if (space.tags && space.tags.length > 0) {
      return space.tags.every((tag) => item.tags.includes(tag));
    }
    if (space.query) {
      const haystack = [item.title, item.summary, item.content, item.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(space.query.toLowerCase());
    }
    return false;
  });
};

export const FolioDetailView = ({
  space,
  items,
  onBack,
  onSelectCard,
  onDeleteCard,
  onFileDrop,
  onSaveQuickNote,
  onDeleteSpace,
}: FolioDetailViewProps) => {
  const { t } = useTranslation();
  const { name } = useTranslatedSpace(space);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const filteredItems = getFolioItems(space, items);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.items?.length) setIsDragOver(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragOver(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      dragCounter.current = 0;

      if (e.dataTransfer?.files?.length) {
        Array.from(e.dataTransfer.files).forEach((file) => onFileDrop(file, space.id));
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
  }, [onFileDrop, space.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => onFileDrop(file, space.id));
    e.target.value = '';
  };

  return (
    <div className="view-fade-in folio-detail-view">
      <div className="folio-detail-header">
        <button className="folio-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <span
          className="space-color-dot"
          style={{ borderColor: space.color || 'var(--accent)' }}
        />
        <h2 className="folio-detail-title">{name}</h2>
        <span className="folio-detail-count">{filteredItems.length} {t.spaces.cards}</span>
        <button
          className="folio-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          Upload
        </button>
        {onDeleteSpace && (
          <button
            className="folio-delete-btn"
            onClick={onDeleteSpace}
            title="Delete this folio"
            aria-label="Delete folio"
          >
            <Trash2 size={15} />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {filteredItems.length > 0 ? (
        <MasonryWaterfall>
          <QuickNoteCard onSaveNote={(content, body, noteBgColor) => onSaveQuickNote(content, body, noteBgColor, space.id)} />
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onSelect={onSelectCard}
              onDelete={onDeleteCard}
            />
          ))}
        </MasonryWaterfall>
      ) : (
        <div className={`folio-empty-drop-zone ${isDragOver ? 'drag-active' : ''}`}>
          <h2 className="empty-title">This folio is empty</h2>
          <p className="empty-subtitle">
            Drag and drop files here, or use the upload button to add content to this folio.
          </p>
        </div>
      )}
    </div>
  );
};
