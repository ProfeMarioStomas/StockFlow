import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DeleteProductModal } from "../components/features/products/DeleteProductModal";
import { EditProductModal } from "../components/features/products/EditProductModal";
import { CreateProductModal } from "../components/features/products/CreateProductModal";
import { ProductImageModal } from "../components/features/products/ProductImageModal";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Pagination } from "../components/common/Pagination";
import { PageSpinner } from "../components/common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../components/common/Table";
import type { ProductResponse } from "../models/product.model";
import { productService } from "../services/product.service";

type ModalState =
  | { type: "create" }
  | { type: "edit"; product: ProductResponse }
  | { type: "delete"; product: ProductResponse }
  | { type: "image"; product: ProductResponse }
  | null;

const PAGE_SIZE = 20;

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", { page, showInactive }],
    queryFn: () => productService.listProducts(page, PAGE_SIZE, showInactive ? undefined : true),
  });

  if (isLoading) return <PageSpinner />;

  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Productos</h2>
            {meta && (
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                {meta.total} {meta.total === 1 ? "producto" : "productos"}
                {showInactive ? " (incluyendo inactivos)" : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              Mostrar inactivos
            </label>

            <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Agregar producto
            </Button>
          </div>
        </div>

        {/* Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Nombre</TableHeader>
                <TableHeader>Precio</TableHeader>
                <TableHeader>Stock</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Creado</TableHeader>
                <TableHeader className="text-right">Acciones</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableEmpty colSpan={6} message="No se encontraron productos." />
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      }).format(product.price)}
                    </TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "success" : "destructive"}>
                        {product.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.imageKey && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModal({ type: "image", product })}
                            aria-label={`Ver imagen de ${product.name}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "edit", product })}
                          aria-label={`Editar ${product.name}`}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "delete", product })}
                          aria-label={`Eliminar ${product.name}`}
                          className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>

        {/* Pagination */}
        {meta && <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />}
      </div>

      {/* Modals */}
      <CreateProductModal open={modal?.type === "create"} onClose={() => setModal(null)} />

      {modal?.type === "edit" && (
        <EditProductModal
          key={modal.product.id}
          product={modal.product}
          open
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteProductModal product={modal.product} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "image" && (
        <ProductImageModal
          key={modal.product.id}
          open
          onClose={() => setModal(null)}
          productName={modal.product.name}
          imageKey={modal.product.imageKey!}
        />
      )}
    </>
  );
}
