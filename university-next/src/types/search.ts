export interface WpxFtSearchItem {
  title: string;
  url: string;
  excerpt?: string;
  thumb?: string;
}

export interface WpxFtSearchResponse {
  items?: WpxFtSearchItem[];
}

export interface LiveSearchItem {
  title: string;
  url: string;
  excerpt: string;
  thumb: string;
}
