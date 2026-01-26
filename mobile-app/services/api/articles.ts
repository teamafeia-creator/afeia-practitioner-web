/**
 * Articles API Service
 */

import apiClient from './client';
import type { Article, ArticleCategory, PaginatedResponse } from '@/types';

export const articlesApi = {
  /**
   * Get articles, optionally filtered by category
   */
  async getAll(
    category?: ArticleCategory,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Article>> {
    const response = await apiClient.get<PaginatedResponse<Article>>('/articles', {
      params: { category, page, limit },
    });
    return response.data;
  },

  /**
   * Get article by ID
   */
  async getById(articleId: string): Promise<Article> {
    const response = await apiClient.get<{ article: Article }>(`/articles/${articleId}`);
    return response.data.article;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(articleId: string): Promise<{ isFavorite: boolean }> {
    const response = await apiClient.post<{ isFavorite: boolean }>(
      `/articles/${articleId}/favorite`
    );
    return response.data;
  },

  /**
   * Get favorite articles
   */
  async getFavorites(): Promise<Article[]> {
    const response = await apiClient.get<{ articles: Article[] }>('/articles/favorites');
    return response.data.articles;
  },

  /**
   * Get recommended articles (based on patient's pathology)
   */
  async getRecommended(): Promise<Article[]> {
    const response = await apiClient.get<{ articles: Article[] }>('/articles/recommended');
    return response.data.articles;
  },
};
