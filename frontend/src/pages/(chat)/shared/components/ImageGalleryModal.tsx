
// frontend/src/pages/(chat)/shared/components/ImageGalleryModal.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from "react-i18next";
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';

// --- Placeholder Components ---
const ImageGalleryGrid: React.FC<any> = ({ images, loading, error, onImageClick }) => {
    if (loading) return <p>Loading images...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <div className="grid grid-cols-4 gap-4">
            {images.map((img: string, index: number) => (
                <img key={index} src={img} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => onImageClick(img, index)} />
            ))}
        </div>
    );
};
const ImageViewerModal: React.FC<any> = ({ isOpen, onClose, images, initialIndex }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" className="!max-w-6xl">
            <img src={images[initialIndex]} alt="" className="max-w-full max-h-[80vh]" />
        </Modal>
    );
};

// --- Placeholder Services ---
const characterService = {
    getCharacterImages: async (characterId: string, tab: string) => ({ success: true, data: [] }),
};
const chatService = {
    getConversationGallery: async (conversationId: string) => ({ success: true, data: [] }),
};


const ImageGalleryModal = ({
    isOpen,
    onClose,
    title,
    mode = "view",
    onImageSelect,
    characterId,
    conversationId,
    participants = [],
    imageUrls: propImageUrls,
    loading: propLoading = false,
    error: propError = null,
}: any) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [internalImages, setInternalImages] = useState<string[]>([]);
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    const isSmartMode = !!characterId || (!!conversationId && !propImageUrls);
    const images = isSmartMode ? internalImages : propImageUrls || [];
    const loading = isSmartMode ? internalLoading : propLoading;
    const error = isSmartMode ? internalError : propError;

    const tabs = useMemo(() => {
        const baseTabs = [
            { key: "gallery", label: t('conversationSettings.galleryButton') },
            { key: "avatar", label: t('characterFormPage.visualsTabs.avatars') },
            { key: "lora_samples", label: t('characterFormPage.visualsTabs.samples') },
            { key: "stickers", label: t('characterFormPage.visualsTabs.stickers') },
        ];
        if (characterId) return baseTabs.filter(t => t.key !== 'gallery');
        if (conversationId) return baseTabs;
        return [];
    }, [t, characterId, conversationId]);

    const fetchImages = useCallback(async (tab: string) => {
        if (!isSmartMode || !tab) return;
        setInternalLoading(true);
        setError(null);
        let imageUrls = new Set<string>();
        try {
            let result: any;
            if (tab === 'gallery' && conversationId) {
                result = await chatService.getConversationGallery(conversationId);
            } else if (characterId) {
                result = await characterService.getCharacterImages(characterId, tab);
            } else if (mode === 'select' && conversationId) {
                const charIds = participants.map((p: any) => p.acting_character_id).filter(Boolean);
                const charImagePromises = charIds.map((id: string) => characterService.getCharacterImages(id, 'lora_samples'));
                const results = await Promise.all([chatService.getConversationGallery(conversationId), ...charImagePromises]);
                results.forEach((res: any) => {
                    if (res.success) res.data.forEach((url: string) => imageUrls.add(url));
                });
                setInternalImages(Array.from(imageUrls));
                setInternalLoading(false);
                return;
            }

            if (result && result.success) {
                result.data.forEach((url: string) => imageUrls.add(url));
            } else if (result) {
                throw new Error(result.error || "Erro ao carregar imagens.");
            }
            
            setInternalImages(Array.from(imageUrls));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInternalLoading(false);
        }
    }, [isSmartMode, characterId, conversationId, mode, participants]);

    useEffect(() => {
        if (isOpen && isSmartMode) {
            const initialTab = characterId ? 'avatar' : (tabs.length > 0 ? tabs[0].key : null);
            setActiveTab(initialTab);
        } else if (!isOpen) {
            setActiveTab(null);
            setInternalImages([]);
            setError(null);
        }
    }, [isOpen, isSmartMode, characterId, tabs]);

    useEffect(() => {
        if (isOpen && isSmartMode && activeTab) {
            fetchImages(activeTab);
        }
    }, [isOpen, isSmartMode, activeTab, fetchImages]);

    const handleTabClick = (tabKey: string) => {
        if (tabKey !== activeTab) {
            setActiveTab(tabKey);
        }
    };

    const handleImageClickInGrid = (url: string, index: number) => {
      if (mode === 'select' && onImageSelect) {
        onImageSelect(url);
        onClose();
      } else {
        setViewerInitialIndex(index);
        setIsViewerOpen(true);
      }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onImageSelect) {
            const localUrl = URL.createObjectURL(file);
            onImageSelect(localUrl);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={title || t('conversationSettings.imageGalleryTitle')} size="xl" className="!max-w-6xl">
                <div className="flex justify-between items-center border-b border-gray-700 mb-4">
                    {tabs.length > 0 && isSmartMode && (
                        <div className="flex flex-wrap">
                            {tabs.map((tab) => (
                                <button key={tab.key} onClick={() => handleTabClick(tab.key)} className={`py-2 px-4 text-sm font-medium ${activeTab === tab.key ? "border-b-2 border-primary text-primary" : "text-muted hover:text-content"}`}>{tab.label}</button>
                            ))}
                        </div>
                    )}
                    {mode === 'select' && characterId && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <Button variant="secondary" icon="upload_file" onClick={() => fileInputRef.current?.click()}>Fazer Upload</Button>
                        </>
                    )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <ImageGalleryGrid 
                        images={images}
                        loading={loading}
                        error={error}
                        activeTab={activeTab}
                        onImageClick={handleImageClickInGrid}
                    />
                </div>
            </Modal>
            <ImageViewerModal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                images={images}
                initialIndex={viewerInitialIndex}
            />
        </>
    );
};

export default ImageGalleryModal;
