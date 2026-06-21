import { useEffect, useRef, useState } from "react";
import { productsService } from "../services/productsService";
import type { Product } from "../types/product";

const PER_PAGE = 20;

export function useProducts() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const requestId = useRef(0);

  const fetchCategories = async (options: { forceRefresh?: boolean } = {}) => {
    try {
      const data = await productsService.getActiveCategories(options);
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async (options: { forceRefresh?: boolean } = {}) => {
    const currentRequestId = ++requestId.current;
    try {
      setLoading(true);
      const result = await productsService.getStoreProductsPage(
        {
          search: debouncedSearch,
          categoryId: categoryFilter === "Todas" ? undefined : categoryFilter,
          active:
            statusFilter === "Ativo"
              ? true
              : statusFilter === "Inativo"
                ? false
                : undefined,
          page,
          perPage: PER_PAGE,
        },
        options,
      );
      if (currentRequestId !== requestId.current) return;

      const availablePages = Math.max(1, result.totalPages);
      if (page > availablePages) {
        setPage(availablePages);
        return;
      }

      setProducts(result.products);
      setTotal(result.total);
      setTotalPages(availablePages);
    } catch (error) {
      if (currentRequestId === requestId.current) {
        console.error("Error fetching products:", error);
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, debouncedSearch, page, statusFilter]);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const changeStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const toggleHighlight = async (id: string, currentStatus: boolean) => {
    try {
      await productsService.toggleHighlight(id, !currentStatus);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === id ? { ...product, destaque: !currentStatus } : product,
        ),
      );
    } catch (error) {
      console.error("Error updating highlight", error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await productsService.toggleStatus(id, !currentStatus);
      await fetchProducts({ forceRefresh: true });
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  return {
    categories,
    categoryFilter,
    fetchCategories,
    fetchProducts,
    filteredProducts: products,
    loading,
    page,
    perPage: PER_PAGE,
    products,
    search,
    setCategoryFilter: changeCategoryFilter,
    setPage,
    setSearch: changeSearch,
    setStatusFilter: changeStatusFilter,
    statusFilter,
    total,
    totalPages,
    toggleHighlight,
    toggleStatus,
  };
}
