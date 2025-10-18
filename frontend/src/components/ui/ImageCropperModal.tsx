import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from './Button';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (blob: Blob) => void;
  aspect?: number;
  cropShape?: 'rect' | 'round';
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Convert crop values from pixels (display) to natural dimensions
  const pixelCrop = {
    x: crop.unit === '%' ? (crop.x * image.width) / 100 : crop.x,
    y: crop.unit === '%' ? (crop.y * image.height) / 100 : crop.y,
    width: crop.unit === '%' ? (crop.width * image.width) / 100 : crop.width,
    height: crop.unit === '%' ? (crop.height * image.height) / 100 : crop.height,
  };

  canvas.width = pixelCrop.width * scaleX;
  canvas.height = pixelCrop.height * scaleY;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  aspect = 1,
  cropShape = 'round',
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = async () => {
    if (imgRef.current && crop.width && crop.height) {
      const croppedImageBlob = await getCroppedImg(imgRef.current, crop);
      if (croppedImageBlob) {
        onSave(croppedImageBlob);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-title">Crop Image</h2>
        <div className="mt-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={aspect}
            circularCrop={cropShape === 'round'}
          >
            <img ref={imgRef} src={imageSrc} alt="Crop preview" />
          </ReactCrop>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
