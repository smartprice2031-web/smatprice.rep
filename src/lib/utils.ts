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
  
  // Se já for uma URL do proxy weserv, extraímos a URL original para remontar com novos parâmetros
  let originalUrl = url;
  if (url.includes('weserv.nl')) {
    try {
      const urlObj = new URL(url);
      originalUrl = urlObj.searchParams.get('url') || url;
    } catch (e) {
      // Ignora erro
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

  params.append('url', formattedUrl);
  params.append('default', formattedUrl);
  
  if (options?.thumbnail) {
    params.append('w', '200');
    params.append('q', '75');
    params.append('output', 'webp');
  } else if (options?.optimize) {
    params.append('w', String(options.width || 800));
    params.append('q', String(options.quality || 85));
    params.append('output', options.output || 'webp');
  } else {
    if (options?.width) params.append('w', String(options.width));
    if (options?.quality) params.append('q', String(options.quality));
    if (options?.output) params.append('output', options.output);
  }
  
  // URLSearchParams encodes spaces as "+" in the query string, which can break CDNs that only understand "%20".
  // Replacing "+" with "%20" ensures perfect compatibility across all image hosting providers.
  const queryString = params.toString().replace(/\+/g, '%20');
  
  return `https://images.weserv.nl/?${queryString}`;
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

  // Se já tentamos carregar a original ou não existe original válida, mostramos um placeholder limpo
  if (imgObj.getAttribute('data-tried-original') === 'true') {
    imgObj.src = 'https://placehold.co/200x200?text=Sem+Imagem';
    return;
  }

  imgObj.setAttribute('data-tried-original', 'true');

  if (imgObj.src.includes('weserv.nl') && originalUrl && originalUrl.trim()) {
    // Remove proxy e tenta carregar a URL original sem restrição de CORS passiva do navegador
    imgObj.src = originalUrl.trim();
  } else {
    imgObj.src = 'https://placehold.co/200x200?text=Sem+Imagem';
  }
};

