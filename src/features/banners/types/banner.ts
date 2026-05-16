export type BannerDisplayType = 'inline' | 'modal' | 'full_width' | 'fixed';
export type BannerPageKey = 'home' | 'products' | 'categories' | 'cart' | 'checkout' | 'payment' | 'order_confirmed' | 'profile' | 'notifications' | 'support';
export type BannerPlacementKey = 'home_top' | 'below_categories' | 'below_promos' | 'below_bestsellers' | 'below_buy_again' | 'below_featured' | 'products_top' | 'categories_top' | 'cart_top' | 'checkout_top';

export interface BannerSegmentRules {
  audience: 'all' | 'authenticated' | 'new' | 'returning' | 'inactive';
  inactive_days?: number;
  min_total_spent?: number;
  cities?: string[];
  neighborhoods?: string[];
  purchased_product_ids?: string[];
  purchased_category_ids?: string[];
}

export interface Banner {
  id: string;
  loja_id: string;
  titulo: string;
  subtitulo?: string | null;
  cta_text?: string | null;
  imagem_url: string;
  imagem_path?: string | null;
  display_type: BannerDisplayType;
  page_key: BannerPageKey;
  placement_key: BannerPlacementKey;
  action_type: 'product_collection';
  background_color: string;
  ativo: boolean;
  prioridade: number;
  inicia_em?: string | null;
  expira_em?: string | null;
  segment_rules: BannerSegmentRules;
  produto_loja_ids: string[];
  criado_em: string;
  atualizado_em: string;
}

export interface BannerPayload {
  titulo: string;
  subtitulo?: string | null;
  cta_text?: string | null;
  imagem_url: string;
  imagem_path?: string | null;
  display_type: BannerDisplayType;
  page_key: BannerPageKey;
  placement_key: BannerPlacementKey;
  action_type: 'product_collection';
  background_color: string;
  ativo: boolean;
  prioridade: number;
  inicia_em?: string | null;
  expira_em?: string | null;
  segment_rules: BannerSegmentRules;
  produto_loja_ids: string[];
}
