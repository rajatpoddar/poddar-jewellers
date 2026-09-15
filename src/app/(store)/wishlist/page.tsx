import { getAllLiveProducts } from '@/lib/store.server';
import { getShop } from '@/lib/shop';
import { WishlistClient } from './WishlistClient';

export async function generateMetadata() {
  const shop = await getShop();
  return {
    title: `My Wishlist | ${shop.name}`,
    description: `View your saved favorite jewellery designs from ${shop.name}.`,
  };
}

export default async function WishlistPage() {
  const products = await getAllLiveProducts();
  return <WishlistClient allProducts={products} />;
}
