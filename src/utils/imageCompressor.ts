/**
 * Client-Side Image Compressor for Payment Proof Screenshots
 * Requirement: PRD Section 7 & Phase 8: Compress screenshot below 250 KB before private storage upload
 */

export interface CompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
}

export async function compressPaymentProof(
  file: File,
  maxSizeBytes: number = 250 * 1024 // 250 KB limit
): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  // If already under target size, return original
  if (originalSizeBytes <= maxSizeBytes) {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 1,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // Calculate bounded dimensions
        const maxDimension = 1280; // Crisp enough for transaction receipts, small footprint
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            file,
            originalSizeBytes,
            compressedSizeBytes: originalSizeBytes,
            compressionRatio: 1,
          });
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression starting at quality 0.8
        let quality = 0.8;
        const attemptCompression = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({
                  file,
                  originalSizeBytes,
                  compressedSizeBytes: originalSizeBytes,
                  compressionRatio: 1,
                });
                return;
              }

              if (blob.size <= maxSizeBytes || q <= 0.3) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                  { type: 'image/jpeg' }
                );
                resolve({
                  file: compressedFile,
                  originalSizeBytes,
                  compressedSizeBytes: compressedFile.size,
                  compressionRatio: Number((compressedFile.size / originalSizeBytes).toFixed(2)),
                });
              } else {
                // Try lower quality
                attemptCompression(q - 0.15);
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompression(quality);
      };

      img.onerror = () => {
        reject(new Error('Image decode error during screenshot processing'));
      };
    };

    reader.onerror = () => {
      reject(new Error('File reading failed during compression'));
    };
  });
}
