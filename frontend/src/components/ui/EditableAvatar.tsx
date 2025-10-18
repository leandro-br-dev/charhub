import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ImageCropperModal } from './ImageCropperModal';
import { Button } from './Button';
import { userService } from '../../services/userService';

export function EditableAvatar() {
  const { user, updateUser } = useAuth();
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
        setIsCropperOpen(true);
      });
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleCropSave = async (blob: Blob) => {
    const file = new File([blob], 'avatar.png', { type: 'image/png' });
    try {
      const updatedUser = await userService.uploadAvatar(file);
      updateUser(updatedUser);
      setIsCropperOpen(false);
    } catch (error) {
      console.error('Failed to upload avatar', error);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div className="cursor-pointer" onClick={handleAvatarClick}>
        {user?.photo ? (
          <img src={user.photo} alt="Avatar" className="h-24 w-24 rounded-full" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
            {user?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>
      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
