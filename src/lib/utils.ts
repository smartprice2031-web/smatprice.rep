import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida se uma URL é uma imagem pública válida.
 * Aceita praticamente qualquer string que pareça uma URL ou caminho de arquivo,
 * priorizando a flexibilidade para aceitar CDNs e proxies.
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  const trimmedUrl = url.trim();
  
  // Aceita data URLs
  if (trimmedUrl.startsWith('data:image/')) {
    return true;
  }

  // Aceita URLs que começam com // (protocol-relative)
  if (trimmedUrl.startsWith('//')) {
    return true;
  }
  
  // Aceita URLs que começam com protocolos comuns
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return true;
  }
  
  // Se não tem protocolo, mas parece uma URL (tem um ponto e não tem espaços)
  // Tentamos validar se é uma URL válida adicionando o protocolo
  if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
    try {
      // Se já tem um ponto e não tem espaços, é muito provável que seja uma URL válida
      // ou um caminho de arquivo que o navegador consiga resolver.
      return true;
    } catch (e) {
      // Ignora erro e continua para outros checks
    }
  }

  // Check for common image extensions anywhere in the string (case insensitive)
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff'];
  const lowerUrl = trimmedUrl.toLowerCase();
  if (extensions.some(ext => lowerUrl.includes(ext))) {
    return true;
  }

  // Fallback final: se tiver pelo menos um ponto e não tiver espaços, aceitamos.
  // Isso é o mais permissivo possível para URLs de CDNs complexas.
  return trimmedUrl.includes('.') && !trimmedUrl.includes(' ');
};

/**
 * Retorna uma URL de imagem segura para CORS, usando um proxy se necessário.
 * Suporta uma opção de miniatura para carregamento mais rápido.
 */
export const getProxyUrl = (
  url: string | undefined | null, 
  options?: { thumbnail?: boolean; optimize?: boolean; width?: number; quality?: number; output?: string }
) => {
  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) {
    return url || '';
  }
  
  // Extract original URL if already formatted as key/relative proxy or weserv
  let originalUrl = url;
  if (url.includes('/api/image-proxy')) {
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      originalUrl = urlObj.searchParams.get('url') || url;
    } catch (e) {
      // Ignore
    }
  } else if (url.includes('weserv.nl')) {
    try {
      const urlObj = new URL(url);
      originalUrl = urlObj.searchParams.get('url') || url;
    } catch (e) {
      // Ignore
    }
  }
  
  const params = new URLSearchParams();
  
  // Make sure originalUrl has a valid http/https protocol
  let formattedUrl = originalUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    if (formattedUrl.startsWith('//')) {
      formattedUrl = 'https:' + formattedUrl;
    } else if (formattedUrl.startsWith('/')) {
      // Relative path, do not use proxy
      return formattedUrl;
    } else {
      formattedUrl = 'https://' + formattedUrl;
    }
  }

  // We use our high-compatibility, fully unblocked local proxy route directly.
  // This bypasses strict third-party CDN domain and TLD blocking policy restrictions (e.g. weserv.nl blocking postimg.cc as domain policy).
  return `/api/image-proxy?url=${encodeURIComponent(formattedUrl)}`;
};

export interface CachedImageEntry {
  img: HTMLImageElement;
  status: 'loading' | 'loaded' | 'failed';
  promise: Promise<HTMLImageElement>;
}

// Global cache for pre-loaded HTMLImageElement instances to support 100% synchronous instant render
export const imageCache: { [url: string]: CachedImageEntry } = {};

/**
 * Preloads an image into the global HTMLImageElement memory cache for synchronous instant reuse.
 * It reuses outstanding promises to avoid double requests.
 */
export const preloadImageIntoCache = (url: string, crossOrigin: string = 'anonymous'): Promise<HTMLImageElement> => {
  if (!url) return Promise.reject(new Error('Empty image URL'));
  
  if (imageCache[url]) {
    return imageCache[url].promise;
  }

  const img = new Image();
  if (crossOrigin && typeof window !== 'undefined') {
    const isRelative = url.startsWith('/') || url.startsWith('.') || !url.includes('://');
    const isSameOrigin = !isRelative && url.includes(window.location.host);
    if (isRelative || isSameOrigin) {
      // Same-origin/relative requests do not require crossOrigin and must not send it to prevent iframe boundary errors
    } else {
      img.crossOrigin = crossOrigin;
    }
  } else if (crossOrigin) {
    img.crossOrigin = crossOrigin;
  }
  img.referrerPolicy = 'no-referrer';

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      if (imageCache[url]) {
        imageCache[url].status = 'loaded';
      }
      resolve(img);
    };
    img.onerror = () => {
      if (imageCache[url]) {
        imageCache[url].status = 'failed';
      }
      reject(new Error(`Failed to load image: ${url}`));
    };
  });

  imageCache[url] = {
    img,
    status: 'loading',
    promise
  };

  img.src = url;
  return promise;
};

import { useState, useEffect } from 'react';

/**
 * High-performance hook that checks memory cache synchronously on initial mount.
 * If preloaded, returns the image instantly with zero flicker or async state delay.
 */
export const useCachedImage = (url: string | null | undefined, crossOrigin: string = 'anonymous') => {
  const [imgState, setImgState] = useState<{ img: HTMLImageElement | null; status: 'loading' | 'loaded' | 'failed' }>(() => {
    if (!url) return { img: null, status: 'loading' };
    const cached = imageCache[url];
    if (cached && cached.status === 'loaded' && cached.img.complete && cached.img.naturalWidth > 0) {
      return { img: cached.img, status: 'loaded' };
    }
    return { img: null, status: 'loading' };
  });

  useEffect(() => {
    if (!url) {
      setImgState({ img: null, status: 'loading' });
      return;
    }

    const cached = imageCache[url];
    if (cached && cached.status === 'loaded' && cached.img.complete && cached.img.naturalWidth > 0) {
      setImgState({ img: cached.img, status: 'loaded' });
      return;
    }

    let active = true;
    
    // Set loading only if we do not already have it loaded to avoid quick blank snaps
    setImgState((prev) => {
      if (prev.img && prev.status === 'loaded') {
        return prev; // keep previous image while loading next to avoid white flicker
      }
      return { img: null, status: 'loading' };
    });

    preloadImageIntoCache(url, crossOrigin)
      .then((img) => {
        if (active) {
          setImgState({ img, status: 'loaded' });
        }
      })
      .catch(() => {
        if (active) {
          setImgState({ img: null, status: 'failed' });
        }
      });

    return () => {
      active = false;
    };
  }, [url, crossOrigin]);

  return [imgState.img, imgState.status] as const;
};

/**
 * Intercepta falhas de carregamento em elementos <img> que usam o proxy weserv.nl,
 * realizando fallback automático para a URL original do produto diretamente no navegador.
 * Como tags <img> padrão possuem comportamento passivo de CORS, o fallback para a URL
 * direta funciona na esmagadora maioria dos servidores, mesmo que barrem requisições de proxy/crawler.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl: string | null | undefined
) => {
  const imgObj = e.currentTarget;
  if (!imgObj) return;

  const trimmedOriginal = (originalUrl || '').trim();
  if (!trimmedOriginal) {
    imgObj.src = 'https://placehold.co/400x400?text=Sem+Imagem';
    return;
  }

  const currentStep = imgObj.getAttribute('data-fallback-step') || '0';

  if (currentStep === '0') {
    // Stage 1: Try our high-compatibility, CORS-unlocked client-side backend proxy
    imgObj.setAttribute('data-fallback-step', '1');
    imgObj.src = `/api/image-proxy?url=${encodeURIComponent(trimmedOriginal)}`;
  } else if (currentStep === '1') {
    // Stage 2: Try the raw original URL directly (no CORS) in case local proxy has issues
    imgObj.setAttribute('data-fallback-step', '2');
    imgObj.src = trimmedOriginal;
  } else {
    // Stage 3: Placeholder fallback
    imgObj.src = 'https://placehold.co/400x400?text=Sem+Imagem';
  }
};

