import { ProductsLegacyHashRedirect } from "@/components/ProductsLegacyHashRedirect";
import { ProductsSubNav } from "@/components/ProductsSubNav";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProductsLegacyHashRedirect />
      <ProductsSubNav />
      {children}
    </div>
  );
}
