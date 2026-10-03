export type ContentBlockType = "paragraph" | "heading" | "image";

export interface NewsContentBlock {
  type: ContentBlockType;
  text?: string;
  url?: string;
  caption?: string;
}

export interface NewsSummary {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl?: string | null;
  author?: string | null;
  publishedAt: string;
}

export interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  content: NewsContentBlock[];
  thumbnailUrl?: string | null;
  sourceUrl?: string | null;
  author?: string | null;
  publishedAt: string;
}

