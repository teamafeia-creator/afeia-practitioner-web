import { apiClient } from './client';
import type { APIResponse, Article, PaginatedResponse } from '../../types';

// Service Articles API

export const articlesService = {
  // Récupérer tous les articles
  async getAll(category?: string, page: number = 1, pageSize: number = 20): Promise<APIResponse<PaginatedResponse<Article>>> {
    try {
      console.log('✅ API Call: getArticles', { category, page, pageSize });
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const { data } = await apiClient.get(`/articles?${params.toString()}`);
      return data;
    } catch (error: any) {
      console.error('❌ getArticles Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer un article par ID
  async getById(id: string): Promise<APIResponse<Article>> {
    try {
      console.log('✅ API Call: getArticle', { id });
      const { data } = await apiClient.get(`/articles/${id}`);
      return data;
    } catch (error: any) {
      console.error('❌ getArticle Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Ajouter aux favoris
  async addToFavorites(id: string): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: addArticleToFavorites', { id });
      const { data } = await apiClient.post(`/articles/${id}/favorite`);
      return data;
    } catch (error: any) {
      console.error('❌ addArticleToFavorites Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Retirer des favoris
  async removeFromFavorites(id: string): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: removeArticleFromFavorites', { id });
      const { data } = await apiClient.delete(`/articles/${id}/favorite`);
      return data;
    } catch (error: any) {
      console.error('❌ removeArticleFromFavorites Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les favoris
  async getFavorites(): Promise<APIResponse<Article[]>> {
    try {
      console.log('✅ API Call: getFavoriteArticles');
      const { data } = await apiClient.get('/articles/favorites');
      return data;
    } catch (error: any) {
      console.error('❌ getFavoriteArticles Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Articles recommandés (basés sur pathologies)
  async getRecommended(): Promise<APIResponse<Article[]>> {
    try {
      console.log('✅ API Call: getRecommendedArticles');
      const { data } = await apiClient.get('/articles/recommended');
      return data;
    } catch (error: any) {
      console.error('❌ getRecommendedArticles Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default articlesService;
