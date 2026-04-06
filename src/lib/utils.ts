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
 */
export const getProxyUrl = (url: string | undefined | null) => {
  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) {
    return url || '';
  }
  
  // Se já for uma URL do proxy, retorna como está
  if (url.includes('weserv.nl')) return url;
  
  // Domínios conhecidos que suportam CORS nativamente
  const corsFriendly = [
    'postimg.cc',
    'postimg.org',
    'postimg.me',
    'i.postimg.cc',
    'supabase.co',
    'cloudinary.com',
    'imgbb.com',
    'imgur.com',
    'picsum.photos',
    'placeholder.com'
  ];
  
  const isFriendly = corsFriendly.some(domain => url.toLowerCase().includes(domain));
  if (isFriendly) return url;
  
  // Para outros domínios (como img.smartprice.uk ou Cloudflare R2 sem CORS configurado),
  // usamos o proxy images.weserv.nl que adiciona os headers CORS necessários.
  // O weserv.nl aceita a URL com ou sem protocolo. Mantemos o protocolo para garantir https se presente.
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=${encodeURIComponent(url)}`;
};
