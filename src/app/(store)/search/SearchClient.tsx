'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Category, ProductImage, Product } from '@prisma/client';
import { ProductCard } from '@/components/store/ProductCard';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { filterProducts, SearchProduct } from '@/lib/search';

type ProductWithDetails = Product & {
  images: ProductImage[];
  category?: Category | null;
};

interface SearchClientProps {
  initialProducts: ProductWithDetails[];
  categories: Category[];
  shopName?: string;
}

export function SearchClient({ initialProducts, categories, shopName }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialSort = (searchParams.get('sort') as 'featured' | 'price-asc' | 'price-desc' | 'newest') || 'featured';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>(initialSort);

  function updateUrl(newQuery: string, newCat: string, newSort: string) {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (newCat && newCat !== 'all') params.set('category', newCat);
    if (newSort && newSort !== 'featured') params.set('sort', newSort);

    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    });
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    updateUrl(val, selectedCategory, sort);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelectedCategory(val);
    updateUrl(query, val, sort);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'newest';
    setSort(val);
    updateUrl(query, selectedCategory, val);
  }

  function handleClear() {
    setQuery('');
    setSelectedCategory('all');
    setSort('featured');
    updateUrl('', 'all', 'featured');
  }

  const filteredProducts = filterProducts(initialProducts as unknown as SearchProduct[], {
    query,
    categoryId: selectedCategory,
    sort,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h1 className="font-display text-4xl text-ink font-bold">Search Catalogue</h1>
        <p className="text-sm text-ink-muted">
          {shopName ? `${shopName} ke` : 'Dukaan ke'} saare designs, categories aur purities search karein
        </p>
      </div>

      {/* Search Input Bar & Controls */}
      <div className="bg-surface border border-line rounded-card p-4 md:p-6 shadow-sm space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink-muted">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <Input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by name, category, or purity (e.g., Choker, Jhumka, 22K)..."
            className="pl-11 pr-10 py-3 text-base w-full"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                updateUrl('', selectedCategory, sort);
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink-muted hover:text-ink"
              aria-label="Clear search text"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-2 border-t border-line">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="text-sm py-2 px-3 min-w-[160px]"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              value={sort}
              onChange={handleSortChange}
              className="text-sm py-2 px-3 min-w-[160px]"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </Select>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            <span className="text-xs text-ink-muted">
              Found <strong className="text-ink numeric">{filteredProducts.length}</strong> designs
            </span>
            {(query || selectedCategory !== 'all' || sort !== 'featured') && (
              <Button type="button" intent="quiet" size="md" onClick={handleClear}>
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product as unknown as ProductWithDetails} />
          ))}
        </div>
      ) : (
        <EmptyState title="Koi Design Nahi Mila">
          <p className="mb-4">
            {query
              ? `"${query}" se milta julta koi design catalogue me nahi hai. Spelling check karein ya filters reset karein.`
              : 'Selected filters ke saath koi design matching nahi hai.'}
          </p>
          <Button type="button" intent="secondary" size="md" onClick={handleClear}>
            Clear Search & Filters
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
