import { ProductsCatalogAccessGuard } from "@/components/ProductsCatalogAccessGuard";
import { ProductsLegacyHashRedirect } from "@/components/ProductsLegacyHashRedirect";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProductsLegacyHashRedirect />
      <ProductsCatalogAccessGuard>{children}</ProductsCatalogAccessGuard>
    </div>
  );
}
