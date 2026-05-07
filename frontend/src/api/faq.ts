import api from './client';

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  order: number;
  updated_at: string;
}

export async function getFAQItems(): Promise<FAQItem[]> {
  const response = await api.get<FAQItem[]>('/faq');
  return response.data;
}
