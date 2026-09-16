'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { NavCategoryItem } from '@/lib/categories.server';

export interface CatalogueDropdownProps {
  categories: NavCategoryItem[];
}

export function CatalogueDropdown({ categories }: CatalogueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!categories || categories.length === 0) {
    return null;
  }

  const selectedCategory = categories.find((cat) => cat.id === activeTabId) || categories[0];

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 py-1 text-sm font-medium text-ink-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-field"
        aria-expanded={isOpen}
      >
        <span>Catalogue</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[520px] rounded-panel border border-line bg-surface p-4 shadow-elevated z-50 animate-fade-in">
          <div className="grid grid-cols-12 gap-4">
            {/* Top-Level Categories Sidebar */}
            <div className="col-span-5 border-r border-line pr-3 space-y-1">
              <span className="block px-2 py-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                Categories
              </span>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setActiveTabId(cat.id)}
                  onClick={() => setActiveTabId(cat.id)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-pill transition-colors flex items-center justify-between ${
                    selectedCategory.id === cat.id
                      ? 'bg-brand-soft text-brand font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-elevated'
                  }`}
                >
                  <span>{cat.name}</span>
                  <svg
                    className={`w-3.5 h-3.5 ${selectedCategory.id === cat.id ? 'opacity-100' : 'opacity-0'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Sub-Categories & Quick Links */}
            <div className="col-span-7 pl-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-line">
                  <span className="text-sm font-bold text-ink">
                    {selectedCategory.name}
                  </span>
                  <Link
                    href={`/c/${selectedCategory.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    View All {selectedCategory.name} →
                  </Link>
                </div>

                {selectedCategory.children && selectedCategory.children.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {selectedCategory.children.map((subCat) => (
                      <Link
                        key={subCat.id}
                        href={`/c/${selectedCategory.slug}/${subCat.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-between p-2 rounded-panel hover:bg-surface-elevated transition-colors"
                      >
                        <span className="text-sm text-ink-muted group-hover:text-ink group-hover:font-medium transition-colors">
                          {subCat.name}
                        </span>
                        <span className="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                          Explore
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-ink-muted">
                    Explore all products in {selectedCategory.name}
                  </div>
                )}
              </div>

              {/* Bottom Footer shortcut */}
              <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs">
                <span className="text-ink-muted">Handcrafted Jewellery</span>
                <Link
                  href="/search"
                  onClick={() => setIsOpen(false)}
                  className="font-medium text-brand hover:underline"
                >
                  Full Catalogue →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
