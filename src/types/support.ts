export interface SupportSourceReference {
  documentTitle: string;
  sectionTitle: string;
  excerpt: string;
}

export interface SupportAskRequest {
  question: string;
}

export interface SupportAskResponse {
  answer: string;
  sources: SupportSourceReference[];
}
