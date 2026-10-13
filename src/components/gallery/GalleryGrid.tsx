import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Camera, Image as ImageIcon, MapPin, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { GalleryItemRecord } from '../../types';
import { getSafeYouTubeEmbedUrl } from '../../utils/url';
import { extractYouTubeVideoId } from '../../utils/youtube';

export interface GalleryGridProps {
  items?: GalleryItemRecord[];
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ items: propsItems }) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [galleryList, setGalleryList] = useState<GalleryItemRecord[]>(propsItems || []);
  const [loading, setLoading] = useState(!propsItems);

  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Video Modal state
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (propsItems) {
      setGalleryList(propsItems);
      setLoading(false);
      return;
    }
    async function loadPublished() {
      try {
        setLoading(true);
        const fetched = await CmsService.getGalleryItems(true);
        setGalleryList(fetched);
      } catch (err) {
        console.warn('Error loading gallery items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublished();
  }, [propsItems]);

  // Section 2.10 categories: All, Campus, Lab, Workshops, Testing, Events, Students, Videos
  const categories = [
    { id: 'all', label: isRoman ? 'Tamam (All)' : 'All' },
    { id: 'campus', label: isRoman ? 'Campus' : 'Campus' },
    { id: 'lab', label: isRoman ? 'Computer Lab' : 'Computer Lab' },
    { id: 'workshops', label: isRoman ? 'Workshops' : 'Workshops' },
    { id: 'testing', label: isRoman ? 'Testing' : 'Testing' },
    { id: 'events', label: isRoman ? 'Events' : 'Events' },
    { id: 'students', label: isRoman ? 'Students' : 'Students' },
    { id: 'videos', label: isRoman ? 'Videos' : 'Videos' },
  ];

  const filteredItems = galleryList.filter((item) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'videos') {
      return item.mediaType === 'video' || item.category === 'videos' || Boolean(item.videoUrl);
    }
    return item.category === activeCategory;
  });

  // Lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredItems.length]);

  const openItem = (item: GalleryItemRecord, index: number) => {
    if (item.mediaType === 'video' || item.videoUrl) {
      const embedUrl = getSafeYouTubeEmbedUrl(item.videoUrl);
      if (embedUrl) {
        setVideoModalUrl(embedUrl);
      }
    } else {
      setLightboxIndex(index);
    }
  };

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div className="w-full space-y-6">
      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-[#1F3FBF] text-white shadow-xs'
                : 'bg-white text-[#0F1F5C]/80 border border-slate-200 hover:border-[#1F3FBF]/40 hover:text-[#1F3FBF]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title={isRoman ? 'Koi media dastiyab nahi' : 'No Media Found'}
          description={
            isRoman
              ? 'Is category mein mazeed tasweer aur videos jald shamil ki jayengi.'
              : 'Additional media for this category will be uploaded shortly.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, idx) => {
            const title = isRoman && item.titleRomanUrdu ? item.titleRomanUrdu : item.title;
            const desc = isRoman && item.descriptionRomanUrdu ? item.descriptionRomanUrdu : item.description;
            const isVideo = item.mediaType === 'video' || Boolean(item.videoUrl);
            const videoId = isVideo ? extractYouTubeVideoId(item.videoUrl) : null;
            const thumbUrl = item.imageUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

            return (
              <div
                key={item.id}
                onClick={() => openItem(item, idx)}
                className="bg-white rounded-xl border border-[#1F3FBF]/15 overflow-hidden shadow-2xs hover:shadow-lg hover:border-[#1F3FBF]/40 transition-all duration-200 flex flex-col group cursor-pointer"
              >
                {/* Visual Media Box */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0F1F5C] to-[#1F3FBF] flex items-center justify-center text-white">
                      <Camera className="w-8 h-8 text-[#FFC20E]" />
                    </div>
                  )}

                  {/* Video Play Overlay */}
                  {isVideo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#FFC20E] text-[#0F1F5C] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold tracking-wider uppercase backdrop-blur-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#0F1F5C] font-display line-clamp-1">
                      {title}
                    </h3>
                    {desc && (
                      <p className="text-xs text-[#0F1F5C]/75 mt-1 leading-relaxed line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1F3FBF]" />
                      {item.location || 'Sadiqabad'}
                    </span>
                    <Badge variant={isVideo ? 'accent' : 'secondary'} size="sm">
                      {isVideo ? 'Video' : 'Photo'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {currentLightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-12 right-0 text-white hover:text-[#FFC20E] transition-colors p-2"
              aria-label="Close Lightbox"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Prev button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null))}
                className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 text-white bg-black/50 sm:bg-transparent rounded-full p-2 hover:text-[#FFC20E] transition-colors"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* Image */}
            {currentLightboxItem.imageUrl && (
              <img
                src={currentLightboxItem.imageUrl}
                alt={currentLightboxItem.title}
                className="max-h-[75vh] w-auto max-w-full rounded-lg shadow-2xl object-contain"
              />
            )}

            {/* Next button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : null))}
                className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 text-white bg-black/50 sm:bg-transparent rounded-full p-2 hover:text-[#FFC20E] transition-colors"
                aria-label="Next Image"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            {/* Caption */}
            <div className="mt-3 text-center text-white space-y-1 max-w-xl">
              <h4 className="font-bold text-base text-[#FFC20E]">
                {isRoman && currentLightboxItem.titleRomanUrdu ? currentLightboxItem.titleRomanUrdu : currentLightboxItem.title}
              </h4>
              <p className="text-xs text-white/80">
                {isRoman && currentLightboxItem.descriptionRomanUrdu ? currentLightboxItem.descriptionRomanUrdu : currentLightboxItem.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {videoModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoModalUrl(null)}
              className="absolute top-3 right-3 z-10 bg-black/70 hover:bg-black text-white hover:text-[#FFC20E] p-1.5 rounded-full transition-colors"
              aria-label="Close Video"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              src={videoModalUrl}
              title="Academy Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};
